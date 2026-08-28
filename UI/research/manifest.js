/* ============================================================
   research/manifest.js — data model + crawl for the Robotics reader.
   Mirrors the Writing subsite layout (manifest = data + data logic),
   keeping the controller (app.js) and the pane (reader.js) clean.

   Exposes window.SECTIONS and window.RData with the helpers the
   controller/reader need. No DOM, no rendering here.
   ============================================================ */

// Two top-level sections. `fmt` turns a raw dir key into a display label
// (works for both 20260824 and 2026-08 naming, since crawled dirs may use
// either form — see page-standard note on directory naming).
window.SECTIONS = {
  weekly:  { name: "周刊精粹", tag: "周刊", fmt: (k) => k.replace(/^(\d{4})-?(\d{2})-?(\d{2})$/, "$1-$2-$3") },
  monthly: { name: "月刊深析", tag: "月刊", fmt: (k) => k.replace(/^(\d{4})-?(\d{2})$/, "$1-$2") },
};

// Tiny HTML escaper (framework also provides window.wEsc; we keep a local
// one so this module is self-contained for plain strings).
function R_esc(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

// Fetch text with a tiny in-memory cache so re-selecting an entry is instant.
const _rcache = new Map();
async function getText(url) {
  if (_rcache.has(url)) return _rcache.get(url);
  const t = await (await fetch(url, { cache: "no-store" })).text();
  _rcache.set(url, t);
  return t;
}

// Parse a static-server directory listing (Python http.server returns an
// HTML page of <a href="..."> links).
function parseListing(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, "text/html");
  return Array.from(doc.querySelectorAll("a")).map((a) => {
    let h = decodeURIComponent(a.getAttribute("href") || "").replace(/\/$/, "");
    return h;
  }).filter((n) => n && n !== "." && n !== ".." && !n.includes("/"));
}

// Extract the <!-- meta: 标题=…; 来源=… --> comment from a markdown file.
function parseMeta(md) {
  const m = String(md).match(/<!--\s*meta:\s*([\s\S]*?)\s*-->/);
  if (!m) return null;
  const o = {};
  m[1].split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i < 0) return;
    const k = p.slice(0, i).trim(), v = p.slice(i + 1).trim();
    if (k) o[k] = v;
  });
  return o;
}

async function metaOf(path) {
  try { return parseMeta(await getText(path)); }
  catch (e) { return null; }
}

// Split a date directory's file list into the roles we care about.
// Both sections now follow the same shape for symmetry:
//   overview  → weekly_overview.md  | monthly_overview.md
//   pieces    → NN_*.md  (each paper; meta 标题 becomes the nav label)
//   refs      → _refs.txt  (monthly 旁征博引)
// deep_dive.md is kept only as a legacy fallback for older monthly dirs.
function categorize(files) {
  const o = { overview: null, main: null, refs: null, pieces: [], pdfs: [] };
  for (const f of files) {
    const low = f.toLowerCase();
    if (low.endsWith(".pdf")) o.pdfs.push(f);
    else if (low === "weekly_overview.md" || low === "monthly_overview.md") o.overview = f;
    else if (low === "deep_dive.md") o.main = f;
    else if (low === "_refs.txt") o.refs = f;
    else { const pm = f.match(/^(\d+)_.*\.md$/i); if (pm) o.pieces.push({ name: f, num: +pm[1] }); }
  }
  o.pieces.sort((a, b) => a.num - b.num);
  return o;
}

function pieceLabel(name) {
  const m = name.match(/^(\d+)_(.*)\.md$/i);
  if (!m) return name;
  return m[1] + " " + m[2].replace(/_/g, " ");
}

// Associate an article with its PDF. Papers are named by arXiv id
// (e.g. 2607.07452.pdf) and the meta 来源 carries arXiv:2607.07452, so we
// match on the id. Falls back to scanning the filename.
function matchPdf(name, meta, pdfs, base) {
  let id = null;
  if (meta && meta["来源"]) { const m = meta["来源"].match(/(\d{4}\.\d{4,5})/); if (m) id = m[1]; }
  if (!id && name) { const m = String(name).match(/(\d{4}\.\d{4,5})/); if (m) id = m[1]; }
  if (id) {
    for (const p of pdfs) {
      if (p.replace(/\.pdf$/i, "") === id) return base + p;
    }
  }
  return null;
}

// First "real" heading for a fallback title (skips structural "一 概览" etc.).
function firstHeading(t) {
  const struct = /^[一二三四五六七八九十]+[、\s]/;
  let firstAny = null;
  for (const ln of String(t).split("\n")) {
    const m = ln.match(/^#\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    const txt = m[1].trim();
    if (!firstAny) firstAny = txt;
    if (struct.test(txt)) continue;
    if (/^(概览|总览|深析|简评)$/.test(txt)) continue;
    return txt;
  }
  return firstAny || "";
}

// Build the left-nav tree used by <standard-nav>. Both sections follow the
// SAME shape (symmetry): a top-level group, one sub-group per date, and leaves
// for [总览, each paper piece, 旁征博引]. Each leaf's `data` carries everything
// the reader needs, including the resolved `pdf` path (or null).
async function crawlResearch() {
  const root = "/";
  const top = parseListing(await (await fetch(root)).text());
  const tree = [];
  for (const sec of ["weekly", "monthly"]) {
    if (!top.includes(sec)) continue;
    const dirs = parseListing(await (await fetch(root + sec + "/")).text())
      .filter((n) => /^(\d{4})-?(\d{2})(?:-?(\d{2}))?$/.test(n))
      .sort((a, b) => a.replace(/-/g, "").localeCompare(b.replace(/-/g, "")));
    const group = { label: SECTIONS[sec].name, open: 1, children: [] };
    for (const d of dirs) {
      const base = root + sec + "/" + d + "/";
      const files = parseListing(await (await fetch(base)).text());
      const cat = categorize(files);
      const leaves = [];
      // 总览 (overview) — weekly_overview.md or monthly_overview.md; if neither
      // exists but a legacy deep_dive.md does, treat that as the overview.
      const ovFile = cat.overview || cat.main;
      if (ovFile) {
        const meta = await metaOf(base + ovFile);
        leaves.push({
          label: "总览",
          data: { sec, kind: "overview", base, file: ovFile, pdf: null, meta },
        });
      }
      // 各篇 (pieces) — NN_*.md; meta 标题 becomes the nav label.
      for (const p of cat.pieces) {
        const meta = await metaOf(base + p.name);
        const pdf = matchPdf(p.name, meta, cat.pdfs, base);
        leaves.push({
          label: meta && meta["标题"] ? meta["标题"] : pieceLabel(p.name),
          badge: pdf ? "PDF" : null,
          data: { sec, kind: "piece", base, file: p.name, pdf, meta },
        });
      }
      // 旁征博引 (refs) — monthly only.
      if (cat.refs) {
        leaves.push({
          label: "旁征博引",
          data: { sec, kind: "refs", base, file: cat.refs, pdf: null, meta: null },
        });
      }
      if (leaves.length) {
        group.children.push({ label: SECTIONS[sec].fmt(d), open: 0, children: leaves });
      }
    }
    if (group.children.length) tree.push(group);
  }
  return tree;
}

window.RData = {
  SECTIONS,
  R_esc,
  getText,
  parseListing,
  parseMeta,
  metaOf,
  categorize,
  pieceLabel,
  matchPdf,
  firstHeading,
  crawlResearch,
};
