# Git 设置与提交指南

## 初始化仓库并提交文件的步骤

1. **检查 Git 状态**
   ```bash
   git status
   ```
   这会显示当前工作区的状态。如果显示"无文件要提交"但您有新文件，说明它们尚未被 Git 跟踪。

2. **将文件添加到跟踪列表**
   ```bash
   git add .  # 添加所有文件
   # 或者选择性添加
   git add README1.md
   git add [其他文件名]
   ```

3. **再次检查状态**
   ```bash
   git status
   ```
   现在应该会显示准备提交的文件列表。

4. **提交文件**
   ```bash
   git commit -m "初始提交：添加游戏基础文件"
   ```

5. **关联远程仓库**（如果尚未关联）
   ```bash
   git remote add origin https://github.com/你的用户名/fly_game.git
   ```

6. **推送到远程仓库**
   ```bash
   git push -u origin main
   ```

## 常见问题解决

- **仓库未初始化**：如果您刚创建了目录但未初始化 Git 仓库，请运行：
  ```bash
  git init
  ```

- **文件被忽略**：检查项目目录中是否有 `.gitignore` 文件，确认您的文件没有被忽略。

- **分支名称不匹配**：确认本地分支名称与远程分支一致，通常是 `main` 或 `master`。
  ```bash
  # 查看当前分支
  git branch
  
  # 如果需要重命名分支
  git branch -M main
  ```

- **预先存在的远程文件**：如果远程仓库有您本地没有的文件，先获取并合并：
  ```bash
  git pull origin main --allow-unrelated-histories
  ```
