const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 创建Express应用和HTTP服务器
const app = express();
const server = http.createServer(app);
// 明确指定 WebSocket 服务器路径为 /ws
const wss = new WebSocket.Server({ 
    server: server,
    path: '/ws'  // 明确定义WebSocket路径
});

// 设置静态文件目录
app.use(express.static(__dirname));

// 存储所有连接的玩家
const players = new Map();

// WebSocket处理
wss.on('connection', (ws, req) => {
    // 记录客户端连接信息
    console.log(`新的WebSocket连接: ${req.socket.remoteAddress}, 路径: ${req.url}`);
    
    // 为玩家分配唯一ID
    const playerId = uuidv4().slice(0, 8);
    
    // 存储玩家信息
    players.set(playerId, {
        id: playerId,
        ws,
        position: { 
            x: Math.random() * 20 - 10, // 随机初始位置
            y: 5,
            z: Math.random() * 20 - 10
        },
        rotation: { y: 0 },
        health: 100,
        lastActive: Date.now()
    });
    
    console.log(`玩家 ${playerId} 已连接，当前在线玩家: ${players.size}`);
    
    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        playerId
    }));
    
    // 立即广播新玩家加入
    broadcastPlayerList();
    
    // 接收玩家消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log(`收到来自玩家 ${playerId} 的消息:`, data.type);
            
            if (data.type === 'playerUpdate' && players.has(playerId)) {
                // 更新玩家信息
                const player = players.get(playerId);
                player.position = data.data.position || player.position;
                player.rotation = data.data.rotation || player.rotation;
                player.health = data.data.health || player.health;
                player.lastActive = Date.now();
                
                // 广播玩家位置更新
                broadcastPlayerUpdate(playerId, data.data);
            }
            // 处理玩家伤害消息
            else if (data.type === 'playerDamage' && data.targetId) {
                console.log(`玩家 ${playerId} 对玩家 ${data.targetId} 造成伤害: ${data.damage}`);
                
                // 确保目标玩家存在
                if (players.has(data.targetId)) {
                    const targetPlayer = players.get(data.targetId);
                    
                    // 更新目标玩家的健康值
                    const oldHealth = targetPlayer.health || 100;
                    targetPlayer.health = Math.max(0, oldHealth - data.damage);
                    
                    console.log(`玩家 ${data.targetId} 的健康值: ${oldHealth} -> ${targetPlayer.health}`);
                    
                    // 通知被击中的玩家
                    if (targetPlayer.ws.readyState === WebSocket.OPEN) {
                        targetPlayer.ws.send(JSON.stringify({
                            type: 'damageReceived',
                            fromId: playerId,
                            damage: data.damage,
                            newHealth: targetPlayer.health,
                            damageType: data.damageType || 'bullet'
                        }));
                        
                        console.log(`已通知玩家 ${data.targetId} 受到来自 ${playerId} 的伤害`);
                    }
                    
                    // 向其他所有玩家广播这个玩家的健康值更新
                    broadcastPlayerUpdate(data.targetId, {
                        health: targetPlayer.health
                    });
                } else {
                    console.log(`目标玩家 ${data.targetId} 不存在`);
                }
            }
            // 处理玩家动作
            else if (data.type === 'playerAction') {
                console.log(`玩家 ${playerId} 执行动作: ${data.action}`);
                
                // 广播这个动作给所有其他玩家
                const actionMessage = JSON.stringify({
                    type: 'playerAction',
                    playerId: playerId,
                    action: data.action,
                    position: data.position,
                    direction: data.direction,
                    timestamp: Date.now()
                });
                
                // 发送给所有其他玩家
                players.forEach((player, id) => {
                    if (id !== playerId && player.ws.readyState === WebSocket.OPEN) {
                        player.ws.send(actionMessage);
                    }
                });
            }
        } catch (error) {
            console.error('处理消息出错:', error);
        }
    });
    
    // 处理断开连接
    ws.on('close', (code, reason) => {
        console.log(`玩家 ${playerId} 断开连接，代码: ${code}, 原因: ${reason || '未指定'}`);
        players.delete(playerId);
        broadcastPlayerList();
    });
    
    // 处理错误
    ws.on('error', (error) => {
        console.error(`玩家 ${playerId} 连接错误:`, error);
    });
});

// 广播所有玩家列表 - 添加更多日志
function broadcastPlayerList() {
    const playerList = Array.from(players.values()).map(player => ({
        id: player.id,
        position: player.position,
        rotation: player.rotation,
        health: player.health
    }));
    
    const message = JSON.stringify({
        type: 'players',
        players: playerList,
        onlineCount: players.size // 添加在线人数统计
    });
    
    console.log(`广播玩家列表，当前在线: ${players.size}人，玩家IDs:`, 
        playerList.map(p => p.id).join(', '));
    
    players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    });
    
    // 每次有玩家加入或离开时，记录到控制台
    console.log(`当前在线玩家数: ${players.size}`);
}

// 广播单个玩家更新
function broadcastPlayerUpdate(playerId, data) {
    const message = JSON.stringify({
        type: 'playerUpdate',
        playerId,
        data
    });
    
    players.forEach(player => {
        if (player.id !== playerId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    });
}

// 广播玩家动作
function broadcastPlayerAction(playerId, data) {
    const message = JSON.stringify({
        type: 'playerAction',
        playerId: playerId,
        action: data.action,
        position: data.position,
        direction: data.direction,
        timestamp: Date.now()
    });
    
    players.forEach(player => {
        if (player.id !== playerId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    });
}

// 广播游戏事件
function broadcastGameEvent(event) {
    const message = JSON.stringify({
        type: 'gameEvent',
        event: event,
        timestamp: Date.now()
    });
    
    players.forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(message);
        }
    });
}

// 检测不活跃的玩家
setInterval(() => {
    const now = Date.now();
    players.forEach((player, id) => {
        if (now - player.lastActive > 30000) { // 30秒无活动
            console.log(`玩家 ${id} 超时断开连接`);
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.close();
            }
            players.delete(id);
        }
    });
    
    if (players.size > 0) {
        broadcastPlayerList();
    }
}, 10000); // 每10秒检查一次

// 添加一个每分钟广播在线人数的函数
setInterval(() => {
    if (players.size > 0) {
        const statsMessage = JSON.stringify({
            type: 'stats',
            onlineCount: players.size,
            timestamp: new Date().toISOString()
        });
        
        players.forEach(player => {
            if (player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(statsMessage);
            }
        });
    }
}, 60000); // 每分钟更新一次统计

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║  无人机战斗模拟器多人游戏服务器已启动!                   ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  - 本地访问: http://localhost:${PORT}                       ║
║  - WebSocket路径: ws://localhost:${PORT}/ws                 ║
║                                                           ║
║  要让其他玩家加入，请将你的公网IP/域名分享给他们          ║
║                                                           ║
║  推荐同时在线人数: 20-30人 (取决于服务器性能)             ║
║                                                           ╚═══════════════════════════════════════════════════════════╝`);
});
