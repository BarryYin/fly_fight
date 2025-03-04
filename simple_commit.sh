#!/bin/bash

echo "===== 简易提交助手 ====="

# 检查当前分支
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $CURRENT_BRANCH"

# 如果不在main分支，提示切换
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "警告: 您当前不在主分支上"
    read -p "是否切换到main分支? (y/n): " SWITCH
    if [ "$SWITCH" = "y" ]; then
        # 尝试切换到main
        if git show-ref --verify --quiet refs/heads/main; then
            git checkout main
            CURRENT_BRANCH="main"
        else
            # 如果main不存在，尝试master
            if git show-ref --verify --quiet refs/heads/master; then
                git checkout master
                CURRENT_BRANCH="master"
            else
                echo "错误: 找不到main或master分支"
                exit 1
            fi
        fi
        echo "已切换到 $CURRENT_BRANCH 分支"
    fi
fi

# 显示当前状态
git status -s

echo
echo "选择操作:"
echo "1) 添加所有更改并提交"
echo "2) 选择性添加文件并提交"
echo "3) 仅提交已暂存的更改"
read -p "您的选择 (1-3): " CHOICE

case $CHOICE in
    1)
        # 添加所有更改
        git add -A
        echo "已添加所有更改"
        ;;
    2)
        # 选择性添加
        echo "请输入要添加的文件(用空格分隔):"
        read -e FILES
        for FILE in $FILES; do
            if [ -e "$FILE" ]; then
                git add "$FILE"
                echo "已添加: $FILE"
            else
                echo "警告: 找不到文件 $FILE"
            fi
        done
        ;;
    3)
        echo "使用已暂存的更改"
        ;;
    *)
        echo "无效选择，退出"
        exit 1
        ;;
esac

# 提交信息
read -p "输入提交信息: " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="更新提交 $(date +"%Y-%m-%d %H:%M")"
fi

# 提交
git commit -m "$COMMIT_MSG"

# 询问是否推送
read -p "是否推送到远程仓库? (y/n): " PUSH
if [ "$PUSH" = "y" ]; then
    git push origin $CURRENT_BRANCH
    echo "已推送到远程 origin/$CURRENT_BRANCH"
fi

echo "操作完成!"
