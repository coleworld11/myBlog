---
title: Windows 中文用户名下 GitHub SSH 多账号排障笔记
date: 2026-06-08 15:30:00
categories: [工具]
tags: [Git, SSH, GitHub, Windows]
---

## 这次解决的问题

这次排查的起点是：Windows 用户名包含中文，在使用 GitHub SSH 仓库时偶尔出现找不到密钥、认证失败等问题。后来问题进一步扩展为：本机有多个 GitHub 账号和多把 SSH key，大号能认证成功，小号 clone 仓库时却提示：

```text
git@github.com: Permission denied (publickey).
fatal: Could not read from remote repository.
```

最终结论是：中文用户目录确实容易让部分 Git/SSH/IDE 组合处理路径不稳定，但这次小号失败的直接原因不是 `known_hosts`，也不是 `HostName github.com`，而是小号 GitHub 账号里登记的公钥和本地正在使用的小号私钥不匹配。重新把当前 `.pub` 公钥添加到小号 GitHub 后，认证恢复正常。

## 最终推荐方案

在 Windows 中文用户名环境下，最稳妥的方案是把 SSH key、SSH config 和 known_hosts 都放到纯英文路径，例如：

```text
E:\ssh\.ssh
```

然后让 Git 固定使用 Windows 自带的 OpenSSH 和这份 SSH config：

```powershell
git config --global core.sshCommand "C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config"
```

这样 `git clone`、`git pull`、`git push` 都会走固定的英文路径配置，而不是继续依赖 `C:\Users\中文用户名\.ssh`。

<!-- more -->

## 一、先把路径问题和 Git 配置固定下来

最开始的风险点是 Windows 用户目录包含中文，SSH 默认会从类似下面的路径找配置和密钥：

```text
C:\Users\中文用户名\.ssh
```

如果终端、Git、OpenSSH 或 IDE 中某个环节对路径编码处理不一致，就可能出现偶发找不到文件、路径显示乱码、配置没有被读取等问题。更稳的做法是把 SSH 相关文件统一迁移到纯英文路径。

推荐结构：

```text
E:\ssh\.ssh\config
E:\ssh\.ssh\known_hosts
E:\ssh\.ssh\github_main_ed25519
E:\ssh\.ssh\github_main_ed25519.pub
E:\ssh\.ssh\github_small_ed25519
E:\ssh\.ssh\github_small_ed25519.pub
```

检查 Git 是否已经指定 SSH 命令：

```powershell
git config --show-origin --get-all core.sshCommand
```

如果没有输出，说明 Git 还没有固定使用指定 SSH config。设置后应能看到类似：

```text
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config
```

## 二、多 GitHub 账号时，`Host` 才是本机区分账号的关键

GitHub 页面上复制出来的 SSH 地址通常长这样：

```text
git@github.com:username/repo.git
```

这里各部分含义是：

```text
git                GitHub SSH 固定登录用户，不是 GitHub 用户名
github.com         SSH 要连接的真实主机
username/repo      仓库拥有者/仓库名
```

问题在于，GitHub 页面只知道真实主机是 `github.com`，它不知道本机 SSH config 里为不同账号设置了哪些别名。多账号场景下，不能让所有仓库都使用 `git@github.com:...`，否则它只会命中 `Host github.com` 或默认配置，很容易走到大号 key。

正确做法是在 `E:\ssh\.ssh\config` 里给账号设置不同的 `Host` 别名：

```sshconfig
Host github-main
  HostName github.com
  User git
  IdentityFile E:/ssh/.ssh/github_main_ed25519
  IdentitiesOnly yes
  PubkeyAuthentication yes
  PreferredAuthentications publickey
  UserKnownHostsFile E:/ssh/.ssh/known_hosts

Host github-small
  HostName github.com
  User git
  IdentityFile E:/ssh/.ssh/github_small_ed25519
  IdentitiesOnly yes
  PubkeyAuthentication yes
  PreferredAuthentications publickey
  UserKnownHostsFile E:/ssh/.ssh/known_hosts
```

然后小号仓库 clone 地址要把 `github.com` 替换成本机配置里的小号 `Host`：

```powershell
git clone git@github-small:username/repo.git
```

不要直接使用：

```powershell
git clone git@github.com:earendil-works/pi.git
```

`HostName github.com` 保持一样是正常的，因为真实连接的服务器都是 GitHub。真正决定使用哪把 key 的，是命令或 remote URL 里的 `Host` 别名。

## 三、用 `ssh -G` 确认最终配置是否命中

排查多账号 SSH 时，第一步不要直接猜 config，而是看 OpenSSH 最终解析出的配置：

```powershell
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config -G github-small | Select-String "user|hostname|identityfile|identitiesonly|userknownhostsfile|pubkeyauthentication"
```

理想输出应类似：

```text
user git
hostname github.com
pubkeyauthentication true
identityfile E:/ssh/.ssh/github_small_ed25519
identitiesonly yes
userknownhostsfile E:/ssh/.ssh/known_hosts
```

