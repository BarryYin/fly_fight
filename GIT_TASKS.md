# Git操作步骤

## 1. 检查本地分支

使用以下命令查看本地分支：

```bash
git branch
```

这将列出你本地的所有分支。当前分支会被标记为 `*` 符号。确认是否只有 `main` 分支。

## 2. 测试与远程仓库的连接

首先，确认你已经添加了远程仓库。如果没有，你需要添加它。假设远程仓库名为 `origin`，地址为 `your_remote_repository_url`。

```bash
git remote -v
```

如果没有任何输出，或者 `origin` 指向的不是正确的仓库，你需要添加或修改远程仓库：

```bash
git remote add origin your_remote_repository_url  # 添加远程仓库
git remote set-url origin your_remote_repository_url # 修改远程仓库URL
```

然后，测试连接：

```bash
git fetch origin
```

如果成功，这会从远程仓库下载最新的分支和提交信息，但不会自动合并到你的本地分支。

## 3. 推送本地内容到远程仓库

首先，确保你的本地 `main` 分支是最新的，并且包含了你想要推送的所有更改。如果需要，先合并远程 `main` 分支到你的本地 `main` 分支：

```bash
git pull origin main --allow-unrelated-histories # 如果需要处理无关历史
```

解决可能出现的合并冲突。

然后，推送你的本地 `main` 分支到远程 `origin` 仓库：

```bash
git push origin main
```

这将把你的本地 `main` 分支上的所有提交推送到远程仓库。

## 注意事项

- 替换 `your_remote_repository_url` 为你实际的远程仓库URL。
- 在执行 `git push` 之前，务必先执行 `git pull`，以避免推送冲突。
- 如果在 `git pull` 过程中遇到冲突，需要手动解决冲突，然后提交解决后的更改。
