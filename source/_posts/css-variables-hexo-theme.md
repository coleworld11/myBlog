---
title: 在 Hexo 主题里用 CSS 变量统一设计令牌
date: 2026-04-18 14:30:00
categories: [前端]
tags: [CSS, Stylus, 主题开发]
---

写 Hexo 主题最容易失控的是颜色和间距。早期我会把 `#2B2B2B` 在 10 个 stylus 文件里重复写一遍；过段时间想换个主色就得全文搜索 + 手动替换，深色模式更是无从下手。

后来把所有可变值收拢到 CSS 自定义属性里，维护成本直接下降一个数量级。

<!-- more -->

## 为什么不是 Stylus 变量

Stylus 的 `$color-bg = #F9F8F6` 是编译期字面替换，生成的 CSS 里就是死的十六进制。深色模式想换色就得两套 stylus 重复编译，根本做不到浏览器端切换。

CSS 自定义属性（`--bg`）是运行时变量，给 `<html>` 改个 `data-theme` 属性，整棵 DOM 的颜色全跟着变。这是实现浅/深双模式的唯一干净路径。

## 令牌分三层

```stylus
:root
  --bg           #F9F8F6
  --fg           #2D2B2B
  --accent       #D97757

@media (prefers-color-scheme: dark)
  :root
    --bg         #17171A
    --fg         #E4E2DC
    --accent     #E89478

html[data-theme='light']
  // 同 :root 默认

html[data-theme='dark']
  // 同 dark 媒体查询
```

三层覆盖顺序：默认 → 系统深色查询 → 用户手动选择。`auto` 模式不写 `data-theme` 属性，自动落到媒体查询。

### 命名约定

| 前缀 | 用途 |
|------|------|
| `--bg-*` | 背景层次 |
| `--fg-*` | 文字层次 |
| `--border-*` | 边框 |
| `--accent*` | 点缀色 |
| `--sp-{n}` | 4px 倍数间距 |

### 深色值不是浅色取反

直觉上会以为 `#2D2B2B` 反过来就是深色模式正文色，实际完全不对。深色底上的亮文字需要降饱和 + 提亮度，`#E4E2DC` 这种微暖灰才不刺眼。

## 一条禁令

除 `variables.styl` 以外的任何 stylus 文件都**不准出现十六进制色值**。每次 code review 先 `grep -E '#[0-9A-Fa-f]{3,6}' themes/paper/source/css --include='*.styl' -v variables.styl`，有命中就拒。

这条规矩落实后，换主色只需要改 `variables.styl` 一个字段，全站一次性换肤。

## 小结

设计系统不是大项目的专利。个人博客里六七百行样式也足以从中受益 —— 关键是**尽早把可变量抽出来**，别等到 10 个文件遍地开花才回头统一。