这一步能确认：

- `Host` 是否匹配到了小号配置。
- `IdentityFile` 是否是小号私钥。
- 是否还在使用 `~/.ssh/...` 这种会回到中文用户目录的路径。
- `UserKnownHostsFile` 是否已经转移到英文路径。

如果 `identityfile` 仍然显示大号 key，要检查 config 中是否有通用规则干扰，例如：

```sshconfig
Host *
  IdentityFile E:/ssh/.ssh/github_main_ed25519
```

通用的 `Host *` 应放在后面，并且不应该写死某个账号的私钥。

## 四、`known_hosts` 不决定账号身份

排查中会看到类似输出：

```text
userknownhostsfile E:/ssh/.ssh/known_hosts
```

也可能在调试日志中看到系统级 known_hosts 不存在：

```text
load_hostkeys: fopen __PROGRAMDATA__\ssh/ssh_known_hosts: No such file or directory
```

这些通常不是导致 GitHub 账号错乱的原因。`known_hosts` 记录的是远程主机指纹，用来确认连接的服务器是不是可信的 `github.com`。它不保存 GitHub 账号身份，也不决定使用大号还是小号。

账号身份由下面这个配置决定：

```sshconfig
IdentityFile E:/ssh/.ssh/github_small_ed25519
```

所以这次排查里，两个 `known_hosts` 文件并不是核心问题。指定 `UserKnownHostsFile E:/ssh/.ssh/known_hosts` 后，旧用户目录下的 `known_hosts` 可以暂时保留，不需要为了多账号认证专门删除。

## 五、私钥权限过宽会导致 SSH 直接忽略 key

排查大号时出现过下面的警告：

```text
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
```

这表示私钥文件权限太宽，Windows OpenSSH 出于安全原因直接忽略了这把 key。此时无论 config 写得多正确，认证都会失败。

推荐先修目录权限，再修私钥文件权限。由于 Windows 用户名包含中文，用 SID 授权更稳定。注意 `icacls` 使用 SID 时前面要加 `*`：

```powershell
$me = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value

icacls "E:\ssh" /grant:r "*${me}:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)"
icacls "E:\ssh\.ssh" /inheritance:r
icacls "E:\ssh\.ssh" /remove "Everyone" "Users" "Authenticated Users"
icacls "E:\ssh\.ssh" /grant:r "*${me}:(OI)(CI)(F)" "SYSTEM:(OI)(CI)(F)" "Administrators:(OI)(CI)(F)"
```

然后单独修私钥文件，注意是私钥文件，不是 `.pub`：

```powershell
icacls "E:\ssh\.ssh\github_main_ed25519" /inheritance:r
icacls "E:\ssh\.ssh\github_main_ed25519" /remove "Everyone" "Users" "Authenticated Users"
icacls "E:\ssh\.ssh\github_main_ed25519" /grant:r "*${me}:(R,W)" "SYSTEM:(F)" "Administrators:(F)"

icacls "E:\ssh\.ssh\github_small_ed25519" /inheritance:r
icacls "E:\ssh\.ssh\github_small_ed25519" /remove "Everyone" "Users" "Authenticated Users"
icacls "E:\ssh\.ssh\github_small_ed25519" /grant:r "*${me}:(R,W)" "SYSTEM:(F)" "Administrators:(F)"
```

这里有两个易错点：

- 不要给 `Everyone` 设置"拒绝"。Windows 的"拒绝"优先级很高，可能把当前用户也挡住。
- 如果执行 `/inheritance:r` 后还没成功给自己授权，可能会暂时失去访问权，需要用管理员 PowerShell 修回来。

## 六、用 `-vvvT` 看 SSH 是否真的提交了小号 key

当小号仍然报：

```text
git@github.com: Permission denied (publickey).
```

不要只看最后一行。需要用详细日志确认 SSH 有没有尝试小号 key：

```powershell
C:/Windows/System32/OpenSSH/ssh.exe -vvvT -F E:/ssh/.ssh/config github-small
```

关键日志包括：

```text
debug1: identity file E:/ssh/.ssh/github_small_ed25519 type 3
debug1: Offering public key: E:/ssh/.ssh/github_small_ed25519
debug1: Server accepts key: E:/ssh/.ssh/github_small_ed25519
```

判断方式：

- 出现 `identity file ... type 3`：说明 SSH 找到了这个私钥文件。
- 出现 `Offering public key`：说明 SSH 真的把这把 key 拿去尝试认证。
- 出现 `Server accepts key`：说明 GitHub 接受了这把 key。
- 只有 `Offering public key` 但没有 `Server accepts key`：说明 GitHub 不认识这把公钥，或者公钥加错账号。
- 连 `Offering public key` 都没有：优先检查 `IdentityFile` 路径、私钥权限、私钥格式或配置是否禁用了公钥认证。

