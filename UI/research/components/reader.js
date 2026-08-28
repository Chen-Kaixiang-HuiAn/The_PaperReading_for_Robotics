/* ============================================================
   research/components/reader.js — <research-reader>
   The right-hand reading pane. Renders an article fetched at
   runtime from its .md file (the manifest only carries metadata
   + the file path). Features:

     • Markdown → HTML (headings / tables / code / lists / quotes /
       images / links / inline+block math via KaTeX, degrades to raw
       LaTeX text when KaTeX is unavailable).
     • Meta attribution bar (来源 / 团队 / 子方向 + 本刊自动精析 badge),
       parsed from the `<!-- meta: ... -->` comment.
     • A sticky right-hand TOC (quick-nav). It lives inside the pane's
       own scroll container, so clicking an entry scrolls the article
       without ever moving the page (no "whole page lifts up").
   • Dual-column comparison mode: the rendered markdown, the source PDF
     (rendered inline via PDF.js — no auto-download, no iframe), and the
     TOC all live side by side INSIDE the reader as nav | md | pdf | toc.

   Math handling note (important): formulas are extracted from the
   Markdown as RAW TeX, carried through the pipeline as opaque
   placeholders, and only injected into the live DOM as TEXT NODES
   (via textContent — which never goes through the HTML parser). This
   keeps every TeX symbol (`<`, `>`, `&`, `|`, `#`, `%`, `~`, `_`, `^`,
   `\`) byte-exact; we never risk the HTML parser eating a literal `<`
   in `$x < y$` as a tag opener. KaTeX then renders from the text.
   ============================================================ */

const escR = window.wEsc;

/* ---------- Markdown → HTML (tuned for the paper-digest format) ----------
   Returns { html, maths }. `maths` is the single shared array of raw TeX
   snippets (block + inline) indexed by the @@M{n}@@ placeholders left in
   the HTML. Math is deliberately NOT HTML-escaped here. */
// Render a raw TeX snippet to a KaTeX HTML string (already valid HTML, so it
// can be injected straight into the final innerHTML). On failure we fall back
// to a muted literal `$...$` rather than alarming raw text. Symbols in `tex`
// are interpreted by KaTeX as TeX — they never pass through the HTML parser,
// so `<`, `>`, `&`, `|`, `#`, `%`, `~`, `_`, `^`, `\` are all byte-exact.
function renderMath(tex, display) {
  if (window.katex) {
    try {
      return window.katex.renderToString(tex, { displayMode: display, throwOnError: false });
    } catch (e) { /* fall through to literal */ }
  }
  const lit = (display ? "$$" : "$") + tex + (display ? "$$" : "$");
  return '<span class="katex-error">' + escR(lit) + "</span>";
}

