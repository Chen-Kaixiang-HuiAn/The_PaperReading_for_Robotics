# The PaperReading for Robotics

机器人 / 机器人导航领域的**论文精析**归档仓库。每周 / 每月自动精析机器人导航论文，产出结构化深度解读（周刊·精粹合集 + 月刊·深析），并与原文 PDF 一并保存，长期累积形成可检索的研究资料库。

阅读器 [`index.html`](index.html) 是一个**零依赖、零构建**的单页应用，运行时直接读取仓库根目录下的 `weekly/` 与 `monthly/`，新增日期文件夹刷新即见，无需任何清单文件或打包步骤。

---

## 目录结构

```
The_PaperReading_for_Robotics/
├── index.html          # 阅读器入口（仓库根目录）
├── preferences_weekly.md   # 周刊自动化任务的偏好设置（被 .gitignore 忽略）
├── preferences_monthly.md  # 月刊自动化任务的偏好设置（被 .gitignore 忽略）
├── .gitignore          # 忽略 .workbuddy 运行时
├── README.md
├── .workbuddy/         # 自动化运行时（已被 .gitignore 忽略，不入库）
├── weekly/             # 周刊·精粹合集（每周一期）
│   └── YYYYMMDD/
│       ├── weekly_overview.md   # 本期总览（主题 / 目录 / 编者按）
│       ├── NN_简称.md           # 各篇精粹（H1 = 论文原标题）
│       └── XXXX.XXXXX.pdf       # 论文原文 PDF
└── monthly/            # 月刊·深析（每月一期）
    └── YYYYMM/
        ├── monthly_overview.md  # 本期总览（论文信息表 / 编者按）
        ├── NN_简称.md           # 各篇深析（H1 = 论文原标题）
        └── XXXX.XXXXX.pdf       # 论文原文 PDF
```

`weekly/` 与 `monthly/` 下每个日期目录对应一期论文精析，包含：

| 文件 | 说明 |
|------|------|
| `weekly_overview.md` / `monthly_overview.md` | 本期总览（主题 / 目录 / 编者按 / 论文信息表） |
| `NN_简称.md` | 各篇结构化深度解读（H1 = 论文原标题），阅读器主区展示的内容 |
| `XXXX.XXXXX.pdf` | 论文原文 PDF（有则显示「PDF」徽标，无则显示「无PDF」） |

---

## 阅读器使用

### 本地启动

阅读器通过 `fetch` 动态读取目录列表，**必须经 HTTP 服务访问**，直接双击 `index.html`（`file://`）会被浏览器拦截。

在仓库根目录执行（任选一种）：

```bash
# Python 3 内置 HTTP 服务（推荐）
python -m http.server 8000 --directory "<仓库根目录>"

# 或指定端口
python -m http.server 8000
```

然后浏览器打开：**http://localhost:8000/index.html**

### 功能

- **搜索**：顶部输入框按标题 / 副标题 / 日期实时过滤。
- **排序**：日期（新→旧 / 旧→新）、标题 A→Z。
- **视图切换**：顶部分段键在「精析 Deep Dive」与「原文 Paper (PDF)」之间切换，同一时刻只显示其中一个，避免左右分栏占用空间。
- **自动关联**：启动时实时爬取 `/` 目录列表，解析 `weekly/` 与 `monthly/` 下各日期目录的标题与 PDF，因此新增论文无需重新生成任何清单——刷新页面即可见。

### 快捷键

| 按键 | 作用 |
|------|------|
| `↑` / `↓` | 上一篇 / 下一篇论文 |
| `v` | 在 Deep Dive 与 PDF 视图间切换 |

---

## 技术说明

- 阅读器为纯静态单文件，无任何第三方依赖，可托管于任意静态服务器或 GitHub Pages。
- 数据关联逻辑由 `UI/research/manifest.js` 内的 `crawlResearch()` 实现：请求 `/` 目录列表，用正则 `^(\d{4})-?(\d{2})(?:-?(\d{2}))?$` 过滤出 `weekly/` 与 `monthly/` 下的日期目录，再逐个抓取 `NN_*.md` / `weekly_overview.md` / `monthly_overview.md` 提取标题，并定位首个 `.pdf`。
- 由于依赖目录列表接口，部署时请确保 HTTP 服务允许目录浏览（Python `http.server` 默认开启）。

---

## 数据来源

论文精析由每周 / 每月自动化任务（WorkBuddy「每周机器人导航论文精析（周刊·精粹合集）」与「每月机器人导航深度精析（月刊·深析）」）生成并写入 `weekly/` 与 `monthly/`。`preferences_weekly.md` / `preferences_monthly.md` 保存对应任务的长期偏好，供自动化读取与改写。

---

## 许可

论文 PDF 版权归原作者与出版方所有，本仓库仅作个人研究归档与阅读之用。