这次排查中，小号配置最终能解析到正确私钥，但 GitHub 仍然拒绝，于是问题收束到"本地 key 和 GitHub 小号登记的 key 是否一致"。

## 七、用 SHA256 指纹确认本地 key 和 GitHub 是否匹配

本地可以分别查看私钥和公钥指纹：

```powershell
ssh-keygen -lf E:/ssh/.ssh/github_small_ed25519
ssh-keygen -lf E:/ssh/.ssh/github_small_ed25519.pub
```

如果它们是一对，两个命令输出的 `SHA256:...` 应完全一致。

然后去 GitHub 小号页面核对：

```text
GitHub -> Settings -> SSH and GPG keys
```

这次最终发现：本地私钥和 `.pub` 是一对，但它们的 SHA256 指纹和小号 GitHub SSH Keys 页面里的指纹不一样。也就是说，小号 GitHub 中登记的不是当前正在使用的这把本地 key。

修复方式是把当前 `.pub` 公钥重新添加到小号 GitHub。

查看公钥内容：

```powershell
Get-Content "E:\ssh\.ssh\github_small_ed25519.pub"
```

输出通常类似：

```text
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... your@email.com
```

只复制这一整行到 GitHub：

```text
GitHub 小号 -> Settings -> SSH and GPG keys -> New SSH key
Title: Windows E ssh small
Key type: Authentication Key
Key: 粘贴 .pub 文件的一整行内容
```

不要复制私钥内容。私钥第一行通常是：

```text
-----BEGIN OPENSSH PRIVATE KEY-----
```

这类内容绝不能上传或粘贴给任何人。

## 八、最终验证流程

添加小号公钥后，先测试 SSH 账号身份：

```powershell
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config -T github-main
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config -T github-small
```

成功时 GitHub 会返回：

```text
Hi 对应用户名! You've successfully authenticated...
```

注意：GitHub 不提供 SSH shell，所以调试日志里出现 `Exit status 1` 不一定代表认证失败。更重要的是有没有出现 `Hi 用户名! You've successfully authenticated...`。

小号测试成功后再 clone：

```powershell
git clone git@github-small:username/repo.git
```

如果 clone 仍失败，但 `ssh -T github-small` 已显示小号认证成功，就继续检查仓库权限：

- 仓库 owner/repo 是否写对。
- 小号是否有访问这个仓库的权限。
- remote URL 是否仍然误用了 `github.com` 或大号 `Host`。

## 快速排查清单

### 1. Git 是否使用了指定 SSH config

```powershell
git config --show-origin --get-all core.sshCommand
```

应包含：

```text
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config
```

### 2. 小号 Host 是否解析到小号私钥

```powershell
C:/Windows/System32/OpenSSH/ssh.exe -F E:/ssh/.ssh/config -G github-small | Select-String "user|hostname|identityfile|identitiesonly|userknownhostsfile"
```

应看到：

```text
identityfile E:/ssh/.ssh/github_small_ed25519
identitiesonly yes
```

### 3. 私钥权限是否过宽

如果看到：

```text
This private key will be ignored.
```

说明要修私钥权限。重点修私钥文件，不是 `.pub` 文件。

### 4. GitHub 是否接受了这把 key

```powershell
C:/Windows/System32/OpenSSH/ssh.exe -vvvT -F E:/ssh/.ssh/config github-small
```

重点找：

```text
Offering public key
Server accepts key
```

### 5. 本地公钥是否和 GitHub 登记一致

```powershell
ssh-keygen -lf E:/ssh/.ssh/github_small_ed25519.pub
```

把输出的 `SHA256:...` 和 GitHub 小号 SSH key 页面核对。

## 这次真正要记住什么

- Windows 中文用户名环境下，SSH key 和 config 放到纯英文路径更稳。
- `core.sshCommand` 可以让 Git 固定使用指定的 `ssh.exe` 和 config。
- 多个 GitHub 账号要用不同 `Host` 别名，clone 时也要用别名。
- `HostName github.com` 一样是正常的，`Host` 别名才是本地区分账号的入口。
- `known_hosts` 记录主机指纹，不决定 GitHub 账号身份。
- `Permission denied (publickey)` 要顺着 `IdentityFile`、私钥权限、`Offering public key`、GitHub 公钥指纹这条线排查。
- 私钥权限过宽时，OpenSSH 会直接忽略 key。
- 本地私钥和 `.pub` 是一对，不代表 GitHub 账号里已经登记了这把公钥。

## 后续建议

后续新增 GitHub 账号或迁移电脑时，可以直接按这个顺序操作：

1. 为每个 GitHub 账号生成独立 SSH key。
2. key 文件统一放在纯英文路径。
3. SSH config 中为每个账号配置独立 `Host`。
4. Git 全局设置 `core.sshCommand`。
5. 给私钥收紧权限。
6. 把对应 `.pub` 公钥添加到对应 GitHub 账号。
7. 用 `ssh -T Host别名` 验证账号身份。
8. clone 时把 `github.com` 替换成对应 `Host` 别名。
