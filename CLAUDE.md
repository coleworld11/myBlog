# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

个人博客 **Notes by Mz**，基于 Hexo 8.1.1 静态站点生成器。活动主题是自建的 `themes/paper`（Claude 风极简设计 — 米纸底色 / 珊瑚橙点缀 / 浅深色双模式 / 细边框代替阴影）。旧主题 `themes/burgerking` 保留在树上作备份参考，当前未启用。

包管理器 **pnpm**（CI 固定 pnpm 8 + Node 20）。部署到 `mz-789.github.io/myBlog` 经 GitHub Actions。

## Common Commands

```bash
pnpm start          # 开发服务器 http://localhost:4000/myBlog/
pnpm build          # 生成 public/  (hexo generate)
pnpm clean          # 清 public/ 和 db.json（改配置 / 主题文件后必跑）
pnpm deploy         # 通过 hexo-deployer-git 推（CI 不走此路径）

pnpm exec hexo new "标题"              # 新文章 -> source/_posts/
pnpm exec hexo new draft "草稿标题"    # 草稿 -> source/_drafts/
pnpm exec hexo new page xxx            # 独立页 -> source/xxx/
```

**重要**：修改 `_config.yml`、主题文件或 CSS 变量后，dev server 需要停掉重启（Ctrl+C → `pnpm clean && pnpm start`）。Hexo server 会缓存 build 到内存，热 reload 只覆盖正文 md，不覆盖主题/配置变更。

## Architecture

### 配置分层

两份 `_config.yml`，改动时分清楚：

- **`/_config.yml`** — 站点级：`title: Notes by Mz`、`url` / `root: /myBlog/`（影响所有链接前缀）、`permalink`、`highlight`（已设 `line_number: false` + `wrap: false` + `hljs: true` 输出干净的 `<pre><code>` 而不是 `<figure><table>`）、`index_generator`、`theme: paper`。
- **`/themes/paper/_config.yml`** — 主题级：`Menu` 顺序和标签、`date_format`、`read_more` 文案、`highlight.theme: atom-one-dark`（决定加载哪个 hljs 配色 CSS）、`busuanzi.enable`。
- **Gitalk 评论**在站点级 `_config.yml`，默认 `enable: false`。主题 `head.ejs` 和 `post.ejs` 条件加载。

所有生成链接必须通过 `url_for()` helper 拼 `root` 前缀；任何硬编码 `/xxx/` 资源路径在 GitHub Pages 子路径下会 404。

### 主题 `themes/paper/` 结构

**EJS 渲染链**：`layout.ejs` 是外壳 → include `_partial/head.ejs` + `_partial/header.ejs` + `_partial/footer.ejs`。页面 layout 填充 `<%- body %>`：

- `index.ejs` — 首页 `<div class="feed">` 内的文章流 + 分页
- `post.ejs` — 文章详情，容器挂 `has-toc` 类（基于 `/<h[2-4]/` 正则检测）；有 TOC 时切换成双列 grid
- `archive.ejs` — 按年分组时间轴
- `tag.ejs` / `category.ejs` — 双态模板：`page.tag` / `page.category` 有值时列文章，否则列全部
- `about.ejs` — 渲染 `source/about/index.md` 的 Markdown body
- `_partial/article.ejs` — 卡片/详情共用的文章结构
- `_partial/article-meta.ejs` — 日期·分类元信息行
- `_partial/toc.ejs` — 条件渲染 TOC，用 Hexo 内置 `toc()` helper
- `_partial/pagination.ejs` — 自定义分页（prev / 省略号 / next）
- `_partial/head.ejs` / `header.ejs` / `footer.ejs` — 头尾

**样式分层**（Stylus → CSS 变量主导）：

```
source/css/
├── variables.styl   设计令牌 :root + @media dark + [data-theme] 手动覆盖
├── reset.styl       normalize.css v8
├── base.styl        html/body/标题/链接 全局
├── layout.styl      nav / main / footer 骨架
├── components.styl  card / chip / pagination / toc / theme-toggle / post-layout
├── prose.styl       文章正文排版 (.prose)
├── code.styl        <pre><code> 外框，颜色让 atom-one-dark 接管
├── pages.styl       archive / taxonomy / about
├── mobile.styl      @media (max-width: 1024px) 与 640px 两段响应式
└── style.styl       @import 汇总入口
```

