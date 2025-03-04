import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';

// 创建Express应用
const app = express();
const port = 8080;

// 设置静态文件服务
app.use(express.static(path.join(__dirname, '../public')));

// 创建HTTP服务器
const server = createServer(app);

// 创建WebSocket服务器并指定正确的路径
const wss = new WebSocketServer({ 
  server,
  path: '/ws'  // 指定WebSocket的路径
});

wss.on('connection', (ws: WebSocket) => {
  console.log('新的客户端连接');

  // 发送初始消息
  ws.send(JSON.stringify({ type: 'welcome', message: '连接成功' }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      // 广播位置数据给所有其他客户端
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });

  ws.on('close', () => {
    console.log('客户端断开连接');
  });
});

// 启动服务器
server.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
});
