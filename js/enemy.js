// 敌机系统

class Enemy {
    constructor(position) {
        this.position = position || new THREE.Vector3();
        this.rotation = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
        this.velocity = new THREE.Vector3();
        this.speed = 0;
        // 大幅降低敌机最大速度
        this.maxSpeed = 8 + Math.random() * 4; // 原来是30+rand*10，现在降到8+rand*4
        this.health = 100;
        this.maxHealth = 100;
        this.active = true;
        this.lastFireTime = 0;
        // 降低射击频率
        this.fireRate = 0.5 + Math.random() * 1; // 每秒发射子弹数，原来是1+rand*2
        
        // 添加迟钝转向特性
        this.turnSpeed = 0.5 + Math.random() * 0.5; // 较慢的转向速度
        
        // 运动轨迹相关
        this.pathPoints = [];  // 存储路径点
        this.pathIndex = 0;    // 当前路径点索引
        this.generateRandomPath(); // 生成随机路径
        this.lastPathUpdateTime = Date.now();
        this.pathUpdateInterval = 15000; // 15秒更新一次路径，更长时间停留在一个区域
        
        // 创建敌机模型
        this.createEnemyModel();
        
        // 创建生命值条
        this.createHealthBar();
        
        // 状态效果
        this.effects = {
            hit: false,
            hitTime: 0
        };
        
        // 随机暂停行为
        this.pauseMovement = {
            isPaused: false,
            pauseDuration: 0,
            pauseTimer: 0,
            pauseInterval: 5 + Math.random() * 10 // 5-15秒之间随机暂停一次
        };
    }
    
    generateRandomPath() {
        // 在玩家周围生成随机路径点，更大范围，更少点
        this.pathPoints = [];
        const centerPoint = drone ? drone.position.clone() : new THREE.Vector3();
        
        // 总是以当前位置为起点
        this.pathPoints.push(this.position.clone());
        
        // 生成更少的随机路径点
        const pointCount = 2 + Math.floor(Math.random() * 2); // 2-3个点，原来是3-5
        for (let i = 0; i < pointCount; i++) {
            // 在玩家周围产生一个随机点，更大范围
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 60; // 更远的距离
            const height = 10 + Math.random() * 20;
            
            const point = new THREE.Vector3(
                centerPoint.x + Math.cos(angle) * distance,
                height,
                centerPoint.z + Math.sin(angle) * distance
            );
            
            this.pathPoints.push(point);
        }
        
        // 添加一个不太接近玩家的点
        const attackPoint = centerPoint.clone().add(
            new THREE.Vector3(
                (Math.random() - 0.5) * 80, // 更大范围
                (Math.random() - 0.5) * 20 + 15, // 更高
                (Math.random() - 0.5) * 80 // 更大范围
            )
        );
        this.pathPoints.push(attackPoint);
        
        // 重置路径索引
        this.pathIndex = 0;
    }
    
    createEnemyModel() {
        this.group = new THREE.Group();
        
        // 敌机主体 - 更复杂的几何体
        const bodyGeometry = new THREE.BoxGeometry(2.5, 0.5, 2.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x0000FF, // 蓝色敌机
            emissive: 0x000033,
            emissiveIntensity: 0.5,
            metalness: 0.7,
            roughness: 0.3
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.group.add(this.body);
        
        // 敌机顶部
        const topGeometry = new THREE.ConeGeometry(1, 1, 6);
        const topMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x222266,
            metalness: 0.8,
            roughness: 0.2
        });
        const top = new THREE.Mesh(topGeometry, topMaterial);
        top.position.set(0, 0.5, 0);
        top.castShadow = true;
        this.group.add(top);
        
