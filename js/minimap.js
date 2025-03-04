// 雷达/小地图系统

class MiniMap {
    constructor(size = 150, scale = 0.5) {
        this.size = size;
        this.scale = scale; // 地图缩放比例 (1单位 = 多少像素)
        this.range = 200; // 雷达的探测范围(游戏单位)
        this.mode = 'radar'; // 'radar'(默认雷达)或'global'(全局地图)
        this.createMapElement();
        this.ctx = this.canvas.getContext('2d');
        
        // 雷达扫描效果
        this.scanAngle = 0;
        this.scanSpeed = Math.PI * 0.5; // 半圈/秒
        this.lastUpdateTime = Date.now();
        
        // 打开雷达音效
        this.pingSound = {
            lastPlayed: 0,
            interval: 2000 // 2秒ping一次
        };
        
        // 添加雷达控制面板
        this.createControlPanel();
    }
    
    createMapElement() {
        // 创建地图容器
        this.container = document.createElement('div');
        this.container.className = 'radar-container';
        
        // 创建画布
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.size;
        this.canvas.height = this.size;
        this.canvas.className = 'radar-canvas';
        
        // 添加到容器
        this.container.appendChild(this.canvas);
        document.body.appendChild(this.container);
    }
    
    createControlPanel() {
        // 创建雷达控制面板
        const panel = document.createElement('div');
        panel.className = 'radar-control-panel';
        
        // 模式切换按钮
        const modeButton = document.createElement('button');
        modeButton.className = 'radar-button';
        modeButton.textContent = '切换模式';
        modeButton.addEventListener('click', () => {
            this.toggleMode();
        });
        panel.appendChild(modeButton);
        
        // 范围调整按钮
        const rangeButton = document.createElement('button');
        rangeButton.className = 'radar-button';
        rangeButton.textContent = '调整范围';
        rangeButton.addEventListener('click', () => {
            this.cycleRange();
        });
        panel.appendChild(rangeButton);
        
        // 添加到雷达容器
        this.container.appendChild(panel);
    }
    
    toggleMode() {
        this.mode = this.mode === 'radar' ? 'global' : 'radar';
        showNotification(`雷达模式: ${this.mode === 'radar' ? '扫描模式' : '全局视图'}`, 1500);
    }
    
    cycleRange() {
        // 在三个不同范围之间切换
        if (this.range === 100) this.range = 200;
        else if (this.range === 200) this.range = 400;
        else this.range = 100;
        
        showNotification(`雷达范围: ${this.range}单位`, 1500);
    }
    
    update(playerPosition, playerRotation, enemies) {
        if (!this.ctx) return;
        
        // 更新扫描角度
        const now = Date.now();
        const deltaTime = (now - this.lastUpdateTime) / 1000;
        this.scanAngle += this.scanSpeed * deltaTime;
        this.lastUpdateTime = now;
        
        if (this.scanAngle > Math.PI * 2) {
            this.scanAngle -= Math.PI * 2;
            // 播放雷达音效
            this.playRadarPing();
        }
        
        // 清除画布
        this.ctx.clearRect(0, 0, this.size, this.size);
        
        // 绘制雷达背景
        this.drawRadarBackground(playerRotation);
        
        // 计算地图中心(玩家位置)
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        
        // 绘制雷达扫描线
        if (this.mode === 'radar') {
            this.drawScanLine(centerX, centerY);
        }
        
        // 绘制敌机
        this.drawEnemies(centerX, centerY, playerPosition, playerRotation, enemies);
        
        // 绘制玩家(位于中心)
        this.drawPlayer(centerX, centerY, playerRotation);
        
        // 绘制距离和方向信息
        this.drawDistanceInfo(centerX, centerY, playerRotation);
        
        // 画出敌机数量和信息面板
        this.drawInfoPanel(enemies);
    }
    
