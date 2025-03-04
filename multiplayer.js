class MultiplayerManager {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.playerId = null;
        this.playerInfos = new Map();
        this.lastUpdateTime = Date.now();
        this.updateInterval = 100; // 100ms更新一次位置
        this.otherPlayerModels = new Map(); // 存储其他玩家的3D模型
        this.createPlayerList(); // 创建玩家列表
        this.onlineCount = 0; // 添加在线人数属性
        this.createOnlineCountDisplay(); // 创建显示元素
    }
    
    connect(serverUrl) {
        try {
            // 如果未提供URL，尝试连接到当前主机
            if (!serverUrl) {
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                serverUrl = `${protocol}//${host}/ws`; // 使用 /ws 路径
            }
            
            console.log('尝试连接到WebSocket服务器:', serverUrl);
            
            // 确保connection-status元素存在
            let statusElement = document.getElementById('connection-status');
            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.id = 'connection-status';
                statusElement.style.position = 'fixed';
                statusElement.style.top = '5px';
                statusElement.style.left = '50%';
                statusElement.style.transform = 'translateX(-50%)';
                statusElement.style.background = 'rgba(0,0,0,0.7)';
                statusElement.style.color = '#ffff00';
                statusElement.style.padding = '5px 10px';
                statusElement.style.borderRadius = '5px';
                statusElement.style.zIndex = '10000';
                statusElement.style.fontSize = '12px';
                document.body.appendChild(statusElement);
            }
            
            statusElement.textContent = '正在连接...';
            statusElement.style.color = '#ffff00';
            
            this.socket = new WebSocket(serverUrl);
            
            this.socket.onopen = () => {
                console.log('已成功连接到游戏服务器');
                this.connected = true;
                showNotification('已连接到游戏服务器', 3000);
                
                if (statusElement) {
                    statusElement.textContent = '已连接';
                    statusElement.style.color = '#00ff00';
                }
                
                // 更新调试面板
                if (document.getElementById('debug-connection')) {
                    document.getElementById('debug-connection').textContent = '已连接';
                    document.getElementById('debug-connection').style.color = '#00ff00';
                }
                
                // 立即发送初始位置
                this.sendUpdate(true);
                
                // 添加调试信息到控制台
                console.log('本地玩家ID:', this.playerId);
                console.log('当前场景:', scene);
            };
            
            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                } catch (error) {
                    console.error('处理消息错误:', error, event.data);
                }
            };
            
            this.socket.onclose = () => {
                console.log('与服务器断开连接');
                this.connected = false;
                showNotification('已断开连接，游戏转为单人模式');
                
                // 触发自定义断开事件
                const event = new CustomEvent('multiplayer-disconnected');
                window.dispatchEvent(event);
                
                // 清理其他玩家模型
                this.removeAllPlayerModels();
            };
            
            this.socket.onerror = (error) => {
                console.error('WebSocket错误:', error);
                showNotification('连接错误，游戏转为单人模式');
                this.connected = false;
                this.removeAllPlayerModels();
            };
            
            // 定期发送位置更新
            this.updateInterval = setInterval(() => this.sendUpdate(), 100);
        } catch (error) {
            console.error('连接错误:', error);
            showNotification('无法连接到服务器，游戏转为单人模式');
            
            if (document.getElementById('connection-status')) {
                document.getElementById('connection-status').textContent = '连接失败';
                document.getElementById('connection-status').style.color = '#ff0000';
            }
        }
    }
    
    handleMessage(message) {
        switch (message.type) {
            case 'welcome':
                this.playerId = message.playerId;
                console.log(`已分配玩家ID: ${this.playerId}`);
                break;
                
            case 'players':
                // 更新其他玩家信息
                const currentIds = new Set(message.players.map(p => p.id));
                
                // 处理离开的玩家
                for (const id of this.playerInfos.keys()) {
                    if (!currentIds.has(id)) {
                        console.log(`玩家 ${id} 已离开`);
                        showNotification(`玩家 ${id} 已离开`);
                        this.removePlayerModel(id);
                        this.playerInfos.delete(id);
                    }
                }
                
                // 更新在线人数
                if (message.onlineCount !== undefined) {
                    this.onlineCount = message.onlineCount;
                    this.updateOnlineCountDisplay();
                }
                
                // 处理现有和新玩家
                message.players.forEach(player => {
                    // 跳过自己
                    if (player.id === this.playerId) return;
                    
                    if (!this.playerInfos.has(player.id)) {
                        // 新玩家加入
                        console.log(`玩家 ${player.id} 已加入`);
                        showNotification(`玩家 ${player.id} 已加入`);
                        this.playerInfos.set(player.id, player);
                        this.createPlayerModel(player.id, player);
                    } else {
                        // 更新现有玩家
                        const oldData = this.playerInfos.get(player.id);
                        this.playerInfos.set(player.id, {
                            ...oldData,
                            ...player
                        });
                        this.updatePlayerModel(player.id);
                    }
                });
                break;
                
            case 'playerUpdate':
                if (message.playerId !== this.playerId) {
                    const playerInfo = this.playerInfos.get(message.playerId);
                    
                    if (playerInfo) {
                        // 更新玩家信息
                        this.playerInfos.set(message.playerId, {
                            ...playerInfo,
                            ...message.data
                        });
                        
                        // 更新3D模型
                        this.updatePlayerModel(message.playerId);
                    } else {
                        // 可能是没收到players消息就收到了update
                        console.log(`收到未知玩家 ${message.playerId} 的更新`);
                        this.playerInfos.set(message.playerId, message.data);
                    }
                }
                break;
                
            case 'damageReceived':
                // 我们被其他玩家攻击了
                if (drone && drone.active) {
                    drone.damage(message.damage);
                    showNotification(`被玩家 ${message.fromId} 击中！损失 ${message.damage} 生命值`);
                }
                break;

            case 'playerAction':
                // 处理远程玩家动作
                if (message.playerId !== this.playerId) {
                    console.log(`收到玩家 ${message.playerId} 的动作:`, message.action);
                    
                    if (message.action === 'fire') {
                        // 创建远程玩家发射的子弹
                        const position = new THREE.Vector3(
                            message.position.x,
                            message.position.y,
                            message.position.z
                        );
                        
                        const direction = new THREE.Vector3(
                            message.direction.x,
                            message.direction.y,
                            message.direction.z
                        );
                        
                        // 使用特殊的所有者ID标记子弹来源
                        projectileSystem.fire(position, direction, 50, `player_${message.playerId}`);
                        
                        console.log(`创建了玩家 ${message.playerId} 的子弹`, position, direction);
                    }
                }
                break;
                
            case 'damageReceived':
                // 处理受到伤害
                if (drone && drone.active) {
                    // 实际造成伤害
                    drone.damage(message.damage);
                    
                    // 添加视觉和声音反馈
                    console.log(`被玩家 ${message.fromId} 击中，损失 ${message.damage} 生命值`);
                    showNotification(`被玩家 ${message.fromId} 击中!`, 2000);
                    
                    // 创建受伤特效
                    if (typeof createDamageEffect === 'function') {
                        createDamageEffect(drone.position.clone());
                    }
                    
                    // 播放受伤音效
                    if (typeof playSound === 'function') {
                        playSound('hit');
                    }
                    
                    // 如果生命值过低，播放警告
                    if (drone.health < 30) {
                        if (typeof playSound === 'function') {
                            playSound('warning');
                        }
                    }
                }
                break;
                
            default:
                console.log('收到未知类型消息:', message);
        }
        
        // 在合适的消息处理后更新玩家列表
        if (message.type === 'players' || message.type === 'playerUpdate') {
            this.updatePlayerList();
        }
    }
    
    sendUpdate(force = false) {
        if (!this.connected || !this.playerId || !drone) return;
        
        const now = Date.now();
        if (!force && now - this.lastUpdateTime < 100) return;
        this.lastUpdateTime = now;
        
        // 发送玩家位置和旋转信息
        this.send({
            type: 'playerUpdate',
            data: {
                position: {
                    x: drone.position.x,
                    y: drone.position.y,
                    z: drone.position.z
                },
                rotation: {
                    y: drone.rotation.y
                },
                health: drone.health
            }
        });
    }
    
    send(message) {
        if (this.connected && this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(message));
        }
    }
    
    disconnect() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.socket) {
            this.socket.close();
        }
        
        this.removeAllPlayerModels();
    }
    
    createPlayerModel(id, playerInfo) {
        if (!scene) {
            console.error('场景未初始化，无法创建玩家模型');
            return;
        }
        
        // 调试信息
        console.log(`正在创建玩家${id}的模型，位置:`, playerInfo.position);
        
        // 创建其他玩家的无人机模型
        const otherDrone = new THREE.Group();
        
        // 无人机主体
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x0088FF, // 蓝色，与玩家无人机(红色)区分
            emissive: 0x002233,
            emissiveIntensity: 0.2
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        otherDrone.add(body);
        
        // 添加旋翼
        const rotorGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const rotorMaterial = new THREE.MeshStandardMaterial({ color: 0x00FFFF });
        
        const rotorPositions = [
            new THREE.Vector3(0.8, 0.3, 0.8),
            new THREE.Vector3(-0.8, 0.3, 0.8),
            new THREE.Vector3(-0.8, 0.3, -0.8),
            new THREE.Vector3(0.8, 0.3, -0.8)
        ];
        
        const rotors = [];
        rotorPositions.forEach(position => {
            const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
            rotor.position.copy(position);
            rotor.castShadow = true;
            rotors.push(rotor);
            otherDrone.add(rotor);
        });
        
        // 添加玩家ID标签
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const context = canvas.getContext('2d');
        context.fillStyle = '#000000';
        context.fillRect(0, 0, 256, 64);
        context.fillStyle = '#00FFFF';
        context.font = '36px Arial';
        context.textAlign = 'center';
        context.fillText(`玩家 ${id}`, 128, 44);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true
        });
        const label = new THREE.Sprite(labelMaterial);
        label.position.set(0, 2, 0);
        label.scale.set(5, 1.25, 1);
        otherDrone.add(label);
        
        // 如果有位置信息，立即更新
        if (playerInfo && playerInfo.position) {
            otherDrone.position.set(
                playerInfo.position.x,
                playerInfo.position.y,
                playerInfo.position.z
            );
        }
        
        if (playerInfo && playerInfo.rotation) {
            otherDrone.rotation.set(0, playerInfo.rotation.y, 0);
        }
        
        // 确保其他玩家的模型有足够的距离可见性
        otherDrone.userData = {
            isRemotePlayer: true,
            playerId: id,
            health: playerInfo.health || 100
        };
        
        // 调整模型大小和可见性
        otherDrone.scale.set(1.5, 1.5, 1.5); // 略微放大以便更容易看见
        
        scene.add(otherDrone);
        
        // 保存模型引用
        this.otherPlayerModels.set(id, {
            group: otherDrone,
            rotors: rotors,
            lastRotorUpdate: Date.now()
        });
        
        // 确认模型已添加到场景
        console.log(`玩家${id}的模型已添加到场景，场景中物体数量:`, scene.children.length);
    }
    
    updatePlayerModel(id) {
        const playerInfo = this.playerInfos.get(id);
        const modelInfo = this.otherPlayerModels.get(id);
        
        if (!playerInfo || !modelInfo) return;
        
        // 更新位置和旋转
        if (playerInfo.position) {
            modelInfo.group.position.set(
                playerInfo.position.x,
                playerInfo.position.y,
                playerInfo.position.z
            );
        }
        
        if (playerInfo.rotation) {
            modelInfo.group.rotation.set(0, playerInfo.rotation.y, 0);
        }
        
        // 旋转旋翼
        const now = Date.now();
        if (now - modelInfo.lastRotorUpdate > 16) {
            modelInfo.rotors.forEach(rotor => {
                rotor.rotation.y += 0.3;
            });
            modelInfo.lastRotorUpdate = now;
        }
    }
    
    removePlayerModel(id) {
        const modelInfo = this.otherPlayerModels.get(id);
        
        if (modelInfo && scene) {
            scene.remove(modelInfo.group);
            this.otherPlayerModels.delete(id);
        }
    }
    
    removeAllPlayerModels() {
        if (scene) {
            for (const [id, modelInfo] of this.otherPlayerModels.entries()) {
                scene.remove(modelInfo.group);
            }
        }
        this.otherPlayerModels.clear();
    }
    
    createPlayerList() {
        const container = document.createElement('div');
        container.className = 'player-list-container';
        container.style.display = 'none';
        
        const header = document.createElement('div');
        header.className = 'player-list-header';
        header.innerHTML = '玩家列表 <span class="toggle-button">[-]</span>';
        
        const list = document.createElement('div');
        list.className = 'player-list';
        
        container.appendChild(header);
        container.appendChild(list);
        document.body.appendChild(container);
        
        this.playerList = list;
        
        // 添加切换显示的事件
        header.querySelector('.toggle-button').addEventListener('click', () => {
            const isCollapsed = list.style.display === 'none';
            list.style.display = isCollapsed ? 'block' : 'none';
            header.querySelector('.toggle-button').textContent = isCollapsed ? '[-]' : '[+]';
        });
        
        // 添加快捷键
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyP') {
                container.style.display = container.style.display === 'none' ? 'block' : 'none';
            }
        });
        
        // 默认隐藏状态
        container.style.display = 'none';
        this.onlineCountContainer = container;
    }
    
    updatePlayerList() {
        if (!this.playerList) return;
        
        // 清空列表
        this.playerList.innerHTML = '';
        
        // 添加自己
        const selfItem = document.createElement('div');
        selfItem.className = 'player-item self';
        selfItem.innerHTML = `<span class="player-name">你 (${this.playerId || '未连接'})</span>`;
        this.playerList.appendChild(selfItem);
        
        // 添加其他玩家
        this.playerInfos.forEach((info, id) => {
            const item = document.createElement('div');
            item.className = 'player-item';
            const healthPercent = info.health ? Math.max(0, Math.min(100, info.health)) : 100;
            const healthColor = healthPercent > 60 ? '#00ff00' : healthPercent > 30 ? '#ffff00' : '#ff3300';
            item.innerHTML = `
                <span class="player-name">玩家 ${id}</span>
                <div class="player-health-bar">
                    <div class="player-health-fill" style="width:${healthPercent}%; background-color:${healthColor}"></div>
                </div>
            `;
            this.playerList.appendChild(item);
        });
        
        // 显示总数
        if (this.playerListContainer && this.connected) {
            this.playerListContainer.style.display = 'block';
        }
    }
    
    createOnlineCountDisplay() {
        const container = document.createElement('div');
        container.className = 'online-count-container';
        container.style.position = 'fixed';
        container.style.bottom = '10px';
        container.style.left = '10px';
        container.style.backgroundColor = 'rgba(0,0,0,0.7)';
        container.style.color = '#00FF00';
        container.style.padding = '10px';
        container.style.borderRadius = '5px';
        container.style.fontFamily = 'monospace';
        container.style.zIndex = '1000';
        
        this.onlineCountDisplay = document.createElement('div');
        this.onlineCountDisplay.className = 'online-count';
        this.onlineCountDisplay.innerHTML = '在线玩家: 0';
        
        container.appendChild(this.onlineCountDisplay);
        document.body.appendChild(container);
        
        // 默认隐藏状态
        container.style.display = 'none';
        this.onlineCountContainer = container;
    }
    
    updateOnlineCountDisplay() {
        if (this.onlineCountDisplay) {
            this.onlineCountDisplay.innerHTML = `在线玩家: ${this.onlineCount}`;
            if (this.onlineCountContainer.style.display === 'none' && this.connected) {
                this.onlineCountContainer.style.display = 'block';
            }
        }
    }

    // 添加缺失的方法来更新所有玩家模型
    updateAllPlayerModels() {
        // 如果未连接或者没有其他玩家，直接返回
        if (!this.connected || this.playerInfos.size === 0) return;
        
        // 遍历并更新所有其他玩家模型
        this.playerInfos.forEach((info, id) => {
            this.updatePlayerModel(id);
        });
    }

    // 增强版的发送伤害方法
    sendPlayerDamage(targetId, damage, damageType = 'bullet') {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('无法发送伤害，未连接到服务器');
            return false;
        }
        
        // 发送伤害消息到服务器
        this.send({
            type: 'playerDamage',
            targetId: targetId,
            damage: damage,
            damageType: damageType
        });
        
        console.log(`发送伤害到玩家 ${targetId}: ${damage} 点`);
        return true;
    }
}

