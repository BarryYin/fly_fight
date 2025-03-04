# Git合并无关历史解决方案

## 问题描述

当执行以下命令时出现错误：
```
git fetch https://github.com/BarryYin/fly_fight
 * branch            main       -> FETCH_HEAD
致命错误：拒绝合并无关的历史
```

## 解决方法

使用`--allow-unrelated-histories`参数来允许Git合并没有共同祖先的分支：

```bash
# 如果你正在执行pull操作
git pull origin main --allow-unrelated-histories

# 如果你正在执行merge操作
git merge FETCH_HEAD --allow-unrelated-histories
```

## 执行步骤

1. 确保你已经获取了远程仓库的引用：
   ```bash
   git fetch https://github.com/BarryYin/fly_fight
   ```

2. 执行合并操作，添加允许无关历史的参数：
   ```bash
   git merge FETCH_HEAD --allow-unrelated-histories
   ```

3. 解决可能出现的任何合并冲突

4. 提交合并结果：
   ```bash
   git commit -m "合并来自BarryYin/fly_fight的代码"
   ```

## 注意事项

使用`--allow-unrelated-histories`参数合并无关历史时需小心，确保你理解两个仓库的内容，以避免不必要的文件覆盖或冲突。