    drawRadarBackground(playerRotation) {
        const centerX = this.size / 2;
        const centerY = this.size / 2;
        const radius = this.size / 2 - 2;
        
        // 创建径向渐变
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(0, 40, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 30, 0, 0.7)');
        gradient.addColorStop(1, 'rgba(0, 20, 0, 0.6)');
        
        // 填充雷达背景
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制雷达圆环
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        this.ctx.lineWidth = 1.5;
        
        // 绘制外圈
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 绘制内圈和距离标记
        const rings = this.mode === 'radar' ? 4 : 8;
        for (let i = 1; i < rings; i++) {
            const ringRadius = radius * i / rings;
            
            // 绘制距离环
            this.ctx.beginPath();
            this.ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
            this.ctx.stroke();
            
            // 显示距离标记(只在几个环上显示)
            if (i % 2 === 0 || rings <= 4) {
                const distance = Math.round(this.range * i / rings);
                this.ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
                this.ctx.font = '8px monospace';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(`${distance}m`, centerX, centerY - ringRadius + 10);
            }
        }
        
        // 绘制方向线和方向标记
        this.drawDirectionLines(centerX, centerY, playerRotation);
    }
    
    drawDirectionLines(centerX, centerY, playerRotation) {
        const radius = this.size / 2 - 2;
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)';
        this.ctx.lineWidth = 1;
        
        // 根据雷达模式决定是否旋转方向线
        const useRotation = this.mode === 'radar';
        const rotation = useRotation ? playerRotation.y : 0;
        
