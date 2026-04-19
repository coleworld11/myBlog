---
title: 前端首屏性能清单（2025 年末版）
date: 2025-11-05 16:40:00
categories: [前端]
tags: [性能优化, Web Vitals, 前端工程]
---

Core Web Vitals 今年又调了指标权重，LCP 仍然是重头戏，INP 取代 FID 成为交互响应的主指标。这篇把最近两个项目里验证有效的优化点整理成清单。

<!-- more -->

## 资源加载层

### 关键 CSS 内联

首屏需要的 CSS（一般是导航 + 第一屏布局）inline 到 `<head>`，其余 async 加载：

```html
<style>/* critical ~8kb */</style>
<link rel="preload" href="/main.css" as="style" onload="this.rel='stylesheet'">
```

工具推荐 `critters`（PostCSS 插件）或 `beasties`，自动抽取。

### 字体策略

- `font-display: swap` 避免字体加载期间文字不可见
- 中文站点优先用系统字体栈，webfont 只在必要时加载
- 如果必须用 webfont，`preload` + 子集化（只打包实际用到的字符）

### 图片

- 新图一律 `.webp` 或 `.avif`，老 CMS 图片保留 jpg 但尺寸要控制
- `<img loading="lazy">` 对非首屏图片无脑加
- 首屏 hero 图 `<link rel="preload" as="image">`

## 渲染层

### LCP 元素要稳定

LCP 一般是首屏最大的图片或段首 `<h1>`。别让它:

- 被 React 的 Suspense 包住（会先渲占位）
- 延迟到 `useEffect` 后才挂载
- 用 CSS 动画淡入（LCP 以最终像素填充为准，淡入会延后）

### INP 优化

INP 衡量的是交互响应。长任务（> 50ms）是主要杀手：

- 大列表虚拟滚动
- 重计算用 `requestIdleCallback` 切片
- 第三方脚本用 `<script async>` 或延迟到 `requestAnimationFrame` 之后

### CLS 三板斧

- 图片必须写 `width` + `height`
- 广告位预留固定高度
- 动态插入的 banner 用 `transform` 位移，别挤挤压原有布局

## 构建层

### 代码分割

- 路由级 code-split 默认开（Next / Nuxt / Vite 都自带）
- 第三方大库（lodash / moment）换小型替代（lodash-es / dayjs）
- Tree-shaking 失效常常是因为包作者写了副作用，检查 `package.json` 的 `sideEffects` 字段

### 检查工具

- Lighthouse CI 进 CI pipeline，回归时自动报警
- WebPageTest 看真实设备瀑布图
- Chrome DevTools Performance 面板的 "Interactions" 轨道（2024 新加的）直接显示 INP 事件

## 小结

性能优化最忌讳的是拍脑袋。**先测，再优**。Lighthouse 跑一遍看哪个指标掉了，针对那个指标查清单，别上来就堆 preload。