// 创建单例实例
const multiplayerManager = new MultiplayerManager();

// 显示通知的辅助函数
function showNotification(message, duration = 2000) {
    // 检查全局函数是否存在，不存在则创建一个简单版本
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, duration);
    } else {
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.position = 'fixed';
            notification.style.top = '100px';
            notification.style.left = '50%';
            notification.style.transform = 'translateX(-50%)';
            notification.style.padding = '10px 20px';
            notification.style.backgroundColor = 'rgba(0, 30, 0, 0.8)';
            notification.style.color = '#00ff00';
            notification.style.borderRadius = '5px';
            notification.style.fontSize = '16px';
            notification.style.zIndex = '2000';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        
        setTimeout(() => {
            notification.style.display = 'none';
        }, duration);
    }
}

// 页面加载后添加延迟连接
window.addEventListener('load', () => {
    console.log('页面加载完成，准备连接到多人游戏服务器...');
    
    // 添加连接按钮
    const connectButton = document.createElement('button');
    connectButton.textContent = '连接到多人游戏';
    connectButton.style.position = 'fixed';
    connectButton.style.bottom = '20px';
    connectButton.style.right = '20px';
    connectButton.style.padding = '8px 15px';
    connectButton.style.backgroundColor = '#005500';
    connectButton.style.color = '#00ff00';
    connectButton.style.border = '1px solid #00aa00';
    connectButton.style.borderRadius = '5px';
    connectButton.style.cursor = 'pointer';
    connectButton.style.zIndex = 1000;
    connectButton.onclick = () => multiplayerManager.connect();
    document.body.appendChild(connectButton);
    
    // 延迟自动连接
    setTimeout(() => {
        multiplayerManager.connect();
    }, 2000); // 延长到2秒，确保页面完全加载
});

