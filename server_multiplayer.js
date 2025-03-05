const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 创建Express应用和HTTP服务器
const app = express();
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
                // 验证攻击目标不是自己
                if (data.targetId === playerId) {
                    console.log(`玩家 ${playerId} 试图攻击自己，已忽略`);
                    return;
                }
                
                console.log(`玩家 ${playerId} 对玩家 ${data.targetId} 造成伤害: ${data.damage}`);
                
                // 确保目标玩家存在
                if (players.has(data.targetId)) {
                    const targetPlayer = players.get(data.targetId);
                    const sourcePlayer = players.get(playerId);
                    
                    // 可选：检查攻击距离是否合理
                    if (data.validateDistance !== false) {
                        const dx = sourcePlayer.position.x - targetPlayer.position.x;
                        const dy = sourcePlayer.position.y - targetPlayer.position.y;
                        const dz = sourcePlayer.position.z - targetPlayer.position.z;
                        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
                        const maxAttackDistance = 50; // 根据游戏设定调整
                        
                        if (distance > maxAttackDistance) {
                            console.log(`玩家 ${playerId} 攻击距离过远(${distance.toFixed(2)}), 已忽略`);
                            return;
                        }
                        
                        console.log(`攻击有效: 距离=${distance.toFixed(2)}`);
                    }
                    
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
                            damageType: data.damageType || 'bullet',
                            position: data.hitPosition // 增加击中位置数据
                        }));
                        
                        console.log(`已通知玩家 ${data.targetId} 受到来自 ${playerId} 的伤害`);
                    }
                    
                    // 向所有玩家广播这次攻击事件
                    broadcastAttackEvent(playerId, data.targetId, {
                        damage: data.damage,
                        damageType: data.damageType || 'bullet',
                        hitPosition: data.hitPosition,
                        targetHealth: targetPlayer.health
                    });
                    
                    // 向其他所有玩家广播被击中玩家的健康值更新
                    broadcastPlayerUpdate(data.targetId, {
                        health: targetPlayer.health
                    });
                    
                    // 检查玩家是否死亡
                    if (targetPlayer.health <= 0) {
                        console.log(`玩家 ${data.targetId} 被玩家 ${playerId} 击败`);
                        
                        // 广播玩家死亡事件
                        broadcastGameEvent({
                            type: 'playerDefeated',
                            defeatedId: data.targetId,
                            defeaterId: playerId,
                            timestamp: Date.now()
                        });
                        
                        // 可选：重置玩家健康值并重生
                        setTimeout(() => {
                            if (players.has(data.targetId)) {
                                const respawnPlayer = players.get(data.targetId);
                                respawnPlayer.health = 100;
                                respawnPlayer.position = { 
                                    x: Math.random() * 20 - 10,
                                    y: 5,
                                    z: Math.random() * 20 - 10
                                };
                                
                                // 通知玩家重生
                                if (respawnPlayer.ws.readyState === WebSocket.OPEN) {
                                    respawnPlayer.ws.send(JSON.stringify({
                                        type: 'respawn',
                                        position: respawnPlayer.position,
                                        health: 100
                                    }));
                                }
                                
                                // 广播玩家重生
                                broadcastPlayerUpdate(data.targetId, {
                                    health: 100,
                                    position: respawnPlayer.position
                                });
                            }
                        }, 3000); // 3秒后重生
                    }
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

// 添加新函数：广播攻击事件
function broadcastAttackEvent(attackerId, targetId, data) {
    const message = JSON.stringify({
        type: 'attackEvent',
        attackerId,
        targetId,
        data,
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

// 端口配置：优先使用环境变量中的端口
const PORT = process.env.PORT || 3000;

// 确保server变量是全局定义的，只创建一次
let server;
let isServerRunning = false;

// 启动服务器函数
function startServer() {
  // 检查服务器是否已经在运行
  if (isServerRunning) {
    console.log('服务器已经在运行中，避免重复监听');
    return;
  }

  try {
    // 假设这里是原来创建和配置express应用的代码
    // ...existing code...

    // 只在服务器未运行时监听端口
    server = app.listen(PORT, () => {
      isServerRunning = true;
      console.log(`服务器正在监听端口: ${PORT}`);
    });

    // 添加错误处理
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`端口 ${PORT} 已被占用，请尝试使用不同的端口`);
      } else {
        console.error('服务器错误:', error);
      }
      isServerRunning = false;
    });

    // 添加关闭处理
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('启动服务器时出错:', error);
  }
}

// 优雅关闭函数
function gracefulShutdown() {
  console.log('正在关闭服务器...');
  if (server && isServerRunning) {
    server.close(() => {
      console.log('服务器已安全关闭');
      isServerRunning = false;
      process.exit(0);
    });
  } else {
    console.log('没有正在运行的服务器实例');
    process.exit(0);
  }
}

// 启动服务器
startServer();

// 确保模块可以被 Vercel 导出
module.exports = server; // 或者 app/express 实例，取决于你的代码结构
