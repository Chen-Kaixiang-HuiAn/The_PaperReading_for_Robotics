/* ============================================================
   research/components/app.js — <research-app>
   Controller for the Robotics reader subsite. Owns the standard
   four-region layout (topbar / left nav / content / footer),
   crawls / for weekly + monthly content, wires the left
   <standard-nav> to the <research-reader>, and handles:

     • left-sidebar collapse (manual toggle + auto when entering
       dual-column comparison mode);
     • mobile off-canvas drawer (≤768px);
     • ← / → keyboard stepping through articles;
     • listening for the reader's "research-dual" event to
       auto-collapse / restore the left sidebar.

   All chrome styling comes from window.SHARED_CSS; only a few
   layout-specific rules are added here.
   ============================================================ */

// Build a flat list of leaf nodes (document order) so we can step through
// them with the arrow keys. The order matches <standard-nav>'s __idx.
function flattenLeaves(nodes, out) {
  (nodes || []).forEach((n) => {
    if (n.children && n.children.length) flattenLeaves(n.children, out);
    else out.push(n);
  });
  return out;
}

class ResearchApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._idx = -1;
    this._flat = [];
    this._leftUserOpen = true;
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>${window.SHARED_CSS}</style>
      <style>
        .topbtns{display:flex;align-items:center;gap:8px;}
        .rbtn{appearance:none;border:1px solid var(--border);background:var(--panel2);color:var(--muted);
          font-size:13px;font-weight:600;padding:6px 12px;border-radius:8px;cursor:pointer;transition:.15s;white-space:nowrap;}
        .rbtn:hover{color:var(--text);background:var(--hover);}
        .brand h1{font-size:16px;}
        .count{color:var(--muted);font-size:12px;margin-left:8px;}
        /* left sidebar owns its own collapse / expand controls */
        .body{position:relative;}
        .sidebar{display:flex;flex-direction:column;min-width:0;transition:width .18s ease;}
        .sidebar-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;
          padding:10px 14px;border-bottom:1px solid var(--border);background:var(--panel);
          color:var(--muted);font-size:12px;font-weight:700;letter-spacing:.5px;}
        .sh-btn{appearance:none;border:1px solid var(--border);background:var(--panel2);color:var(--muted);
          font-size:14px;font-weight:700;width:28px;height:28px;border-radius:7px;cursor:pointer;transition:.15s;}
        .sh-btn:hover{color:var(--text);background:var(--hover);}
        .app.nav-collapsed .sidebar{width:0;min-width:0;overflow:hidden;border-right:none;}
        /* floating expand tab, shown only while the sidebar is collapsed */
        .nav-expand{display:none;position:absolute;left:0;top:16px;z-index:6;appearance:none;
          border:1px solid var(--border);border-left:none;background:var(--panel);color:var(--muted);
          font-size:15px;font-weight:700;width:24px;height:42px;border-radius:0 9px 9px 0;cursor:pointer;
          align-items:center;justify-content:center;}
        .nav-expand:hover{color:var(--text);background:var(--hover);}
        .app.nav-collapsed .nav-expand{display:flex;}
      </style>
      <div class="app">
        <header class="topbar">
          <div class="brand">
            <button class="menu-btn" id="menu" title="目录" aria-label="目录">☰</button>
            <span class="dot"></span>
            <h1>机器人导航论文精析</h1>
            <span class="count" id="count"></span>
          </div>
          <div class="topright">
            <div class="hint">← → 切换 · 滚轮阅读 · 对照阅读时导航与目录常驻</div>
            <div class="topbtns">
              <theme-toggle></theme-toggle>
            </div>
          </div>
        </header>
        <div class="body">
          <div class="backdrop" id="backdrop"></div>
          <button class="nav-expand" id="navExpand" title="展开左栏" aria-label="展开左栏">⟨</button>
          <aside class="sidebar">
            <div class="sidebar-head">
              <span>导航</span>
              <button class="sh-btn" id="navCollapse" title="收起左栏" aria-label="收起左栏">⟩</button>
            </div>
            <standard-nav id="nav"></standard-nav>
          </aside>
          <main class="main">
            <research-reader id="reader"></research-reader>
          </main>
        </div>
        <footer class="foot">Built by <span class="name">Chen Kaixiang</span>, ${new Date().getFullYear()}</footer>
      </div>
    `;

    this._appEl = this.shadowRoot.querySelector(".app");
    this.navEl = this.shadowRoot.querySelector("#nav");
    this.readerEl = this.shadowRoot.querySelector("#reader");
    this.countEl = this.shadowRoot.querySelector("#count");

    this.navEl.addEventListener("std-nav-select", (e) => {
      this._appEl.classList.remove("nav-open");
      this.selectIndex(e.detail.index);
    });

    this.shadowRoot.querySelector("#menu").addEventListener("click", () =>
      this._appEl.classList.toggle("nav-open"));
    this.shadowRoot.querySelector("#backdrop").addEventListener("click", () =>
      this._appEl.classList.remove("nav-open"));
    // Left sidebar owns its own collapse / expand controls.
    this.shadowRoot.querySelector("#navCollapse").addEventListener("click", () =>
      this._setLeftCollapsed(true, true));
    this.shadowRoot.querySelector("#navExpand").addEventListener("click", () =>
      this._setLeftCollapsed(false, true));

    // On entering dual reading we auto-collapse the LEFT nav so the PDF gets
    // maximum width; the right-hand TOC stays visible (目录 coexists, on the
    // right of the PDF pane). The full 导航栏-md栏-PDF栏-目录栏 four-column form
    // is reached by clicking the left expand tab (⟨). On exit we restore the
    // user's previous nav open/collapsed preference.
    this.addEventListener("research-dual", (e) => {
      if (e.detail && e.detail.on) this._setLeftCollapsed(true, false);
      else this._setLeftCollapsed(!this._leftUserOpen, false);
    });

    document.addEventListener("keydown", (e) => this.onKey(e));

    this._load();
  }

  async _load() {
    try {
      const tree = await window.RData.crawlResearch();
      this._flat = flattenLeaves(tree, []);
      this.countEl.textContent = "共 " + this._flat.length + " 篇";
      this.navEl.setTree(tree);
      if (this._flat.length) this.selectIndex(0);
    } catch (err) {
      this.readerEl.showError && this.readerEl.showError(String(err));
      this.countEl.textContent = "加载失败";
    }
  }

  selectIndex(i) {
    const node = this._flat[i];
    if (!node || !node.data) return;
    this._idx = i;
    this.readerEl.loadEntry(node.data);
    this.navEl.setActive(i);
  }

  step(dir) {
    const n = this._idx + dir;
    if (n >= 0 && n < this._flat.length) this.selectIndex(n);
  }

  _setLeftCollapsed(collapsed, remember) {
    if (remember !== false) this._leftUserOpen = !collapsed;
    this._appEl.classList.toggle("nav-collapsed", collapsed);
  }

  onKey(e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); this.step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); this.step(1); }
  }
}

defineComponent("research-app", ResearchApp);