// 添加新的调试功能：显示连接的玩家名单
function createPlayerList() {
    let playerListDiv = document.getElementById('player-list');
    if (!playerListDiv) {
        playerListDiv = document.createElement('div');
        playerListDiv.id = 'player-list';
        playerListDiv.style.position = 'fixed';
        playerListDiv.style.left = '10px';
        playerListDiv.style.top = '10px';
        playerListDiv.style.backgroundColor = 'rgba(0,0,0,0.7)';
        playerListDiv.style.color = '#00FF00';
        playerListDiv.style.padding = '10px';
        playerListDiv.style.borderRadius = '5px';
        playerListDiv.style.fontFamily = 'monospace';
        playerListDiv.style.zIndex = '1000';
        document.body.appendChild(playerListDiv);
    }
    return playerListDiv;
}

// 更新玩家列表显示
function updatePlayerList() {
    if (!multiplayerManager.connected) return;
    
    const playerListDiv = createPlayerList();
    let html = '<h3>连接的玩家</h3>';
    html += `<div>你: ${multiplayerManager.playerId}</div>`;
    
    multiplayerManager.playerInfos.forEach((info, id) => {
        html += `<div>玩家 ${id} - 健康值: ${info.health || 100}</div>`;
    });
    
    playerListDiv.innerHTML = html;
}

// 每秒更新一次玩家列表
setInterval(updatePlayerList, 1000);
