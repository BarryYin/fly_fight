#!/bin/bash
echo "启动游戏服务器..."
node server.js &
SERVER_PID=$!

echo "等待服务器启动..."
sleep 2

echo "创建公网访问通道..."
npx ngrok http 3000

# 当ngrok被关闭时，也关闭服务器
kill $SERVER_PID
echo "服务器已关闭"