        // 敌机旋翼
        const rotorGeometry = new THREE.CylinderGeometry(0.6, 0.6, 0.1, 16);
        const rotorMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00FFFF,
            emissive: 0x003333,
            emissiveIntensity: 0.3
        });
        
        // 四个旋翼
        this.rotors = [];
        const rotorPositions = [
            new THREE.Vector3(1.0, 0.3, 1.0),
            new THREE.Vector3(-1.0, 0.3, 1.0),
            new THREE.Vector3(-1.0, 0.3, -1.0),
            new THREE.Vector3(1.0, 0.3, -1.0)
        ];
        
        rotorPositions.forEach((position, index) => {
            const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
            rotor.position.copy(position);
            rotor.castShadow = true;
            this.rotors.push(rotor);
            this.group.add(rotor);
            
            // 添加旋翼叶片
            const bladeGeometry = new THREE.BoxGeometry(1.5, 0.05, 0.2);
            const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
            for (let i = 0; i < 2; i++) {
                const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
                blade.position.copy(position);
                blade.rotation.set(0, (i * Math.PI) / 2, 0);
                blade.castShadow = true;
                this.rotors.push(blade);
                this.group.add(blade);
            }
        });
        
        // 添加武器挂载点
        this.weaponMounts = [];
        const weaponGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8);
        const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        [-0.8, 0.8].forEach(x => {
            const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
            weapon.position.set(x, -0.2, -1);
            weapon.castShadow = true;
            this.weaponMounts.push(weapon);
            this.group.add(weapon);
        });
        
        // 敌机位置
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        scene.add(this.group);
    }
    
    createHealthBar() {
        // 创建3D生命值条背景
        const bgGeometry = new THREE.PlaneGeometry(3, 0.3);
        const bgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x000000,
            transparent: true,
            opacity: 0.5,
            depthTest: false
        });
        this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
        this.healthBarBg.position.set(0, 2, 0);
        this.group.add(this.healthBarBg);
        
        // 创建3D生命值条前景
        const fgGeometry = new THREE.PlaneGeometry(2.8, 0.2);
        const fgMaterial = new THREE.MeshBasicMaterial({ 
            color: 0x00FF00,
            transparent: true,
            opacity: 0.8,
            depthTest: false
        });
        this.healthBarFg = new THREE.Mesh(fgGeometry, fgMaterial);
        this.healthBarFg.position.set(0, 2, 0.01);
        this.group.add(this.healthBarFg);
        
        // 确保生命值条面向摄像机
        this.updateHealthBar();
    }
    
    updateHealthBar() {
        // 更新生命值条的朝向，始终面向摄像机
        this.healthBarBg.lookAt(camera.position);
        this.healthBarFg.lookAt(camera.position);
        
        // 更新生命值条的宽度反映当前生命值
        const healthPercent = this.health / this.maxHealth;
        this.healthBarFg.scale.x = healthPercent;
        
        // 偏移前景条使其左对齐
        this.healthBarFg.position.x = -1.4 * (1 - healthPercent);
        
        // 根据生命值变化颜色
        if (healthPercent > 0.6) {
            this.healthBarFg.material.color.setHex(0x00FF00); // 绿色
        } else if (healthPercent > 0.3) {
            this.healthBarFg.material.color.setHex(0xFFFF00); // 黄色
        } else {
            this.healthBarFg.material.color.setHex(0xFF0000); // 红色
        }
        
        // 低生命值时闪烁
        if (healthPercent < 0.2) {
            const pulse = (Math.sin(Date.now() * 0.01) + 1) * 0.5;
            this.healthBarFg.material.opacity = 0.5 + pulse * 0.5;
        } else {
            this.healthBarFg.material.opacity = 0.8;
        }
    }
    
    update(deltaTime, playerPosition) {
        if (!this.active) return;
        
        // 动画旋翼
        this.animateRotors(deltaTime);
        
        // 高级运动轨迹
        this.followPath(deltaTime, playerPosition);
        
        // 定期生成新的路径
        if (Date.now() - this.lastPathUpdateTime > this.pathUpdateInterval) {
            this.generateRandomPath();
            this.lastPathUpdateTime = Date.now();
        }
        
        // 增加判断：无论敌机在什么状态下，如果玩家在视线范围内都应当尝试攻击
        this.tryFireAtPlayer(deltaTime, playerPosition);
        
        // 更新位置和旋转
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        
        // 更新生命值条
        this.updateHealthBar();
        
        // 更新特效
        this.updateEffects(deltaTime);
    }
    
    followPath(deltaTime, playerPosition) {
        // 随机暂停处理
        if (this.updatePauseState(deltaTime)) {
            // 如果处于暂停状态，不移动
            return;
        }
        
        if (this.pathPoints.length === 0) {
            this.generateRandomPath();
            return;
        }
        
        // 获取当前目标路径点
        const targetPoint = this.pathPoints[this.pathIndex];
        
        // 计算到目标点的方向
        const toTarget = new THREE.Vector3().subVectors(targetPoint, this.position);
        const distance = toTarget.length();
        
        // 计算到玩家的方向和距离
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        const distanceToPlayer = toPlayer.length();
        
        // 如果玩家在较近的范围内，优先朝向玩家而不是路径点
        if (distanceToPlayer < 50) {
            // 计算朝向玩家的旋转角度
            const targetRotationToPlayer = Math.atan2(toPlayer.x, toPlayer.z);
            let angleDiffToPlayer = targetRotationToPlayer - this.rotation.y;
            
            while (angleDiffToPlayer > Math.PI) angleDiffToPlayer -= Math.PI * 2;
            while (angleDiffToPlayer < -Math.PI) angleDiffToPlayer += Math.PI * 2;
            
            // 更快地转向玩家
            const rotationSpeedToPlayer = Math.min(1.2, Math.abs(angleDiffToPlayer)) * this.turnSpeed * 1.5;
            this.rotation.y += Math.sign(angleDiffToPlayer) * rotationSpeedToPlayer * deltaTime;
        } else {
            // 原来的路径跟随逻辑
            if (distance < 8) { // 增加接近范围，原来是5
                this.pathIndex = (this.pathIndex + 1) % this.pathPoints.length;
                
                // 如果轨迹完成一圈，生成新的路径
                if (this.pathIndex === 0) {
                    this.generateRandomPath();
                }
                return;
            }
            
            // 计算理想旋转
            const targetRotation = Math.atan2(toTarget.x, toTarget.z);
            
            // 平滑旋转，降低旋转速度
            let angleDiff = targetRotation - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 旋转速度与角度差成正比，但整体减慢
            const rotationSpeed = Math.min(0.8, Math.abs(angleDiff)) * this.turnSpeed;
            this.rotation.y += Math.sign(angleDiff) * rotationSpeed * deltaTime;
            
            // 速度控制 - 距离越近速度越慢，整体减慢
            let targetSpeed = 0;
            
            // 根据距离调整速度，整体降低
            if (distance > 50) {
                targetSpeed = this.maxSpeed * 0.6; // 只使用60%的最大速度
            } else {
                // 接近目标点时显著减速
                targetSpeed = (distance / 50) * this.maxSpeed * 0.4;
            }
            
            // 更慢的加速/减速
            this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, 0.02); // 原来是0.05
            
            // 根据旋转计算前向向量
            const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
            
            // 移动敌机
            const moveAmount = forward.multiplyScalar(this.speed * deltaTime);
            this.position.add(moveAmount);
            
            // 更缓慢地调整高度
            this.position.y += (targetPoint.y - this.position.y) * 0.01; // 原来是0.02
            
            // 添加小幅度随机运动让飞行更自然，但减少频率
            if (Math.random() < 0.02) { // 原来是0.05
                this.position.x += (Math.random() - 0.5) * 0.3;
                this.position.y += (Math.random() - 0.5) * 0.2;
                this.position.z += (Math.random() - 0.5) * 0.3;
            }
            
            // 确保不要低于地面
            if (this.position.y < 2) {
                this.position.y = 2;
            }
        }
    }
    
    updateEffects(deltaTime) {
        // 处理受击特效
        if (this.effects.hit) {
            // 受击闪烁效果
            const elapsedTime = Date.now() - this.effects.hitTime;
            if (elapsedTime > 200) {
                this.effects.hit = false;
                this.body.material.emissive.setHex(0x000033);
            }
        }
    }
    
    tryFireAtPlayer(deltaTime, playerPosition) {
        const currentTime = Date.now() / 1000;
        
        // 检查发射冷却
        if (currentTime - this.lastFireTime < 1 / this.fireRate) return;
        
        // 计算到玩家的向量
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
        const distance = toPlayer.length();
        
        // 调整射击范围和条件
        if (distance < 100) { // 增加射击范围
            // 计算玩家相对于敌机的角度
            const targetRotation = Math.atan2(toPlayer.x, toPlayer.z);
            let angleDiff = targetRotation - this.rotation.y;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            
            // 扩大射击角度范围，让敌机更容易射中玩家
            const firingAngle = distance < 40 ? Math.PI / 3 : Math.PI / 4;
            
            if (Math.abs(angleDiff) < firingAngle) {
                // 从左右武器挂载点轮流发射
                const weaponIndex = Math.round(currentTime * this.fireRate) % 2;
                const weaponMount = this.weaponMounts[weaponIndex];
                
                // 计算枪口世界坐标
                const gunPosition = new THREE.Vector3();
                weaponMount.getWorldPosition(gunPosition);
                
                // 射击精度随距离变化
                const accuracy = (distance < 30) ? 0.05 : (distance < 60 ? 0.15 : 0.25);
                
                const direction = toPlayer.clone().normalize();
                
                // 预测玩家移动进行射击
                if (drone && drone.velocity) {
                    // 基于玩家当前速度进行简单预测
                    const predictFactor = distance / 100; // 距离越远预测越多
                    direction.add(drone.velocity.clone().multiplyScalar(predictFactor * 0.03));
                    direction.normalize();
                }
                
                // 随机偏移，但不太大
                direction.x += (Math.random() - 0.5) * accuracy;
                direction.y += (Math.random() - 0.5) * accuracy;
                direction.z += (Math.random() - 0.5) * accuracy;
                direction.normalize();
                
                // 创建子弹，稍微提高速度
                projectileSystem.createProjectile(gunPosition, direction, 85, this, 0x00FFFF);
                
                // 创建枪口闪光效果
                this.createMuzzleFlash(weaponMount.position.clone(), weaponIndex);
                
                // 更新发射时间
                this.lastFireTime = currentTime;
            }
        }
    }
    
    createMuzzleFlash(position, side) {
        // 创建枪口闪光
        const flashGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const flashMaterial = new THREE.MeshBasicMaterial({
            color: 0x00FFFF,
            transparent: true,
            opacity: 1
        });
        
        const flash = new THREE.Mesh(flashGeometry, flashMaterial);
        
        // 相对于机身的局部坐标
        const localPos = position.clone();
        localPos.z -= 0.5; // 向前
        
        flash.position.copy(localPos);
        this.group.add(flash);
        
        // 闪光动画
        let scale = 1;
        const animate = () => {
            scale -= 0.1;
            if (scale <= 0) {
                this.group.remove(flash);
                return;
            }
            
            flash.scale.set(scale, scale, scale * 3);
            flash.material.opacity = scale;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    animateRotors(deltaTime) {
        // 旋翼旋转动画
        const rotationSpeed = 20;
        for (let i = 0; i < this.rotors.length; i += 3) {
            this.rotors[i].rotation.y += rotationSpeed * deltaTime;
            this.rotors[i+1].rotation.y += rotationSpeed * deltaTime;
            this.rotors[i+2].rotation.y += rotationSpeed * deltaTime;
        }
    }
    
    damage(amount) {
        this.health -= amount;
        
        // 受伤闪烁效果
        this.body.material.emissive.setHex(0xFF0000);
        this.effects.hit = true;
        this.effects.hitTime = Date.now();
        
        // 显示伤害数字
        this.showDamageNumber(amount);
        
        if (this.health <= 0) {
            this.destroy();
        }
    }
    
    showDamageNumber(amount) {
        // 创建伤害数字HTML元素
        const damageEl = document.createElement('div');
        damageEl.className = 'damage-number';
        damageEl.textContent = Math.round(amount);
        document.body.appendChild(damageEl);
        
        // 将3D位置转换为屏幕坐标
        const screenPosition = this.position.clone().project(camera);
        const x = (screenPosition.x * 0.5 + 0.5) * window.innerWidth;
        const y = (1 - (screenPosition.y * 0.5 + 0.5)) * window.innerHeight;
        
        // 设置初始位置
        damageEl.style.left = x + 'px';
        damageEl.style.top = y + 'px';
        
        // 动画效果
        let opacity = 1;
        let offsetY = 0;
        
        const animate = () => {
            opacity -= 0.02;
            offsetY -= 1;
            
            if (opacity <= 0) {
                document.body.removeChild(damageEl);
                return;
            }
            
            damageEl.style.opacity = opacity;
            damageEl.style.transform = `translate(-50%, -50%) translateY(${offsetY}px)`;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    destroy() {
        if (!this.active) return;
        
        this.active = false;
        
        // 爆炸效果
        this.createExplosion();
        
        // 从场景中移除
        scene.remove(this.group);
    }
    
    createExplosion() {
        // 创建多个爆炸粒子系统
        this.createExplosionParticles(0xFFFF00, 50, 1.5);  // 黄色内爆
        this.createExplosionParticles(0xFF5500, 70, 2.5);  // 橙色中爆
        this.createExplosionParticles(0xFF0000, 40, 3.5);  // 红色外爆
        
        // 爆炸冲击波
        this.createShockwave();
        
        // 爆炸声音 (浏览器可能会阻止未经用户交互的音频播放)
        // 可以在此处添加音效代码
    }
    
    createExplosionParticles(color, count, size) {
        const particleCount = count;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = []; // 存储每个粒子的速度
        
        for (let i = 0; i < particleCount; i++) {
            // 随机位置
            positions[i * 3] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
            
            // 随机速度
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ));
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            size: size,
            color: color,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 1
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(this.position);
        scene.add(particles);
        
        // 粒子动画
        let animationTime = 0;
        const animationDuration = 2.0; // 2秒动画
        
        const animate = () => {
            animationTime += 0.016; // 大约16ms每帧
            
            if (animationTime > animationDuration) {
                scene.remove(particles);
                return;
            }
            
            const progress = animationTime / animationDuration;
            material.opacity = 1 - progress;
            
            // 更新每个粒子的位置
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const velocity = velocities[i];
                
                // 应用速度并加入一些重力和阻力效果
                positions[i3] += velocity.x * 0.016;
                positions[i3 + 1] += velocity.y * 0.016 - 9.8 * 0.016 * 0.016; // 轻微重力
                positions[i3 + 2] += velocity.z * 0.016;
                
                // 阻力减慢速度
                velocity.multiplyScalar(0.98);
            }
            
            geometry.attributes.position.needsUpdate = true;
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    createShockwave() {
        // 创建冲击波环
        const geometry = new THREE.RingGeometry(0.1, 0.5, 32);
        const material = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const shockwave = new THREE.Mesh(geometry, material);
        shockwave.position.copy(this.position);
        
        // 冲击波始终面向摄像机
        shockwave.lookAt(camera.position);
        
        scene.add(shockwave);
        
        // 冲击波动画
        let size = 0.5;
        const maxSize = 20;
        
        const animate = () => {
            size *= 1.2;
            shockwave.scale.set(size, size, size);
            shockwave.material.opacity = 0.7 * (1 - size / maxSize);
            
            if (size >= maxSize) {
                scene.remove(shockwave);
                return;
            }
            
            // 确保冲击波始终面向摄像机
            shockwave.lookAt(camera.position);
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    updatePauseState(deltaTime) {
        // 更新暂停状态
        if (this.pauseMovement.isPaused) {
            this.pauseMovement.pauseTimer += deltaTime;
            if (this.pauseMovement.pauseTimer >= this.pauseMovement.pauseDuration) {
                // 暂停结束
                this.pauseMovement.isPaused = false;
                this.pauseMovement.pauseTimer = 0;
            }
            return true; // 仍处于暂停状态
        } else {
            // 检查是否应该开始暂停
            if (Math.random() < 0.002) { // 每帧有0.2%的几率进入暂停状态
                this.pauseMovement.isPaused = true;
                this.pauseMovement.pauseDuration = 2 + Math.random() * 3; // 暂停2-5秒
                this.pauseMovement.pauseTimer = 0;
                return true;
            }
            return false; // 未暂停
        }
    }
}

class EnemySystem {
    constructor(maxEnemies = 5) {
        this.maxEnemies = maxEnemies;
        this.enemies = [];
        this.enemiesDestroyed = 0;
        
        // 敌机重生相关
        this.respawnQueue = []; // 存储待重生的敌机信息
        this.respawnDelay = 5000; // 重生延迟增加到5秒(毫秒)
        
        // 添加敌机可视化指示器功能
        this.showIndicators = true;
        this.indicators = [];
    }
    
    initialize() {
        // 初始生成一些敌机，按不同方向分布
        const angles = [0, Math.PI/2, Math.PI, Math.PI*1.5, Math.PI/4];
        for (let i = 0; i < this.maxEnemies; i++) {
            const angle = angles[i % angles.length];
            this.spawnEnemyAtAngle(angle);
        }
    }
    
    spawnEnemy(playerPosition) {
        playerPosition = playerPosition || (drone ? drone.position : new THREE.Vector3());
        
        // 在玩家视线前方更远的地方生成敌机，确保玩家能看到
        const angle = Math.random() * Math.PI * 0.5 - Math.PI * 0.25 + (drone ? drone.rotation.y : 0);
        const distance = 100 + Math.random() * 50; // 更远的初始距离
        
        const position = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            playerPosition.y + 20 + Math.random() * 20, // 更高一些
            playerPosition.z + Math.sin(angle) * distance
        );
        
        const enemy = new Enemy(position);
        this.enemies.push(enemy);
        return enemy;
    }
    
    spawnEnemyAtAngle(angle) {
        // 确保玩家存在
        const playerPosition = drone ? drone.position.clone() : new THREE.Vector3();
        
        // 在指定角度方向生成敌机
        const distance = 100 + Math.random() * 30;
        
        const position = new THREE.Vector3(
            playerPosition.x + Math.cos(angle) * distance,
            playerPosition.y + 15 + Math.random() * 20,
            playerPosition.z + Math.sin(angle) * distance
        );
        
        const enemy = new Enemy(position);
        
        // 让敌机初始朝向玩家
        const toPlayer = new THREE.Vector3().subVectors(playerPosition, position);
        enemy.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
        
        this.enemies.push(enemy);
        return enemy;
    }
    
    update(deltaTime, playerPosition) {
        // 处理重生队列
        this.processRespawnQueue(playerPosition);
        
        // 更新所有敌机
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].active) {
                this.enemies[i].update(deltaTime, playerPosition);
                
                // 确保敌机不会离玩家太远
                const distance = playerPosition.distanceTo(this.enemies[i].position);
                if (distance > 300) {
                    // 如果敌机太远，将其传送到玩家附近
                    this.repositionEnemyNearPlayer(this.enemies[i], playerPosition);
                }
            } else {
                // 敌机已被摧毁，添加到重生队列
                this.queueEnemyRespawn();
                
                // 从活动敌机列表中移除
                this.enemies.splice(i, 1);
                this.enemiesDestroyed++;
            }
        }
        
        // 更新方向指示器
        this.updateIndicators(playerPosition);
    }
    
    queueEnemyRespawn() {
        // 将敌机添加到重生队列
        this.respawnQueue.push({
            time: Date.now(),
            position: new THREE.Vector3()
        });
        
        // 显示击杀确认消息
        this.showKillConfirmation();
    }
    
    showKillConfirmation() {
        // 创建击杀确认提示
        const killConfirmEl = document.createElement('div');
        killConfirmEl.className = 'kill-confirm';
        killConfirmEl.textContent = '敌机已击毁！';
        document.body.appendChild(killConfirmEl);
        
        // 动画结束后移除元素
        setTimeout(() => {
            if (document.body.contains(killConfirmEl)) {
                document.body.removeChild(killConfirmEl);
            }
        }, 1500);
    }
    
    processRespawnQueue(playerPosition) {
        // 确保敌机数量不超过最大值
        if (this.enemies.length >= this.maxEnemies) {
            return;
        }
        
        const currentTime = Date.now();
        
        for (let i = this.respawnQueue.length - 1; i >= 0; i--) {
            const respawnInfo = this.respawnQueue[i];
            
            if (currentTime - respawnInfo.time >= this.respawnDelay) {
                // 从重生队列中移除
                this.respawnQueue.splice(i, 1);
                
                // 生成新的敌机
                if (this.enemies.length < this.maxEnemies) {
                    this.spawnEnemy(playerPosition);
                }
            }
        }
    }
    
    repositionEnemyNearPlayer(enemy, playerPosition) {
        // 计算新位置，使敌机出现在玩家前方
        const playerDirection = new THREE.Vector3(0, 0, -1)
            .applyEuler(new THREE.Euler(0, drone.rotation.y, 0));
        
        const distance = 80 + Math.random() * 30;
        const offsetAngle = (Math.random() - 0.5) * Math.PI * 0.5;
        
        const rotationMatrix = new THREE.Matrix4().makeRotationY(offsetAngle);
        const newDirection = playerDirection.clone().applyMatrix4(rotationMatrix).normalize();
        
        enemy.position.copy(playerPosition)
            .add(newDirection.multiplyScalar(distance))
            .add(new THREE.Vector3(0, 10 + Math.random() * 20, 0));
    }
    
    updateIndicators(playerPosition) {
        // 为屏幕外的敌机添加方向指示器
        if (!this.showIndicators) return;
        
        // 清理旧指示器
        while (this.indicators.length > 0) {
            const indicator = this.indicators.pop();
            document.body.removeChild(indicator);
        }
        
        // 获取视图范围
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const padding = 30; // 屏幕边缘内边距
        
        // 为每个屏幕外的敌机创建指示器
        this.enemies.forEach(enemy => {
            if (!enemy.active) return;
            
            // 将3D位置转换为屏幕坐标
            const enemyPosition = enemy.position.clone();
            const vector = enemyPosition.project(camera);
            
            // 转换为屏幕像素坐标
            const x = (vector.x * 0.5 + 0.5) * viewWidth;
            const y = (1 - (vector.y * 0.5 + 0.5)) * viewHeight;
            
            // 检查敌机是否在屏幕外
            if (x < padding || x > viewWidth - padding || 
                y < padding || y > viewHeight - padding || 
                vector.z > 1) {
                
                // 计算指示器位置
                let indicatorX = Math.max(padding, Math.min(viewWidth - padding, x));
                let indicatorY = Math.max(padding, Math.min(viewHeight - padding, y));
                
                // 创建指示器元素
                const indicator = document.createElement('div');
                indicator.className = 'enemy-indicator';
                indicator.style.position = 'absolute';
                indicator.style.left = indicatorX + 'px';
                indicator.style.top = indicatorY + 'px';
                indicator.style.width = '15px';
                indicator.style.height = '15px';
                indicator.style.borderRadius = '50%';
                indicator.style.backgroundColor = 'rgba(255, 50, 50, 0.7)';
                indicator.style.transform = 'translate(-50%, -50%)';
                indicator.style.boxShadow = '0 0 5px red';
                indicator.style.zIndex = '1000';
                
                // 添加到DOM
                document.body.appendChild(indicator);
                this.indicators.push(indicator);
            }
        });
    }
    
    handleCollisions(collisions) {
        for (const collision of collisions) {
            if (collision.target instanceof Enemy) {
                collision.target.damage(34); // 子弹造成34点伤害
            }
        }
    }
}

// 全局单例
const enemySystem = new EnemySystem(5); // 5个敌机