// Inline markdown → HTML. Math is rendered to KaTeX HTML at THIS string stage
// (not post-injection), so each formula enters the final innerHTML as
// already-valid KaTeX markup. This removes the old fragile two-pass
// placeholder → text-node → re-scan dance, which is what produced the
// recurring "double-display / not-rendering / jank" symptoms.
function inlineR(raw) {
  if (!raw) return "";
  const maths = [];
  const codes = [];
  let s = raw;
  // 1) Extract math FIRST (raw TeX, never HTML-escaped) into opaque placeholders.
  //    Block $$...$$ is tried before inline so it isn't eaten in half. Inline
  //    uses NO "not preceded by word char" guard: in academic digests formulas
  //    legitimately follow identifiers (TV$(\sigma)$) or sit adjacent to other
  //    formulas, and such a guard would leave a dangling $ unrendered.
  s = s.replace(/\$\$([\s\S]+?)\$\$/g, (m, c) => { maths.push({ b: true, t: c }); return "@@M" + (maths.length - 1) + "@@"; });
  s = s.replace(/\$([^\$\n]+?)\$/g, (m, c) => { maths.push({ b: false, t: c }); return "@@M" + (maths.length - 1) + "@@"; });
  // 2) Park code spans into placeholders BEFORE emphasis runs. A '*' or '_'
  //    inside a code span (e.g. `RRT*` inside an italic citation title) must
  //    NEVER be mistaken for an emphasis delimiter — if code were left inline,
  //    the inner '*' would close the outer italic and shred the markup.
  s = s.replace(/`([^`]+)`/g, (m, c) => { codes.push(c); return "@@C" + (codes.length - 1) + "@@"; });
  // 3) Escape the remaining prose only (placeholders contain no special chars).
  s = escR(s);
  // 4) Protect escaped prose delimiters (\*, \_, \\) so emphasis won't eat them.
  s = s.replace(/\\\*/g, "@@EA@@").replace(/\\_/g, "@@EB@@").replace(/\\\\/g, "@@EC@@");
  // 5) Inline markup (images / links / emphasis). Code is parked, so a '*' in
  //    `RRT*` can't interfere with the surrounding italic.
  s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m, a, u) => '<em class="imgref">[图: ' + a + ']</em>');
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, t, u) => '<a href="' + u + '" target="_blank" rel="noopener">' + t + "</a>");
  // Emphasis. Allow an internal literal '*' / '_' inside the content — a term
  // like RRT* wrapped in **bold** must not break the span. The old [^*]*? rule
  // forbade any '*' in the content, so **RRT* 收敛到最优** fell through and
  // showed raw "**...**" garbage. We now match minimally over any char and add
  // a negative lookahead so a closing ** is not immediately followed by another
  // '*' (which would mean that star belongs to the term, not the delimiter).
  // The (^|[^*]) / (^|[^_]) guards keep a lone '*' from being eaten by italic
  // when it is actually a term-star (RRT*) or part of a '**' pair.
  s = s.replace(/\*\*([\s\S]+?)\*\*(?!\*)/g, "<strong>$1</strong>");
  s = s.replace(/__([\s\S]+?)__(?!_)/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^\s*][\s\S]*?)\*(?!\*)/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^\s_][\s\S]*?)_(?!_)/g, "$1<em>$2</em>");
  // 5) Unprotect prose delimiters back to literal chars.
  s = s.replace(/@@EA@@/g, "*").replace(/@@EB@@/g, "_").replace(/@@EC@@/g, "\\");
  // 6) Restore code spans (escape content so '<' inside never parses as a tag).
  if (codes.length) s = s.replace(/@@C(\d+)@@/g, (m, i) => "<code>" + escR(codes[+i]) + "</code>");
  // 7) Inject math: replace placeholders with KaTeX HTML (or muted literal).
  if (maths.length) {
    s = s.replace(/@@M(\d+)@@/g, (m, i) => {
      const m0 = maths[+i];
      return renderMath(m0.t, m0.b);
    });
  }
  return s;
}
function splitRowR(line) {
  // Split on UNESCAPED pipes only — a `\|` inside a cell is a literal pipe
  // (e.g. a formula like $O(\|V\|\log\|V\|)$ must stay in ONE cell, not be
  // shredded into three columns by its escaped pipes). Then un-escape \| → |.
  return line.trim().replace(/^\|/, "").replace(/\|$/, "")
    .split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, "|"));
}
function renderTableR(header, rows) {
  let h = '<table><thead><tr>' + header.map((c) => "<th>" + inlineR(c) + "</th>").join("") + "</tr></thead><tbody>";
  for (const r of rows) h += "<tr>" + r.map((c) => "<td>" + inlineR(c) + "</td>").join("") + "</tr>";
  return h + "</tbody></table>";
}
// Recursive block parser: turns an array of markdown LINES into HTML.
// Used both at the top level and for blockquote inner content, so that
// lists / headings / nested quotes / line breaks inside a `> ` quote are
// preserved (previously a quote collapsed all its lines into one run-on
// paragraph, which destroyed `> - item` lists and inner line breaks).
  // Detect a Markdown list item, returning its indentation (number of leading
  // spaces), whether it is ordered, and the text with the marker stripped. This
  // lets the nested-list builder treat "  - sub" / "    - sub" / "  1. sub" as
  // children of their (less-indented) parent, instead of flattening every level
  // into one flat <ul> (the old "only level-1 '-' is recognized" bug).
  function listItemR(line) {
    const m = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (!m) return null;
    return { indent: m[1].length, ordered: /\d+\./.test(m[2]), text: m[3] };
  }
  // Build nested <ul>/<ol> from a flat list of list-item records, using their
  // indentation as the nesting signal. Consecutive items at the same indent and
  // same ordered-ness form one list; deeper-indented items become children of
  // the most recent shallower item.
  function buildListR(items) {
    let i = 0;
    function build(minIndent) {
      let out = "";
      while (i < items.length && items[i].indent >= minIndent) {
        const level = items[i].indent;
        const ordered = items[i].ordered;
        const tag = ordered ? "ol" : "ul";
        let inner = "";
        while (i < items.length && items[i].indent === level && items[i].ordered === ordered) {
          let li = inlineR(items[i].text);
          i++;
          if (i < items.length && items[i].indent > level) li += build(items[i].indent);
          inner += "<li>" + li + "</li>";
        }
        out += "<" + tag + ">" + inner + "</" + tag + ">";
      }
      return out;
    }
    return build(0);
  }
  function parseBlocks(lines, codeBlocks) {
    const isBlank = (l) => /^\s*$/.test(l);
    const isSep = (l) => /^\s*\|?[\s:|-]*-[\s:|-]*\|?\s*$/.test(l) && l.includes("-");
    const out = [];
    let k = 0;
    while (k < lines.length) {
      const line = lines[k];
      const cm = line.match(/^@@C(\d+)@@$/);
      if (cm) { const b = codeBlocks[+cm[1]]; out.push('<pre class="code"><code>' + escR(b.code) + "</code></pre>"); k++; continue; }
      if (isBlank(line)) { k++; continue; }
      const hm = line.match(/^(#{1,6})\s+(.*)$/);
      if (hm) { const lvl = hm[1].length; out.push("<h" + lvl + ">" + inlineR(hm[2]) + "</h" + lvl + ">"); k++; continue; }
      if (/^(\-{3,}|\*{3,})$/.test(line.trim())) { out.push("<hr>"); k++; continue; }
      if (line.includes("|") && k + 1 < lines.length && isSep(lines[k + 1])) {
        const header = splitRowR(line); k += 2;
        const rows = [];
        while (k < lines.length && lines[k].includes("|") && lines[k].trim()) { rows.push(splitRowR(lines[k])); k++; }
        out.push(renderTableR(header, rows));
        continue;
      }
      if (/^>\s?/.test(line)) {
        // Collect the whole quoted block, strip the leading '> ' from each
        // line (a lone '>' becomes a blank line → paragraph break), then
        // re-parse the inner content so lists/headings/line-breaks survive.
        const inner = [];
        while (k < lines.length && /^>\s?/.test(lines[k])) {
          inner.push(lines[k].replace(/^>\s?/, ""));
          k++;
        }
        out.push("<blockquote>" + parseBlocks(inner, codeBlocks) + "</blockquote>");
        continue;
      }
      if (listItemR(line)) {
        // Gather the whole list block (consecutive list items, plus any
        // indented continuation lines that belong to the previous item), then
        // build properly nested <ul>/<ol> from their indentation.
        const items = [];
        while (k < lines.length) {
          const it = listItemR(lines[k]);
          if (it) { items.push(it); k++; continue; }
          if (!isBlank(lines[k]) && /^\s+\S/.test(lines[k]) && items.length) {
            const prevIndent = items[items.length - 1].indent;
            if (lines[k].search(/\S/) > prevIndent) { items[items.length - 1].text += " " + lines[k].trim(); k++; continue; }
          }
          break;
        }
        out.push(buildListR(items));
        continue;
      }
      const buf = [line]; k++;
      while (k < lines.length && lines[k].trim() &&
             !/^(#{1,6}\s|>\s?|[-*+]\s+|\s+[-*+]\s+|\d+\.\s+|\s+\d+\.\s+|\-{3,}|\*{3,})/.test(lines[k]) &&
             !(lines[k].includes("|") && k + 1 < lines.length && isSep(lines[k + 1]))) {
        buf.push(lines[k]); k++;
      }
      out.push("<p>" + inlineR(buf.join(" ")) + "</p>");
    }
    return out.join("\n");
  }

  function mdToHtmlR(md) {
    if (!md) return "";
    // Strip HTML comments first (the <!-- meta: ... --> header must never
    // render as visible text in the article body). Math is rendered to KaTeX
    // HTML inside inlineR, so the returned string is already display-ready.
    const lines = md.replace(/<!--[\s\S]*?-->/g, "").replace(/\r\n/g, "\n").split("\n");
    const codeBlocks = [];
    const processed = [];
    let inCode = false, codeBuf = [], codeLang = "";
    for (const line of lines) {
      if (/^```/.test(line)) {
        if (!inCode) { inCode = true; codeLang = line.slice(3).trim(); codeBuf = []; }
        else { inCode = false; codeBlocks.push({ lang: codeLang, code: codeBuf.join("\n") }); processed.push("@@C" + (codeBlocks.length - 1) + "@@"); }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      processed.push(line);
    }
    return parseBlocks(processed, codeBlocks);
  }
