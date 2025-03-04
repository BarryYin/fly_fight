const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// 中间件：请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 设置静态文件目录
app.use(express.static(__dirname));

// 添加路径日志中间件，以便更好地调试
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] 请求: ${req.method} ${req.url}`);
    next();
});

// 检查Three.js库是否存在
app.use((req, res, next) => {
    const threejsPath = path.join(__dirname, 'js', 'lib', 'three.min.js');
    if (req.path === '/' && !fs.existsSync(threejsPath)) {
        // 如果库不存在，重定向到下载页面
        return res.redirect('/download_threejs.html');
    }
    next();
});

// 定义路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 添加测试路由
app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test.html'));
});

// 存储所有连接的客户端及其位置
const clients = new Map();
let nextId = 1;

wss.on('connection', (ws) => {
    const id = nextId++;
    console.log(`客户端 ${id} 已连接`);
    
    // 存储新客户端
    clients.set(ws, {
        id,
        x: 400, // 初始位置在中央
        y: 300
    });
    
    // 当收到客户端消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const clientData = clients.get(ws);
            
            // 更新客户端位置
            if (clientData && data.x !== undefined && data.y !== undefined) {
                clientData.x = data.x;
                clientData.y = data.y;
                
                // 广播所有客户端的位置
                broadcastPositions();
            }
        } catch (e) {
            console.error('消息处理错误:', e);
        }
    });
    
    // 客户端断开连接
    ws.on('close', () => {
        console.log(`客户端 ${id} 已断开连接`);
        clients.delete(ws);
        broadcastPositions();
    });
    
    // 发送当前所有位置给新连接的客户端
    broadcastPositions();
});

// 广播所有客户端位置
function broadcastPositions() {
    const positions = {};
    
    // 收集所有客户端位置
    for (const [client, data] of clients.entries()) {
        positions[data.id] = {
            x: data.x,
            y: data.y
        };
    }
    
    // 发送给所有客户端
    const message = JSON.stringify(positions);
    for (const client of clients.keys()) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

server.listen(PORT, '0.0.0.0', () => {
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
        for (const interface of interfaces[name]) {
            // 跳过非IPv4和内部地址
            if (interface.family === 'IPv4' && !interface.internal) {
                addresses.push(interface.address);
            }
        }
    }
    
    console.log(`
╔═══════════════════════════════════════════════════╗
║  无人机战斗模拟器服务器已启动!                    ║
╠═══════════════════════════════════════════════════╣
║                                                   ║
║  - 本机访问: http://localhost:${PORT}               ║
║                                                   ║
║  - 局域网访问地址:                                ║`);
    
    addresses.forEach(addr => {
        console.log(`║    http://${addr}:${PORT}`);
    });
    
    console.log(`║                                                   ║
║  让其他玩家在浏览器中输入以上地址进入游戏         ║
║                                                   ║
╚═══════════════════════════════════════════════════╝`);
});

// 错误处理
app.use((err, req, res, next) => {
    console.error(`服务器错误: ${err.message}`);
    res.status(500).send('服务器内部错误，请查看控制台日志');
});

// 添加错误处理中间件
app.use((err, req, res, next) => {
    console.error(`服务器错误: ${err.stack}`);
    res.status(500).send('服务器内部错误');
});