**铁律**：所有颜色/字体/间距/圆角必须 `var(--xxx)` 引用。硬编码色值会破坏深色模式联动。新增颜色前必须先加到 `variables.styl` 的三份变量块（`:root`、`[data-theme='light']`、`[data-theme='dark']` 或 `@media dark`）。

关键 token：`--bg` / `--bg-elevated` / `--fg` / `--fg-heading` / `--fg-muted` / `--fg-subtle` / `--border` / `--border-strong` / `--accent` / `--code-bg`。宽度 `--content-width: 760px`（正文阅读宽）、`--layout-width: 1100px`（带 TOC 的双列总宽）。

### TOC

走 Hexo 内置 `toc()` helper（`hexo-renderer-marked` 已为 `<h1..h6>` 生成锚点 id），主题侧不依赖额外插件。`post.ejs` 根据 `page.content` 是否包含 h2/h3/h4 决定是否给容器加 `has-toc` 类。无 TOC 时正文自然居中在 760px；有 TOC 时切换到 `grid-template-columns: minmax(0, 760px) 220px` + 60px gap。`.toc a.toc-active` 由 `source/js/theme-toggle.js` 的 scroll 监听加上。

### 深色模式

三态：`light` / `dark` / `auto`。用户点 header 右侧圆按钮循环切换。实现要点：

- `layout.ejs` 顶部 inline `<script>` 在首屏渲染前读 `localStorage.theme` 并写入 `<html data-theme="...">`，避免闪屏
- `variables.styl` 定义三组：默认 `:root`、`@media (prefers-color-scheme: dark)`、`html[data-theme='light|dark']`（手动覆盖系统）
- `auto` 模式不写 `data-theme` 属性，回落到系统媒体查询
- `source/js/theme-toggle.js` 负责按钮循环逻辑 + TOC 滚动高亮

### 代码高亮

站点 `_config.yml` 启 `syntax_highlighter: highlight.js` + `highlight.enable: true` + `line_number: false` + `wrap: false` + `hljs: true`。Hexo 服务端生成 `<pre><code class="hljs language-xxx">...</code></pre>`。实际颜色由 `themes/paper/source/plugins/highlight/styles/atom-one-dark.css` 接管（`head.ejs` 读 `theme.highlight.theme` 加载）。`code.styl` 里 `.prose pre` 只提供外框，不覆盖 `.hljs` 的 background/color 以免破坏语法色。

如果要切 light 高亮主题，改 `themes/paper/_config.yml` 的 `highlight.theme: atom-one-light`（或 `github`），同目录 CSS 已备好 90+ 主题可选。

### Deployment

`.github/workflows/deploy.yml` 在 push 到 `main` 时：pnpm install → `hexo clean && hexo g` → 上传 `public/` → `actions/deploy-pages@v4`。**CI 不走 `pnpm deploy` / `hexo-deployer-git`**；`_config.yml` 的 `deploy:` 段只对本地手动部署有意义。改仓库名或 Pages 路径必须同步改 `_config.yml` 的 `url` 和 `root`。

## 内容约定

- 文章放 `source/_posts/`，文件名进 permalink（`:year/:month/:day/:title/`）
- 新建 scaffold `scaffolds/post.md` 已含 `title` / `date` / `categories` / `tags` 四字段
- **`tags` 和 `categories` 的索引页必须手动建**：`source/tags/index.md`（front-matter `layout: tag`）和 `source/categories/index.md`（`layout: category`）已创建。`hexo-generator-tag` / `hexo-generator-category` 只生成详情页，不生成总览页 — 这两个 md 是总览页的入口。
- `source/about/index.md` 的 front-matter 用 `layout: about`，让主题按 `about.ejs` 渲染
- `render_drafts: false` —— `source/_drafts/` 默认不生成
- `future: true` —— 允许未来日期文章进入 build