function metaBarHTML(meta) {
  if (!meta) return "";
  const order = [["来源", "来源"], ["团队", "团队"], ["子方向", "子方向"], ["关联", "关联"]];
  let h = '<div class="attrib">';
  for (const [k, disp] of order) {
    if (meta[k]) h += '<span class="a-item"><span class="a-k">' + disp + "：</span><span class=\"a-v\">" + escR(meta[k]) + "</span></span>";
  }
  if (meta["评分"]) h += '<span class="pill">' + escR(meta["评分"]) + "</span>";
  h += "</div>";
  return h;
}

/* ---------- Math is rendered to HTML at the string level (see renderMath /
   inlineR above) — there is no post-injection DOM walk and no placeholder
   round-trip. KaTeX's CSS lives inside the shadow root (see connectedCallback)
   so the .katex-mathml MathML source is clipped/hidden and never shows as a
   second "raw" formula next to the rendered one. ---------- */

class ResearchReader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this.mode = "single";          // "single" | "dual"
    this._tocUserOpen = true;      // user's preferred TOC state
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${window.SHARED_CSS}</style>
      <!-- KaTeX CSS MUST live INSIDE the shadow root: shadow DOM does not
           inherit <link>/<style> from the main document head, so without this
           the .katex-mathml (MathML source) is not clipped/hidden and shows
           up as a second "raw" formula next to the rendered one. -->
      <link rel="stylesheet" href="UI/research/vendor/katex/katex.min.css?v=20260828p" />
      <style>
        :host{display:flex;flex-direction:column;flex:1;min-height:0;background:var(--bg);}
        .rbar{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;
          padding:12px 20px;border-bottom:1px solid var(--border);background:var(--panel);}
        .rbar-ttl{font-weight:600;font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .rbar-ctrls{display:flex;gap:8px;flex:none;}
        .rbtn{appearance:none;border:1px solid var(--border);background:var(--panel2);color:var(--muted);
          font-size:13px;font-weight:600;padding:7px 14px;border-radius:8px;cursor:pointer;transition:.15s;}
        .rbtn:hover{color:var(--text);background:var(--hover);}
        .rbtn.primary{background-image:var(--accent-grad);color:var(--on-accent);border-color:transparent;}
        .rbtn:disabled{opacity:.5;cursor:not-allowed;}
        .rbtn:disabled:hover{background:var(--panel2);color:var(--muted);}
        .rbody{flex:1;display:flex;min-height:0;}
        /* left: article — the ONLY scroll container in this pane */
        .doc{display:block;flex:1;min-width:0;overflow:auto;}
        /* right: TOC quick-nav (its OWN scroll, never moves the page) */
        .toc{width:260px;flex:none;border-left:1px solid var(--border);background:var(--panel);
          display:flex;flex-direction:column;min-height:0;}
        .toc-head{padding:12px 16px;font-size:12px;font-weight:700;color:var(--muted);
          letter-spacing:.5px;border-bottom:1px solid var(--border);flex:none;}
        .toc-list{padding:8px 8px 24px;overflow:auto;}
        .toc-item{display:block;width:100%;text-align:left;border:none;background:none;color:var(--text);
          font-size:13px;padding:6px 12px;border-radius:7px;cursor:pointer;white-space:nowrap;
          overflow:hidden;text-overflow:ellipsis;}
        .toc-item:hover{background:var(--hover);}
        .toc-item.lvl3{padding-left:26px;color:var(--muted);font-size:12.5px;}
        .toc-item.on{color:var(--accent);font-weight:600;}
        /* PDF pane sits BETWEEN the article and the TOC (doc | pdf | toc). */
        .pdfpane{flex:1;display:flex;flex-direction:column;min-width:0;border-left:1px solid var(--border);background:#525659;}
        .pdfpane[hidden]{display:none !important;}
        .pdf-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;
          padding:8px 14px;background:#3c4044;color:#e8eaed;font-size:13px;}
        .pdf-acts{display:flex;gap:6px;}
        .pdf-head .rbtn{background:#525659;color:#e8eaed;border-color:#5f6368;padding:5px 12px;font-size:12px;}
        .pdf-head .rbtn:hover{background:#5f6368;color:#fff;}
        .pdf-canvas-wrap{flex:1;overflow:auto;background:#fff;padding:8px;}
        .pdf-page{display:block;margin:0 auto 10px;width:100%;height:auto;box-shadow:0 1px 5px rgba(0,0,0,.35);}
        .pdf-msg{padding:40px 18px;color:#444;text-align:center;font-size:13px;line-height:1.7;}
        .pdf-msg.pdf-err{color:#c0392b;}
        /* dual mode: keep TOC visible so nav | md | pdf | toc all coexist */
        .rbody.dual .doc{flex:1;}
        /* TOC collapsed only via manual toggle */
        :host(.toc-collapsed) .toc{display:none;}
        /* article typography additions */
        .attrib{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;
          padding:12px 16px;margin:0 0 22px;border:1px solid var(--border);border-radius:10px;
          background:var(--panel);font-size:13px;line-height:1.5;}
        .attrib .a-k{color:var(--muted);}
        .attrib .a-v{color:var(--text);font-weight:600;}
        .attrib .pill{margin-left:auto;font-size:11px;font-weight:700;color:var(--on-accent);
          background-image:var(--accent-grad);padding:3px 10px;border-radius:999px;}
        .imgref{color:var(--muted);font-style:italic;}
        /* Tables: adapt to the pane width, never widen the page.
           SHARED_CSS already sets width:100%, but long unbreakable tokens
           (formulas / URLs) force cells past the container unless we switch
           to fixed layout + allow breaking. Local block wins over SHARED_CSS. */
        .essay table{table-layout:fixed;}
        .essay th,.essay td{overflow-wrap:anywhere;word-break:break-word;}
        /* rare: a formula KaTeX can't parse — keep it muted, never alarming red raw text */
        .katex-error{color:var(--muted);font-size:0.92em;}
        .loading,.errbox{padding:40px 24px;color:var(--muted);text-align:center;line-height:1.8;}
        .errbox{border:1px solid var(--danger);border-radius:10px;color:var(--text);max-width:640px;margin:40px auto;}
        .errbox code{background:var(--panel2);padding:2px 6px;border-radius:4px;color:var(--accent);}
        @media (max-width:768px){
          .toc{display:none;}
          .pdfpane{flex:1;}
          .rbody.dual{flex-direction:column;}
          .pdfpane{border-left:none;border-top:1px solid var(--border);}
        }
      </style>
      <div class="rbar">
        <div class="rbar-ttl" id="ttl">未选择文章</div>
        <div class="rbar-ctrls">
          <button class="rbtn" id="btnToc" title="显示 / 隐藏目录">目录</button>
          <button class="rbtn primary" id="btnPdf" hidden>对照阅读</button>
        </div>
      </div>
      <div class="rbody" id="rbody">
        <div class="doc" id="doc"><div class="empty">← 从左侧选择一篇精析</div></div>
        <div class="pdfpane" id="pdfpane" hidden>
          <div class="pdf-head">
            <span>原文 PDF</span>
            <div class="pdf-acts">
              <button class="rbtn" id="btnDl">下载</button>
              <button class="rbtn" id="btnExit">退出对照</button>
            </div>
          </div>
          <div class="pdf-canvas-wrap" id="pdfWrap"></div>
        </div>
        <nav class="toc" id="toc">
          <div class="toc-head">目录</div>
          <div class="toc-list" id="tocList"></div>
        </nav>
      </div>
    `;
    this._ttl = this.shadowRoot.getElementById("ttl");
    this._doc = this.shadowRoot.getElementById("doc");
    this._toc = this.shadowRoot.getElementById("toc");
    this._tocList = this.shadowRoot.getElementById("tocList");
    this._rbody = this.shadowRoot.getElementById("rbody");
    this._pdfpane = this.shadowRoot.getElementById("pdfpane");
    this._pdfWrap = this.shadowRoot.getElementById("pdfWrap");
    this._btnPdf = this.shadowRoot.getElementById("btnPdf");
    this._btnToc = this.shadowRoot.getElementById("btnToc");
    this._btnExit = this.shadowRoot.getElementById("btnExit");
    this._btnDl = this.shadowRoot.getElementById("btnDl");

    this._btnPdf.addEventListener("click", () => {
      if (this.mode === "dual") this.exitDual();
      else this.enterDual();
    });
    this._btnExit.addEventListener("click", () => this.exitDual());
    this._btnDl.addEventListener("click", () => this._downloadPdf());
    this._btnToc.addEventListener("click", () => this.toggleToc());
    this._doc.addEventListener("scroll", () => this._syncTOC(), { passive: true });
    this._applyTocState();
  }

  loadEntry(data) {
    if (!data) return;
    this._data = data;
    this.mode = "single";
    const meta = data.meta || null;
    const title =
      (meta && meta["标题"]) ? meta["标题"]
      : data.kind === "overview" ? "总览"
      : data.kind === "refs" ? "旁征博引"
      : "深析";
    this._ttl.textContent = title;
    this._updatePdfBtn();
    this._rbody.classList.remove("dual");
    this._pdfpane.hidden = true;
    this._pdfWrap.innerHTML = "";
    this._pdfUrl = null;
    this._doc.innerHTML = '<div class="loading">加载中…</div>';
    window.RData.getText(data.base + data.file).then((md) => {
      this._renderBody(md, title, meta);
      this._buildTOC();
      this._applyTocState();
    }).catch((err) => {
      this._doc.innerHTML = '<div class="errbox">无法加载 <code>' +
        escR(data.file) + '</code>。<br>请通过本地服务器访问（不要直接双击打开 index.html）。<br><small>' +
        escR(String(err)) + "</small></div>";
    });
  }

  _renderBody(md, title, meta) {
    // The article's own first H1 (the paper's original title) is kept as the
    // real H1 — it is NOT duplicated from the meta. The meta "标题" only lives
    // in the left-nav label (set by the manifest). The attribution bar shows
    // for normal articles; the 总览 (overview) gets no such bar.
    // Math is already rendered to KaTeX HTML inside mdToHtmlR, so a single
    // innerHTML assignment is all we need — no placeholder / DOM round-trip,
    // no raw-$ flash, no main-thread jank from walking the tree.
    const isOverview = this._data && this._data.kind === "overview";
    const attrib = (!isOverview && meta) ? metaBarHTML(meta) : "";
    const html = mdToHtmlR(md);
    this._doc.innerHTML = '<article class="essay">' + attrib + html + "</article>";
  }

  _buildTOC() {
    const heads = this._doc.querySelectorAll(".essay h2, .essay h3");
    if (!heads.length) { this._tocList.innerHTML = '<div class="empty" style="padding:14px">本文无小标题</div>'; return; }
    this._tocItems = [];
    const html = Array.from(heads).map((h, i) => {
      const id = "rh-" + i;
      h.id = id;
      const lvl = h.tagName === "H3" ? "lvl3" : "";
      const item = '<button class="toc-item ' + lvl + '" data-id="' + id + '">' + escR(h.textContent) + "</button>";
      this._tocItems.push({ id, el: h });
      return item;
    }).join("");
    this._tocList.innerHTML = html;
    this._tocList.querySelectorAll(".toc-item").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-id");
        const tgt = this._doc.querySelector("#" + (window.CSS && CSS.escape ? CSS.escape(id) : id));
        if (!tgt) return;
        // Scroll ONLY the article pane's own scroll container (.doc). Using
        // scrollIntoView here would also scroll the outer document and make the
        // whole page "lift up" — so we compute the offset manually instead.
        const docTop = this._doc.getBoundingClientRect().top;
        const y = tgt.getBoundingClientRect().top - docTop + this._doc.scrollTop;
        this._doc.scrollTo({ top: y, behavior: "smooth" });
      });
    });
  }

  _syncTOC() {
    if (!this._tocItems || !this._tocItems.length) return;
    const base = this._doc.getBoundingClientRect().top;
    const top = this._doc.scrollTop;
    let active = this._tocItems[0];
    for (const it of this._tocItems) {
      const rel = it.el.getBoundingClientRect().top - base + top;
      if (rel - 12 <= top) active = it;
    }
    this._tocList.querySelectorAll(".toc-item").forEach((b) =>
      b.classList.toggle("on", b.getAttribute("data-id") === active.id));
  }

  _updatePdfBtn() {
    const d = this._data;
    if (!d) { this._btnPdf.hidden = true; return; }
    if (d.kind === "overview") { this._btnPdf.hidden = true; return; } // 总览无 PDF
    if (d.pdf) {
      this._btnPdf.hidden = false;
      this._btnPdf.disabled = false;
      this._btnPdf.textContent = this.mode === "dual" ? "退出对照" : "对照阅读";
    } else {
      this._btnPdf.hidden = false;
      this._btnPdf.disabled = true;   // 无 PDF：置灰
      this._btnPdf.textContent = "无 PDF";
    }
  }

  enterDual() {
    const d = this._data;
    if (!d || !d.pdf) return;
    this.mode = "dual";
    this._pdfUrl = d.pdf;
    this._pdfpane.hidden = false;
    this._rbody.classList.add("dual");
    // TOC stays visible (nav | md | pdf | toc); left nav is NOT auto-collapsed.
    this._updatePdfBtn();
    this.dispatchEvent(new CustomEvent("research-dual", { bubbles: true, composed: true, detail: { on: true } }));
    this._renderPdf();
  }

  async _renderPdf() {
    if (!this._pdfUrl || !window.pdfjsLib) return;
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc)
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "UI/research/vendor/pdfjs/pdf.worker.min.js";
    this._pdfWrap.innerHTML = '<div class="pdf-msg">正在渲染 PDF…</div>';
    try {
      const res = await fetch(this._pdfUrl);
      if (!res.ok) throw new Error("HTTP " + res.status);
      const buf = await res.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
      this._pdfWrap.innerHTML = "";
      const scale = 1.15;
      for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.className = "pdf-page";
        this._pdfWrap.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
      }
    } catch (e) {
      this._pdfWrap.innerHTML = '<div class="pdf-msg pdf-err">PDF 渲染失败：' + escR(String(e)) + '</div>';
    }
  }

  async _downloadPdf() {
    if (!this._pdfUrl) return;
    // Fetch as a blob and download via an object URL so we never trigger a
    // direct .pdf navigation (which the probe would catch and auto-download).
    try {
      const res = await fetch(this._pdfUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = this._pdfUrl.split("/").pop() || "paper.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      const a = document.createElement("a");
      a.href = this._pdfUrl;
      a.download = this._pdfUrl.split("/").pop() || "paper.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  exitDual() {
    if (!this._data) return;
    this.mode = "single";
    this._pdfpane.hidden = true;
    this._pdfWrap.innerHTML = "";
    this._pdfUrl = null;
    this._rbody.classList.remove("dual");
    this._updatePdfBtn();
    this.dispatchEvent(new CustomEvent("research-dual", { bubbles: true, composed: true, detail: { on: false } }));
  }

  toggleToc() {
    this._tocUserOpen = !this._tocUserOpen;
    this._setTocCollapsed(!this._tocUserOpen);
  }

  _setTocCollapsed(collapsed) {
    this._tocCollapsed = collapsed;
    this.classList.toggle("toc-collapsed", collapsed);
    if (!collapsed) this._syncTOC();
  }

  _applyTocState() {
    this.classList.toggle("toc-collapsed", !this._tocUserOpen);
  }
}

defineComponent("research-reader", ResearchReader);
