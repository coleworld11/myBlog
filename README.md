# Notes by Mz

Hexo 博客源码。`main` 分支用于发布，GitHub Actions 构建站点并部署到 GitHub Pages。

## 环境

- Node.js 20
- pnpm 8

## 命令

```bash
pnpm install
pnpm start
pnpm build
pnpm clean
```

`pnpm start` 启动本地预览，端口为 `4001`。修改 `_config.yml` 或主题文件后，先执行 `pnpm clean` 再重新构建或预览。

## 写作

正式文章放在 `source/_posts/`。

```bash
pnpm exec hexo new "post-title"
```

每篇文章保留完整 front matter：

```yaml
---
title: 文章标题
date: 2026-06-08 15:30:00
categories: [工具]
tags: [Git, Windows]
---
```

首页摘要使用 `<!-- more -->` 控制。

草稿、临时笔记和未发布材料放在 `drafts/`。该目录已加入 `.gitignore`。

## 目录

```text
.
├── _config.yml              # Hexo 站点配置
├── package.json             # 脚本和依赖
├── source/
│   ├── _posts/              # 正式文章
│   ├── about/               # 关于页
│   ├── categories/          # 分类页
│   └── tags/                # 标签页
├── scaffolds/               # Hexo 模板
├── themes/
│   └── paper/               # 当前主题
├── drafts/                  # 本地草稿，不提交
└── .github/workflows/
    └── deploy.yml           # Pages 部署流程
```

## 主题

- 站点配置：`_config.yml`
- 主题配置：`themes/paper/_config.yml`
- 页面模板：`themes/paper/layout/`
- 样式和脚本：`themes/paper/source/`

## 发布

推送到 `main` 后，`.github/workflows/deploy.yml` 会安装依赖、执行 Hexo 构建，并将 `public/` 部署到 GitHub Pages。

提交前检查：

```bash
git status --short --branch
pnpm build
```

不要提交构建产物、依赖目录、日志、本地草稿、环境文件或密钥材料。

## License

仓库未声明项目级开源许可证。文章版权归作者所有。
