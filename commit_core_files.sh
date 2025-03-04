#!/bin/bash

# 确保脚本在正确的分支上运行
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" = "HEAD" ]; then
    echo "错误: 您当前处于分离头指针状态，请先运行 fix_detached_head.sh"
    exit 1
fi

# 定义核心文件列表
CORE_FILES=(
    "README1.md"
    ".gitignore"
    # 添加其他核心文件
)

# 添加并提交核心文件
echo "正在提交核心文件..."
for file in "${CORE_FILES[@]}"; do
    if [ -f "$file" ]; then
        git add "$file"
        echo "已添加: $file"
    else
        echo "警告: 未找到核心文件 $file"
    fi
done

# 提交变更
git commit -m "更新核心文件"
echo "核心文件已提交!"
