# 无人机战斗模拟器

一个基于Three.js的多人无人机战斗模拟游戏。

## 游戏特点

- 3D第一人称/第三人称视角切换
- 流畅的无人机飞行控制
- 多个AI敌机
- 炫酷的爆炸和粒子效果
- 生命值和击落统计系统
- 迷你地图导航

## 游戏操控

- **上下左右方向键**: 控制无人机前进、后退、左转、右转
- **A和D键**: 无人机左右平移
- **W和S键**: 控制无人机上升和下降
- **空格键**: 发射武器
- **V键**: 切换第一/第三人称视角
- **鼠标**: 控制无人机视角

## 游戏目标

击落尽可能多的敌方无人机，同时避免被击落。

## 本地运行

1. 确保已安装Node.js (版本14或更高)
2. 克隆此仓库
3. 安装依赖：
   ```bash
   npm install
   ```
4. 启动服务器：
   ```bash
   npm start
   ```
5. 打开浏览器访问：`http://localhost:3000`

## 多人游戏方法

要让多个人访问你的游戏，有几种方法：

### 1. 局域网访问

如果玩家在同一网络中，启动服务器后，其他人可以通过你的IP地址访问：
1. 找到你的IP地址 (`ipconfig` 在Windows或 `ifconfig` 在Mac/Linux)
2. 其他玩家可以通过浏览器访问 `http://你的IP地址:3000`

### 2. 使用ngrok进行临时公网访问

1. 安装ngrok: https://ngrok.com/download
2. 运行你的游戏服务器 (`npm start`)
3. 在另一个终端窗口运行ngrok:
   ```bash
   ngrok http 3000
   ```
4. 分享ngrok提供的URL给你的朋友

### 3. 部署到服务器

#### 使用GitHub Pages部署

1. 在GitHub上创建一个仓库
2. 将代码推送到仓库
3. 在仓库设置中启用GitHub Pages
4. 选择主分支作为源
5. 访问`https://{你的用户名}.github.io/{仓库名}`

#### 使用Vercel或Netlify部署

1. 在Vercel或Netlify上创建账号
2. 连接你的GitHub仓库
3. 按照提示完成部署

## 部署指南

### Vercel 部署

Vercel 是一个优秀的静态网站和无服务器函数托管平台，但有一些限制，尤其是对于 WebSocket 长连接。

#### 步骤 1: 准备项目

确保项目结构包含：
- `/api/index.js` - API入口点
- `vercel.json` - Vercel 配置文件
- 使用适合Vercel的多人游戏客户端 (`js/multiplayer-client.js`)

#### 步骤 2: 部署到 Vercel

1. 安装 Vercel CLI:
```bash
npm i -g vercel
```

2. 登录 Vercel:
```bash
vercel login
```

3. 部署项目:
```bash
vercel
```

4. 按照提示操作，完成部署。

### 解决 WebSocket 限制

由于 Vercel 不支持持久的 WebSocket 连接，以下是几种替代方案：

#### 方案 1: 使用 Firebase Realtime Database

1. 创建 Firebase 项目
2. 在 `js/multiplayer-client.js` 中实现 Firebase 集成
3. 更新客户端代码使用 Firebase 进行实时通信

#### 方案 2: 使用 Pusher

1. 创建 Pusher 账号和应用
2. 添加 Pusher 客户端库
3. 实现 Pusher 事件处理

#### 方案 3: 独立部署 WebSocket 服务器

将 WebSocket 服务器部署到支持长连接的平台：

1. **Heroku** - 部署命令:
```bash
heroku create
git push heroku main
```

2. **Railway** - 简单注册并连接 GitHub 仓库

3. **AWS EC2** - 提供完全控制的服务器环境

## 本地开发

1. 安装依赖:
```bash
npm install
```

2. 启动 WebSocket 服务器:
```bash
node server_multiplayer.js
```

3. 在另一个终端启动前端服务:
```bash
npx http-server
```

4. 打开浏览器访问 `http://localhost:8080`

## 技术栈

- Three.js - 3D 渲染
- WebSockets - 实时通信 (本地开发)
- Firebase/Pusher - 生产环境实时通信替代方案
- Express - API 服务器
- Vercel - 部署平台

## 浏览器兼容性

- 推荐使用最新版的Chrome或Firefox
- 需要WebGL支持
- 可能需要允许浏览器访问鼠标指针锁定功能

## 问题排查

- **Three.js库未找到?** 运行 `npm run download-threejs` 或手动下载到 `/js/lib/` 目录
- **无法加载游戏?** 检查浏览器控制台错误信息
- **游戏性能不佳?** 尝试减少敌机数量或关闭某些视觉效果

## 许可

MIT License


