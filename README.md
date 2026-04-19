# Notes by Mz

个人博客源码，基于 [Hexo](https://hexo.io) + 自建主题 `paper`（Claude 风极简排版、浅/深色双模式、带 TOC 的文章详情页）。

访问：<https://mz-789.github.io/myBlog/>

---

## 快速开始

```bash
pnpm install        # 安装依赖（首次）
hexo server         # 本地预览 http://localhost:4000/myBlog/
pnpm build          # 生成静态文件到 public/
pnpm clean          # 清缓存（改过 _config.yml 或主题文件后必跑）
```

**改过配置或主题？先 `pnpm clean` 再重启 server**，不然看到的还是旧的。

---

## 写一篇新文章

```bash
pnpm exec hexo new "文章标题"
```

执行后会在 `source/_posts/` 下生成一份 md，带上 front-matter 骨架：

```markdown
---
title: 文章标题
date: 2026-04-19 10:00:00
categories:
tags:
---

正文从这里开始……
```

保存后 dev server 会自动热更新，浏览器刷新就能看到。

### 常用 front-matter 字段

| 字段 | 作用 | 示例 |
|------|------|------|
| `title` | 显示标题 | `Hexo 主题折腾笔记` |
| `date` | 发布日期，影响排序和 permalink | `2026-04-19 10:00:00` |
| `updated` | 最后修改时间，默认取文件 mtime | `2026-04-20 15:00:00` |
| `categories` | 分类（一维 / 二维都可） | 见下节 |
| `tags` | 标签（扁平列表） | 见下节 |
| `description` | 自定义摘要，覆盖自动抽取 | `一段简介` |

### 摘要截断

正文里加一行 `<!-- more -->`，之前的内容会作为首页卡片摘要：

```markdown
这段会出现在首页卡片上。

<!-- more -->

这段之后只在详情页显示。
```

---

## 分类和标签

### 单分类 / 多标签

```yaml
---
title: 在 Hexo 主题里用 CSS 变量
categories: [前端]
tags: [CSS, Stylus, 主题开发]
---
```

### 多分类嵌套（父 → 子）

```yaml
categories:
  - [前端, CSS]
  - [笔记]
```

会生成 `/categories/前端/`、`/categories/前端/CSS/`、`/categories/笔记/` 三个路径。

### 标签和分类的索引页

- `/tags/` — 所有标签总览（来源 `source/tags/index.md`）
- `/tags/CSS/` — CSS 标签下的文章列表（由 `hexo-generator-tag` 自动生成）
- `/categories/` — 所有分类总览（来源 `source/categories/index.md`）
- `/categories/前端/` — 前端分类下的文章列表（自动生成）

> ⚠️ 总览页（`/tags/` 和 `/categories/` 本身）必须保留 `source/tags/index.md` 和 `source/categories/index.md` 这两个占位文件，删了总览页就 404 了。

---

## 支持的写作特性

### 代码块

行号已关（`_config.yml` 的 `highlight.line_number: false`），输出干净的 `<pre><code>`，拖拽复制不会带行号：

````markdown
```js
const greet = (name) => `Hello, ${name}!`;
console.log(greet('Mz'));
```
````

高亮主题：`themes/paper/_config.yml` 的 `highlight.theme`。默认 `atom-one-dark`，可换成 `atom-one-light` / `github` 等（`themes/paper/source/plugins/highlight/styles/` 下有 90+ 可选）。

### 目录 TOC

文章里只要出现 `##` / `###` / `####` 标题，详情页右侧就会自动生成 sticky TOC（宽屏）或顶部折叠 TOC（≤1024px）。无需额外配置。滚动时当前章节会高亮。

### 表格、引用、列表

标准 Markdown，主题已适配样式：

```markdown
| 列 1 | 列 2 |
|------|------|
| a | b |

> 引用块走左侧线条样式

- 列表
- 嵌套列表
  - 子项
```

### 内联代码与键盘键

```markdown
用 `pnpm build` 构建。快捷键 `Ctrl + S` 保存。
```

### 图片

放在 `source/imgs/` 下，引用时走相对路径：

```markdown
![示意图](/imgs/example.png)
```

`url_for` 的前缀由 Hexo 自动加上，部署到 GitHub Pages 时会是 `/myBlog/imgs/example.png`。

---

## 深色模式

右上角圆按钮循环三态：**浅色 → 深色 → 跟随系统**。选择写入 `localStorage`，下次直接生效、无闪屏。

调色在 `themes/paper/source/css/variables.styl`，修改颜色后记得 `pnpm clean && hexo server`。

---

## 目录结构

```
.
├── _config.yml              站点配置（标题、URL、高亮、部署、主题名）
├── source/
│   ├── _posts/              文章 md
│   ├── about/index.md       关于页
│   ├── tags/index.md        标签总览页（占位）
│   └── categories/index.md  分类总览页（占位）
├── scaffolds/               新建文章模板（hexo new 读这里）
│   └── post.md
├── themes/
│   ├── paper/               ★ 当前主题
│   │   ├── _config.yml      主题配置（菜单、日期格式、高亮主题）
│   │   ├── layout/          EJS 模板
│   │   └── source/
│   │       ├── css/         Stylus 样式（入口 style.styl）
│   │       ├── js/          theme-toggle.js
│   │       ├── imgs/        favicon 等
│   │       └── plugins/     highlight.js 配色包
│   └── burgerking/          旧主题备份，不再使用
└── .github/workflows/
    └── deploy.yml           push main 自动 build + 发 Pages
```

---

## 主题定制速查

改动目标 | 改哪里
--- | ---
颜色 / 字体 / 间距 / 圆角 | `themes/paper/source/css/variables.styl`（CSS 变量统一管理，浅深两套各改一次）
首页/文章模板结构 | `themes/paper/layout/*.ejs`
导航菜单项 | `themes/paper/_config.yml` 的 `Menu:` 字典
代码高亮主题 | `themes/paper/_config.yml` 的 `highlight.theme`
页脚署名 | `themes/paper/layout/_partial/footer.ejs`
Logo 文字（当前是站点 title + 点缀 `.`） | `_config.yml` 的 `title` 字段

---

## 部署

push 到 `main` 分支即自动触发 GitHub Actions（`.github/workflows/deploy.yml`）：

1. pnpm install
2. `hexo clean && hexo g`
3. 把 `public/` 上传为 Pages artifact
4. 部署到 Pages 环境

换仓库名 / 改 Pages 路径时，同步改 `_config.yml`:

```yaml
url: https://<user>.github.io/<repo>
root: /<repo>/
```

否则所有 CSS / JS / 图片链接会 404。

---

## License

- 博客正文（`source/_posts/*.md`）版权归作者所有
- 主题 `themes/paper/` 自写，可自用可改
- 主题 `themes/burgerking/` 来自第三方开源，保留原 MIT LICENSE
