/**
 * 多人游戏客户端 - 使用替代实时服务
 * 
 * 这个文件提供了几种实现实时多人游戏功能的替代方案:
 * 1. Firebase Realtime Database (推荐)
 * 2. Pusher 
 * 3. Socket.io 与自定义服务器
 * 
 * 当部署到 Vercel 时，由于 Vercel 不支持持久的 WebSocket 连接，
 * 我们需要使用这些替代方案。
 */

// 多人游戏管理器 - 使用适合 Vercel 的替代方案
const MultiplayerClient = {
    connected: false,
    playerId: null,
    playerInfos: new Map(),
    onlineCount: 0,
    currentMode: 'api', // 'api', 'firebase', 'pusher'
    
    // 初始化函数
    async initialize(mode = 'api') {
        console.log(`初始化多人游戏客户端 (模式: ${mode})`);
        this.currentMode = mode;
        
        try {
            switch(mode) {
                case 'firebase':
                    await this.initFirebase();
                    break;
                case 'pusher':
                    await this.initPusher();
                    break;
                case 'api':
                default:
                    await this.initApiMode();
                    break;
            }
            
            // 显示连接模式提示
            this.showConnectionNotice();
            
            // 定期更新服务器状态
            setInterval(() => this.updateServerStatus(), 30000);
            
            return true;
        } catch (error) {
            console.error('多人游戏初始化失败:', error);
            document.getElementById('connection-status').textContent = '连接失败';
            document.getElementById('connection-status').style.color = '#ff0000';
            return false;
        }
    },
    
    // API 轮询模式 - 最简单的替代方案
    async initApiMode() {
        this.playerId = 'local-' + Math.random().toString(36).substring(2, 10);
        document.getElementById('debug-player-id').textContent = this.playerId;
        
        // 获取初始状态
        await this.updateServerStatus();
        
        // 设置状态为已连接
        this.connected = true;
        document.getElementById('connection-status').textContent = '使用API模式';
        document.getElementById('connection-status').style.color = '#ffaa00';
        
        console.log('API模式已初始化，使用本地游戏模式');
        return true;
    },
    
    // Firebase 初始化
    async initFirebase() {
        console.log('Firebase暂未集成。要集成Firebase，请:');
        console.log('1. 安装Firebase: npm install firebase');
        console.log('2. 创建Firebase项目并获取配置');
        console.log('3. 实现initFirebase()方法');
        
        // 这里本应该是Firebase的初始化代码，但简化为提示信息
        
        document.getElementById('connection-status').textContent = 'Firebase未配置';
        document.getElementById('connection-status').style.color = '#ffaa00';
        return false;
    },
    
    // Pusher 初始化
    async initPusher() {
        console.log('Pusher暂未集成。要集成Pusher，请:');
        console.log('1. 安装Pusher: npm install pusher-js');
        console.log('2. 创建Pusher账号并获取API密钥');
        console.log('3. 实现initPusher()方法');
        
        document.getElementById('connection-status').textContent = 'Pusher未配置';
        document.getElementById('connection-status').style.color = '#ffaa00';
        return false;
    },
    
    // 获取服务器状态
    async updateServerStatus() {
        try {
            // 尝试通过API获取状态
            const response = await fetch('/api/stats');
            if (response.ok) {
                const data = await response.json();
                this.onlineCount = data.onlinePlayers || 0;
                document.getElementById('debug-online-count').textContent = this.onlineCount;
            }
        } catch (error) {
            console.warn('无法获取服务器状态:', error);
        }
    },
    
    // 显示连接模式通知
    showConnectionNotice() {
        // 创建通知元素
        let notice = document.createElement('div');
        notice.style.position = 'fixed';
        notice.style.bottom = '20px';
        notice.style.left = '50%';
        notice.style.transform = 'translateX(-50%)';
        notice.style.backgroundColor = 'rgba(0,0,0,0.7)';
        notice.style.color = '#ffaa00';
        notice.style.padding = '10px 20px';
        notice.style.borderRadius = '5px';
        notice.style.fontFamily = 'monospace';
        notice.style.fontSize = '14px';
        notice.style.zIndex = '1000';
        
        // 设置通知内容
        switch(this.currentMode) {
            case 'firebase':
                notice.textContent = '使用 Firebase 实时数据库进行多人游戏';
                break;
            case 'pusher':
                notice.textContent = '使用 Pusher 进行多人游戏';
                break;
            case 'api':
            default:
                notice.textContent = '本地模式：多人游戏功能受限';
                break;
        }
        
        // 添加到页面并设置自动移除
        document.body.appendChild(notice);
        setTimeout(() => {
            notice.style.opacity = '0';
            notice.style.transition = 'opacity 1s';
            setTimeout(() => notice.remove(), 1000);
        }, 5000);
    },
    
    // 发送位置更新 - 模拟方法
    sendPositionUpdate(position, rotation) {
        if (!this.connected) return;
        
        // 在真实实现中，这里会发送数据到服务器
        console.log('位置更新 (模拟):', position);
        
        // 更新本地玩家位置
        this.updateLocalPlayer(position, rotation);
    },
    
    // 更新本地玩家信息
    updateLocalPlayer(position, rotation) {
        // 简单存储本地玩家信息
        if (!this.playerInfos.has(this.playerId)) {
            this.playerInfos.set(this.playerId, {
                id: this.playerId,
                position: position,
                rotation: rotation,
                health: 100,
                isLocal: true
            });
        } else {
            const player = this.playerInfos.get(this.playerId);
            player.position = position;
            player.rotation = rotation;
        }
    },
    
    // 断开连接
    disconnect() {
        console.log('断开多人游戏连接');
        this.connected = false;
        this.playerInfos.clear();
        document.getElementById('connection-status').textContent = '已断开连接';
        document.getElementById('connection-status').style.color = '#ff0000';
    }
};

// 初始化多人游戏客户端
window.addEventListener('load', () => {
    // 延迟初始化，确保其他组件已加载
    setTimeout(() => {
        MultiplayerClient.initialize('api')
            .then(success => {
                if (success) {
                    console.log('多人游戏客户端初始化成功');
                } else {
                    console.warn('多人游戏客户端初始化失败，将使用离线模式');
                }
            });
    }, 1000);
});

// 导出客户端对象
window.multiplayerManager = MultiplayerClient;
