#!/bin/bash

echo "===== 变基中止与恢复脚本 ====="
echo "此脚本将帮助您中止当前的变基操作并回到main分支"

# 检查是否在变基过程中
if [ -d ".git/rebase-merge" ] || [ -d ".git/rebase-apply" ]; then
    echo "检测到正在进行变基操作"
    
    # 保存当前工作区更改(如果有)
    if ! git diff --quiet; then
        echo "检测到未提交的更改，正在储藏..."
        git stash save "变基中止前的自动储藏"
        STASHED=1
    fi
    
    # 中止变基
    echo "正在中止变基操作..."
    git rebase --abort
    
    if [ $? -eq 0 ]; then
        echo "变基操作已成功中止"
    else
        echo "变基中止失败，请手动执行 'git rebase --abort'"
        exit 1
    fi
else
    echo "未检测到变基操作，跳过中止步骤"
fi

# 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $CURRENT_BRANCH"

# 切换到main分支
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "正在切换到main分支..."
    
    # 检查main分支是否存在
    if git show-ref --verify --quiet refs/heads/main; then
        git checkout main
        if [ $? -eq 0 ]; then
            echo "已成功切换到main分支"
        else
            echo "无法切换到main分支，请检查是否有未提交的更改"
            exit 1
        fi
    else
        echo "main分支不存在，尝试master分支..."
        
        if git show-ref --verify --quiet refs/heads/master; then
            git checkout master
            echo "已切换到master分支"
        else
            echo "既找不到main也找不到master分支，请确认您的主分支名称"
            exit 1
        fi
    fi
else
    echo "已经在main分支上"
fi

# 恢复储藏(如果之前有储藏)
if [ "$STASHED" = "1" ]; then
    echo "正在恢复之前储藏的更改..."
    git stash pop
    if [ $? -eq 0 ]; then
        echo "更改已恢复"
    else
        echo "恢复储藏遇到冲突，请手动解决"
    fi
fi

echo 
echo "===== 恢复完成 ====="
echo "现在您可以正常提交到main分支:"
echo "1. 添加文件: git add <文件名>"
echo "2. 提交更改: git commit -m \"提交信息\""
echo "3. 推送到远程: git push origin main"
