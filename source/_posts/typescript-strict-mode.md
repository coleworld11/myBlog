---
title: TypeScript strict 模式下的几个常见绊脚石
date: 2026-04-12 09:15:00
categories: [前端]
tags: [TypeScript, 工程实践]
---

新项目第一天我就会把 `tsconfig.json` 里的 `strict: true` 打开。代价是前两周会被编译器怼到怀疑人生，但半年后你会感谢过去的自己。

<!-- more -->

## strict 到底开了哪些开关

`strict: true` 其实是一组复合开关：

- `strictNullChecks` — null 和 undefined 不再能随便塞到其它类型里
- `strictFunctionTypes` — 函数参数逆变检查
- `strictBindCallApply` — `bind/call/apply` 参数类型校验
- `strictPropertyInitialization` — class 字段必须初始化或显式 `!`
- `noImplicitAny` — 没法偷懒写 any
- `noImplicitThis` — this 类型要明确
- `alwaysStrict` — 文件默认 `"use strict"`

## 第一个坑：对象字面量里的 undefined

```ts
interface User {
  name: string;
  age?: number;
}

const u: User = { name: 'Mz', age: undefined };
```

这段在 strict 下会报错。可选属性 `age?: number` 的类型是 `number | undefined`，但直接写 `age: undefined` 还是被拒绝。原因是 `exactOptionalPropertyTypes`（strict 的隐式朋友）认为「可选」和「值为 undefined」是两回事。

解决：要么省略 age 字段，要么改成 `age?: number | undefined` 显式允许。

## 第二个坑：数组解构默认值

```ts
const arr: string[] = [];
const [first = 'default'] = arr;  // first 推断为 string
```

看起来合理，但如果数组类型是 `(string | undefined)[]`，默认值只在索引 **不存在**时生效，不会处理元素本身是 undefined 的情况。实战里很容易翻车。

## 第三个坑：可选链之后的类型收窄

```ts
if (user?.profile) {
  console.log(user.name);  // 这里 user 仍可能是 undefined?
}
```

在较老版本的 TS 里，`user?.profile` 的真值分支不会把 `user` 本身收窄为非空。升级到 4.4+ 后修了这个行为。卡版本的项目先 `pnpm update typescript`。

## 建议

- 新项目直接 `strict: true` + `noUncheckedIndexedAccess: true`
- 老项目渐进式：先开 `noImplicitAny`，跑通了再开 `strictNullChecks`
- 不要用 `// @ts-ignore`，改成 `// @ts-expect-error`，错误消失时编译器会提醒你删注释

严格模式的痛是一次性的，类型系统给你的保护是永久的。