        // 绘制主要方向线(十字线)
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 2) {
            const adjAngle = angle - rotation;
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(adjAngle) * radius,
                centerY + Math.sin(adjAngle) * radius
            );
            this.ctx.stroke();
        }
        
        // 绘制次要方向线
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.2)';
        for (let angle = Math.PI / 4; angle < Math.PI * 2; angle += Math.PI / 2) {
            const adjAngle = angle - rotation;
            
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.lineTo(
                centerX + Math.cos(adjAngle) * radius,
                centerY + Math.sin(adjAngle) * radius
            );
            this.ctx.stroke();
        }
        
        // 绘制方向标记 (N, E, S, W)
        const directions = [
            { label: 'N', angle: 0 },
            { label: 'E', angle: Math.PI / 2 },
            { label: 'S', angle: Math.PI },
            { label: 'W', angle: Math.PI * 3 / 2 }
        ];
        
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.font = '11px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        directions.forEach(dir => {
            const adjAngle = dir.angle - rotation;
            const labelX = centerX + Math.cos(adjAngle) * (radius - 10);
            const labelY = centerY + Math.sin(adjAngle) * (radius - 10);
            
            // 绘制方向标签
            this.ctx.fillText(dir.label, labelX, labelY);
        });
        
        // 高亮显示北方
        const northAngle = -rotation;
        const northX = centerX + Math.cos(northAngle) * (radius - 10);
        const northY = centerY + Math.sin(northAngle) * (radius - 10);
        
        // 绘制北方特殊标记
        this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.arc(northX, northY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 玩家前方指示器
        const headingAngle = -Math.PI/2;
        const headingX = centerX + Math.cos(headingAngle) * (radius - 10);
        const headingY = centerY + Math.sin(headingAngle) * (radius - 10);
        
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.moveTo(headingX, headingY - 5);
        this.ctx.lineTo(headingX - 4, headingY + 3);
        this.ctx.lineTo(headingX + 4, headingY + 3);
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    drawScanLine(centerX, centerY) {
        const radius = this.size / 2 - 2;
        
        // 创建扫描线径向渐变
        const gradient = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, 'rgba(0, 255, 0, 0.8)');
        gradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
        
        // 绘制扇形扫描线
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY);
        this.ctx.arc(centerX, centerY, radius, this.scanAngle - 0.2, this.scanAngle + 0.2);
        this.ctx.lineTo(centerX, centerY);
        this.ctx.fill();
    }
    
    drawPlayer(x, y, rotation) {
        // 在中心绘制代表玩家的图标
        this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 4, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 玩家朝向指示器
        this.ctx.strokeStyle = 'rgba(0, 255, 0, 1)';
        this.ctx.fillStyle = 'rgba(0, 255, 0, 1)';
        this.ctx.lineWidth = 2;
        
        // 根据雷达模式决定是否旋转玩家图标
        let direction = -Math.PI/2; // 默认向上
        
        this.ctx.save();
        this.ctx.translate(x, y);
        
        // 绘制三角形表示玩家朝向
        this.ctx.beginPath();
        this.ctx.moveTo(Math.cos(direction) * 8, Math.sin(direction) * 8);
        this.ctx.lineTo(Math.cos(direction + 2.5) * 5, Math.sin(direction + 2.5) * 5);
        this.ctx.lineTo(Math.cos(direction - 2.5) * 5, Math.sin(direction - 2.5) * 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawEnemies(centerX, centerY, playerPosition, playerRotation, enemies) {
        // 计算旋转矩阵用于相对位置转换
        const useRotation = this.mode === 'radar'; // 在雷达模式下旋转敌机位置
        const rotation = useRotation ? playerRotation.y : 0;
        
        // 检查敌机是否在范围内，并根据扫描角度更新可视性
        const visibilityMap = new Map();
        const maxVisibleDistance = this.mode === 'global' ? Infinity : this.range;
        
        enemies.forEach((enemy, index) => {
            if (!enemy.active) return;
            
            // 计算敌人相对于玩家的位置
            const relativeX = enemy.position.x - playerPosition.x;
            const relativeY = enemy.position.y - playerPosition.y;
            const relativeZ = enemy.position.z - playerPosition.z;
            
            // 计算敌机距离
            const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
            
            // 计算相对玩家的角度
            const angle = Math.atan2(relativeZ, relativeX);
            
            // 调整角度以考虑玩家旋转
            const adjustedAngle = angle - rotation;
            
            // 计算雷达上的位置
            const scale = (this.size / 2 - 2) / this.range;
            const maxDrawDistance = Math.min(distance, maxVisibleDistance);
            const radarX = centerX + Math.cos(adjustedAngle) * maxDrawDistance * scale;
            const radarY = centerY + Math.sin(adjustedAngle) * maxDrawDistance * scale;
            
            // 判断是否在扫描区域内 - 只对雷达模式有效
            const scanAreaWidth = 0.4; // 扫描扇区宽度
            let normalizedScanAngle = (this.scanAngle + Math.PI * 2) % (Math.PI * 2);
            let normalizedAngle = (adjustedAngle + Math.PI * 2) % (Math.PI * 2);
            
            const angleDiff = Math.min(
                Math.abs(normalizedAngle - normalizedScanAngle),
                Math.PI * 2 - Math.abs(normalizedAngle - normalizedScanAngle)
            );
            
            const isInScanArea = angleDiff < scanAreaWidth;
            const isInRange = distance <= maxVisibleDistance;
            
            // 保存敌机可视性状态
            visibilityMap.set(enemy, {
                x: radarX,
                y: radarY,
                distance,
                heightDiff: relativeY,
                isInScanArea,
                isInRange,
                angle: adjustedAngle
            });
        });
        
        // 绘制所有敌机
        visibilityMap.forEach((info, enemy) => {
            if (!info.isInRange && this.mode !== 'global') return;
            
            // 在全局模式下，始终显示所有敌机
            if (this.mode === 'global') {
                this.drawEnemyDot(info.x, info.y, info.distance, info.heightDiff, true, info.angle);
                return;
            }
            
            // 在雷达模式下，显示扫描效果
            if (info.isInScanArea) {
                // 在扫描区域内高亮显示
                this.drawEnemyDot(info.x, info.y, info.distance, info.heightDiff, true, info.angle);
                // 添加敌机轨迹
                this.drawEnemyTrail(info.x, info.y, Math.max(3, 6 * (1 - info.distance / this.range)));
            } else {
                // 在扫描区域外淡化显示
                this.drawEnemyDot(info.x, info.y, info.distance, info.heightDiff, false, info.angle);
            }
        });
    }
    
    drawEnemyDot(x, y, distance, heightDiff, highlight, angle) {
        // 计算高度比例，用于颜色区分
        const heightFactor = Math.min(2, Math.abs(heightDiff) / 20); // 20单位高度差
        const normalizedDistance = Math.min(1, distance / this.range);
        
        // 根据高度差选择颜色
        let dotColor;
        if (heightFactor > 1.5) {
            // 高度差很大 - 黄色
            dotColor = highlight 
                ? `rgba(255, 255, 0, ${0.9 - normalizedDistance * 0.5})`
                : `rgba(120, 120, 0, 0.4)`;
        } else if (heightFactor > 0.5) {
            // 高度差中等 - 橙色
            dotColor = highlight 
                ? `rgba(255, 165, 0, ${0.9 - normalizedDistance * 0.5})`
                : `rgba(120, 80, 0, 0.4)`;
        } else {
            // 高度差小 - 红色
            dotColor = highlight 
                ? `rgba(255, 0, 0, ${0.9 - normalizedDistance * 0.5})`
                : `rgba(120, 0, 0, 0.4)`;
        }
        
        // 绘制敌机点
        const dotSize = Math.max(3, 6 * (1 - normalizedDistance));
        this.ctx.fillStyle = dotColor;
        this.ctx.beginPath();
        this.ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 如果敌机接近，添加距离指示器
        if (distance < this.range * 0.3 && highlight) {
            this.drawDistanceLabel(x, y, Math.round(distance), heightDiff < 0 ? 'below' : 'above');
        }
    }
    
    drawDistanceLabel(x, y, distance, heightStatus) {
        // 在敌机点旁显示距离信息
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.font = '8px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'bottom';
        this.ctx.fillText(`${distance}m`, x, y - 8);
        
        // 显示高度状态
        if (heightStatus) {
            const heightSymbol = heightStatus === 'above' ? '↑' : '↓';
            this.ctx.fillText(heightSymbol, x, y - 16);
        }
    }
    
    drawDistanceInfo(centerX, centerY, playerRotation) {
        // 绘制雷达范围信息
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        // 显示当前雷达范围
        this.ctx.fillText(`范围: ${this.range}m`, 5, 5);
        
        // 显示雷达模式
        this.ctx.fillText(`模式: ${this.mode === 'radar' ? '扫描' : '全局'}`, 5, 20);
        
        // 在雷达边缘显示玩家坐标信息
        const coords = `X:${Math.round(drone.position.x)} Y:${Math.round(drone.position.y)} Z:${Math.round(drone.position.z)}`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(coords, centerX, this.size - 12);
    }
    
    drawInfoPanel(enemies) {
        // 计算敌机统计信息
        const totalEnemies = enemies.length;
        const nearbyEnemies = enemies.filter(enemy => {
            if (!enemy.active) return false;
            const dist = enemy.position.distanceTo(drone.position);
            return dist < this.range / 2;
        }).length;
        
        // 绘制敌机数量信息
        this.ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        this.ctx.font = '10px monospace';
        this.ctx.textAlign = 'right';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(`敌机: ${totalEnemies}`, this.size - 5, 5);
        this.ctx.fillText(`附近: ${nearbyEnemies}`, this.size - 5, 20);
        
        // 如果有很多敌机在附近，显示警告
        if (nearbyEnemies > 2) {
            const warningOpacity = (Math.sin(Date.now() * 0.005) + 1) * 0.5;
            this.ctx.fillStyle = `rgba(255, 50, 50, ${0.5 + warningOpacity * 0.5})`;
            this.ctx.textAlign = 'center';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('警告!', this.size / 2, 40);
        }
    }
    
    drawEnemyTrail(x, y, size) {
        // 随机生成一些小点，代表雷达"尾迹"
        const trailLength = Math.floor(Math.random() * 3) + 2;
        const angle = Math.random() * Math.PI * 2;
        const distance = size * 0.8;
        
        for (let i = 0; i < trailLength; i++) {
            const trailX = x + Math.cos(angle) * distance * (i + 1) * 0.8;
            const trailY = y + Math.sin(angle) * distance * (i + 1) * 0.8;
            const trailSize = size * (1 - (i + 1) * 0.3);
            
            this.ctx.fillStyle = `rgba(255, 0, 0, ${0.7 - i * 0.2})`;
            this.ctx.beginPath();
            this.ctx.arc(trailX, trailY, trailSize / 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    playRadarPing() {
        const now = Date.now();
        if (now - this.pingSound.lastPlayed > this.pingSound.interval) {
            this.pingSound.lastPlayed = now;
            
            // 播放ping音效
            if (audioManager && audioManager.enabled) {
                // 如果有音效系统，可以添加一个专门的雷达音效
                // audioManager.playSound('radarPing');
                
                // 或者暂时使用已有的音效
                const gainValue = audioManager.volume;
                audioManager.setVolume(gainValue * 0.2); // 降低音量
                audioManager.playSound('hit');
                setTimeout(() => {
                    audioManager.setVolume(gainValue); // 恢复音量
                }, 100);
            }
        }
    }
    
    setScale(newScale) {
        this.scale = newScale;
    }
    
    setRange(newRange) {
        this.range = newRange;
    }
    
    toggleVisibility(visible) {
        this.container.style.display = visible ? 'block' : 'none';
    }
}

// 创建全局小地图/雷达实例
const miniMap = new MiniMap();
