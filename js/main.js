let drone;
let clock;
let deltaTime;

// 初始化游戏
function init() {
    try {
        console.log('开始初始化游戏');
        
        // 初始化场景
        initScene();
        
        if (!scene || !camera || !renderer) {
            console.error('场景、相机或渲染器初始化失败');
            return;
        }
        
        // 创建环境元素（树木和建筑物）
        createEnvironment();
        
        // 创建无人机
        drone = new Drone();
        
        if (!drone) {
            console.error('无人机创建失败');
            return;
        }
        
        // 初始化敌机系统
        enemySystem.initialize();
        
        // 初始化UI
        initializeUI();
        
        // 设置敌机难度
        setupDifficulty();
        
        // 初始化小地图
        initMinimap();
        
        // 注册键盘快捷键
        setupGlobalKeyBindings();
        
        // 创建时钟
        clock = new THREE.Clock();
        
        // 开始动画循环
        console.log('开始动画循环');
        animate();
    } catch (error) {
        console.error('游戏初始化失败:', error);
    }
}

function initializeUI() {
    // 初始化健康值显示
    document.getElementById('health').textContent = '100';
    document.getElementById('enemy-count').textContent = enemySystem.enemies.length;
    document.getElementById('destroyed').textContent = '0';
}

function initMinimap() {
    // 初始化小地图
    if (miniMap) {
        miniMap.toggleVisibility(true);
    }
}

function setupGlobalKeyBindings() {
    // 添加全局键盘快捷键
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'KeyM': // M键切换雷达/小地图
                if (miniMap) {
                    const isVisible = miniMap.container.style.display !== 'none';
                    miniMap.toggleVisibility(!isVisible);
                }
                break;
            
            case 'KeyH': // H键隐藏/显示HUD
                const info = document.getElementById('info');
                const healthBar = document.getElementById('health-bar');
                if (info.style.display === 'none') {
                    info.style.display = 'block';
                    healthBar.style.display = 'block';
                } else {
                    info.style.display = 'none';
                    healthBar.style.display = 'none';
                }
                break;
                
            case 'KeyR': // R键调整雷达范围
                if (miniMap) {
                    // 在三个不同范围之间切换
                    if (miniMap.range === 100) miniMap.setRange(200);
                    else if (miniMap.range === 200) miniMap.setRange(400);
                    else miniMap.setRange(100);
                    
                    // 显示范围变化提示
                    showNotification(`雷达范围: ${miniMap.range}单位`);
                }
                break;
        }
    });
}

// 显示临时通知
function showNotification(message, duration = 2000) {
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.position = 'fixed';
        notification.style.top = '100px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        notification.style.color = '#00ff00';
        notification.style.borderRadius = '5px';
        notification.style.fontSize = '16px';
        notification.style.fontFamily = 'monospace';
        notification.style.zIndex = '2000';
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    // 淡入效果
    notification.style.opacity = '0';
    let opacity = 0;
    const fadeIn = setInterval(() => {
        opacity += 0.1;
        notification.style.opacity = opacity;
        if (opacity >= 1) clearInterval(fadeIn);
    }, 20);
    
    // 自动淡出
    setTimeout(() => {
        let opacity = 1;
        const fadeOut = setInterval(() => {
            opacity -= 0.1;
            notification.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(fadeOut);
                notification.style.display = 'none';
            }
        }, 20);
    }, duration);
}

function setupDifficulty() {
    // 随着游戏进行，逐渐增加敌机数量和难度
    let difficultyInterval = setInterval(() => {
        if (!drone || !drone.active) {
            clearInterval(difficultyInterval);
            return;
        }
        
        // 每分钟检查，根据击杀数增加难度
        if (enemySystem.enemiesDestroyed > 10) {
            // 增加敌机数量上限，最多8个
            enemySystem.maxEnemies = Math.min(8, 5 + Math.floor(enemySystem.enemiesDestroyed / 10));
            
            // 增加敌机攻击频率
            enemySystem.enemies.forEach(enemy => {
                enemy.fireRate = Math.min(5, 1 + enemySystem.enemiesDestroyed / 20);
            });
            
            console.log(`难度提高: 敌机数量上限 ${enemySystem.maxEnemies}, 击杀数 ${enemySystem.enemiesDestroyed}`);
        }
    }, 60000); // 每分钟检查一次
}

// 动画循环
function animate() {
    try {
        requestAnimationFrame(animate);
        
        // 计算时间差
        deltaTime = Math.min(clock.getDelta(), 0.1); // 限制最大时间步长
        
        // 更新无人机
        if (drone && drone.active) {
            drone.update(deltaTime);
        }
        
        // 更新敌机
        if (drone && drone.active) {
            enemySystem.update(deltaTime, drone.position);
        }
        
        // 更新子弹系统
        projectileSystem.update(deltaTime);
        
        // 更新UI信息
        updateGameStats();
        
        // 更新雷达
        if (miniMap && drone && drone.active) {
            miniMap.update(drone.position, drone.rotation, enemySystem.enemies);
        }
        
        // 更新多人游戏中的其他玩家模型 - 修复错误调用
        if (typeof multiplayerManager !== 'undefined' && multiplayerManager.connected) {
            // 使用现有方法而不是不存在的方法
            // 遍历并更新所有其他玩家模型
            multiplayerManager.playerInfos.forEach((info, id) => {
                multiplayerManager.updatePlayerModel(id);
            });
        }
        
        // 渲染场景
        if (scene && camera && renderer) {
            renderer.render(scene, camera);
        }
    } catch (error) {
        console.error('动画循环错误:', error);
        
        // 添加更详细的错误日志
        if (error.stack) {
            console.error('错误堆栈:', error.stack);
        }
        
        // 避免无限错误循环，如果连续出错次数过多则暂停动画
        if (!window._errorCount) window._errorCount = 0;
        window._errorCount++;
        
        if (window._errorCount > 10) {
            console.error('检测到多次错误，暂停动画循环');
            return; // 停止递归调用
        }
    }
}

function updateGameStats() {
    // 更新敌机数量和击毁统计
    document.getElementById('enemy-count').textContent = enemySystem.enemies.length;
    document.getElementById('destroyed').textContent = enemySystem.enemiesDestroyed;
    
    // 更新准星状态
    updateCrosshair();
}

function updateCrosshair() {
    const crosshair = document.getElementById('crosshair');
    if (document.pointerLockElement) {
        crosshair.style.opacity = '1';
    } else {
        crosshair.style.opacity = '0';
    }
}

// 页面加载完成后初始化
window.addEventListener('load', function() {
    console.log('页面加载完成，准备初始化游戏');
    setTimeout(init, 500); // 延迟初始化，确保DOM已完全加载
});
