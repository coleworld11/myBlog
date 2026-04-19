---
title: git rebase 生存指南（仅限本地分支）
date: 2026-02-20 11:00:00
categories: [工具]
tags: [Git, 工作流]
---

rebase 不是洪水猛兽，关键是分清「它在本地」还是「已经推到远端」。

## 铁律

> Never rebase a branch that other people have pulled.

只在**本地**、**尚未 push** 或 **仅自己在用的远端分支**上 rebase。如果队友可能已经 pull 了你的提交，改用 `merge`。

## 最常用的三个操作

**压扁提交**（准备 PR 前清理）：

```bash
git rebase -i HEAD~5   # 打开最近 5 个提交的交互界面
# 把除了第一个以外的 pick 改成 s（squash）
```

**跟上 main**（feature 分支同步主干）：

```bash
git fetch origin
git rebase origin/main
# 遇到冲突：解决文件 → git add → git rebase --continue
```

**放弃 rebase**：

```bash
git rebase --abort
```

当场回到 rebase 开始之前的状态，安全撤退。

## 救命护栏

设全局开启 `reflog`（默认就开）+ 开自动 stash：

```bash
git config --global rebase.autostash true
```

rebase 前 git 会自动把未提交改动 stash，结束后恢复。少一次「我改了一半就开始 rebase」的灾难。

任何 rebase 事故都可以通过 `git reflog` 找到 rebase 前的 HEAD 然后 `git reset --hard <SHA>` 恢复。只要提交过的东西在 reflog 保留期内（默认 90 天）都救得回来。
