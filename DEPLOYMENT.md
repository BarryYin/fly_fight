# 部署指南

## 本地部署（局域网内共享）

1. 确保安装了Node.js (v14+)
2. 安装必要的依赖:
   ```bash
   npm install
   ```
3. 启动本地服务器:
   ```bash
   npm start
   ```
4. 让局域网内的朋友通过服务器显示的IP地址访问
   (例如 http://192.168.1.100:3000)

## 使用ngrok进行临时互联网共享

1. 安装依赖:
   ```bash
   npm install
   npm install -g ngrok
   ```
2. 启动游戏服务器:
   ```bash
   npm start
   ```
3. 在新终端中，创建公网通道:
   ```bash
   ngrok http 3000
   ```
4. 分享ngrok生成的链接给朋友
   (例如 https://1a2b3c4d.ngrok.io)

## 部署到Vercel（免费云托管）

1. 安装Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. 登录Vercel:
   ```bash
   vercel login
   ```
3. 部署项目:
   ```bash
   vercel
   ```
4. 回答Vercel提出的问题，完成部署
5. 分享Vercel提供的URL给朋友

## 使用多人游戏服务器

如果你想让其他玩家能在同一游戏世界中看到彼此:

1. 启动多人游戏服务器:
   ```bash
   npm run multiplayer
   ```
2. 分享URL给朋友

## 在云服务器上部署多人服务器

如果你有自己的云服务器 (如AWS, DigitalOcean等):

1. SSH连接到你的服务器
2. 安装Git和Node.js
3. 克隆仓库:
   ```bash
   git clone <你的仓库URL>
   cd fly_game
   ```
4. 安装依赖:
   ```bash
   npm install
   ```
5. 启动多人服务器:
   ```bash
   node server_multiplayer.js
   ```
6. 使用PM2等工具保持服务器运行:
   ```bash
   npm install -g pm2
   pm2 start server_multiplayer.js
   ```
7. 确保服务器防火墙允许3000端口访问
