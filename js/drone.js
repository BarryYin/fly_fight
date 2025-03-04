// 无人机类
class Drone {
    constructor() {
        try {
            // 无人机状态
            this.position = new THREE.Vector3(0, 5, 0); // 将高度降低，更容易被看到
            this.rotation = new THREE.Euler(0, 0, 0);
            this.velocity = new THREE.Vector3(0, 0, 0);
            this.speed = 0;
            this.battery = 100;
            this.maxSpeed = 50; // 最大速度
            
            // 控制状态
            this.controls = {
                moveForward: false,
                moveBackward: false,
                moveLeft: false,
                moveRight: false,
                moveUp: false,
                moveDown: false,
                rotateLeft: false,
                rotateRight: false
            };
            
            // 添加武器系统属性
            this.health = 100;
            this.lastFireTime = 0;
            this.fireRate = 5; // 每秒发射子弹数
            this.active = true;
            
            // 添加视角控制属性
            this.mouseControl = {
                enabled: true,
                sensitivity: 0.002,
                verticalLimit: Math.PI / 3, // 限制垂直视角范围
                verticalAngle: 0
            };
            
            // 创建无人机3D模型
            this.createDroneModel();
            
            // 设置无人机相机
            this.setupCamera();
            
            // 添加键盘控制事件监听
            this.setupControls();
            
            console.log('无人机已初始化，位置:', this.position);
        } catch (error) {
            console.error('无人机初始化失败:', error);
        }
    }
    
    createDroneModel() {
        this.group = new THREE.Group();
        
        // 无人机主体 - 使用更明显的颜色
        const bodyGeometry = new THREE.BoxGeometry(2, 0.5, 2);
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xFF0000,
            emissive: 0x330000, // 添加发光属性
            emissiveIntensity: 0.2
        });
        this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.body.castShadow = true;
        this.group.add(this.body);
        
        // 无人机旋翼 - 使用更明显的颜色
        const rotorGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
        const rotorMaterial = new THREE.MeshStandardMaterial({ color: 0x00FF00 }); // 绿色更醒目
        
        // 四个旋翼
        this.rotors = [];
        const rotorPositions = [
            new THREE.Vector3(0.8, 0.3, 0.8),
            new THREE.Vector3(-0.8, 0.3, 0.8),
            new THREE.Vector3(-0.8, 0.3, -0.8),
            new THREE.Vector3(0.8, 0.3, -0.8)
        ];
        
        rotorPositions.forEach(position => {
            const rotor = new THREE.Mesh(rotorGeometry, rotorMaterial);
            rotor.position.copy(position);
            rotor.castShadow = true;
            this.rotors.push(rotor);
            this.group.add(rotor);
        });
        
        // 添加前方向标识 - 明显的箭头或三角形
        this.addDirectionIndicator();
        
        // 添加到场景
        this.group.position.copy(this.position);
        scene.add(this.group);
        
        console.log('无人机模型已创建并添加到场景');
    }
    
    // 添加前方向标识
    addDirectionIndicator() {
        // 添加一个明显的前方向箭头
        const arrowShape = new THREE.Shape();
        // 修正箭头方向 - 使尖端指向Z轴负方向(前方)
        arrowShape.moveTo(0, 0.5);    // 前端尖点
        arrowShape.lineTo(-0.4, -0.5); // 左后点
        arrowShape.lineTo(0.4, -0.5);  // 右后点
        arrowShape.lineTo(0, 0.5);    // 回到前端尖点
        
        const extrudeSettings = {
            steps: 1,
            depth: 0.2,
            bevelEnabled: false
        };
        
        const arrowGeometry = new THREE.ExtrudeGeometry(arrowShape, extrudeSettings);
        const arrowMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF00,  // 黄色
            emissive: 0x555500,
            emissiveIntensity: 0.5
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.rotation.x = -Math.PI / 2;  // 让箭头水平放置
        // 更新位置，使箭头确实位于前方
        arrow.position.set(0, 0.3, -1.2); // 放在无人机前方上部
        arrow.castShadow = true;
        
        this.group.add(arrow);
        
        // 添加闪烁效果
        this.directionIndicator = arrow;
        this.pulseAnimation();
    }
    
    // 方向指示器闪烁效果
    pulseAnimation() {
        const initialIntensity = 0.5;
        let time = 0;
        
        const animate = () => {
            if (!this.active || !this.directionIndicator) return;
            
            time += 0.03;
            const intensity = initialIntensity + Math.sin(time) * 0.3;
            
            if (this.directionIndicator.material) {
                this.directionIndicator.material.emissiveIntensity = intensity;
            }
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    setupCamera() {
        // 在无人机后方设置相机，更好的视角
        this.cameraOffset = new THREE.Vector3(0, 2, 8);
        
        // 创建辅助向量
        this.cameraPosition = new THREE.Vector3();
        this.cameraTarget = new THREE.Vector3();
        
        // 初始化相机位置
        this.updateCamera();
        
        // 添加鼠标控制
        this.setupMouseControl();
        
        console.log('相机设置完成');
    }
    
    setupMouseControl() {
        // 鼠标移动事件
        document.addEventListener('mousemove', (event) => {
            if (this.mouseControl.enabled && document.pointerLockElement) {
                // 水平旋转 (绕Y轴)
                this.rotation.y -= event.movementX * this.mouseControl.sensitivity;
                
                // 垂直视角（限制范围）
                this.mouseControl.verticalAngle -= event.movementY * this.mouseControl.sensitivity;
                this.mouseControl.verticalAngle = Math.max(
                    -this.mouseControl.verticalLimit, 
                    Math.min(this.mouseControl.verticalLimit, this.mouseControl.verticalAngle)
                );
            }
        });
        
        // 点击鼠标锁定指针
        document.addEventListener('click', () => {
            if (this.mouseControl.enabled && !document.pointerLockElement) {
                renderer.domElement.requestPointerLock();
            }
        });
        
        // 添加按键切换视角模式
        document.addEventListener('keydown', (event) => {
            if (event.code === 'KeyV') {
                this.toggleViewMode();
            }
        });
        
        // 提示用户点击鼠标控制视角
        const instructions = document.createElement('div');
        instructions.style.position = 'absolute';
        instructions.style.bottom = '20px';
        instructions.style.width = '100%';
        instructions.style.textAlign = 'center';
        instructions.style.color = 'white';
        instructions.style.fontSize = '14px';
        instructions.style.textShadow = '1px 1px 2px black';
        instructions.innerHTML = '点击鼠标开始控制视角<br>按V键切换第一/第三人称视角';
        document.body.appendChild(instructions);
        
        // 3秒后自动隐藏提示
        setTimeout(() => {
            instructions.style.opacity = '0.5';
            setTimeout(() => {
                instructions.style.display = 'none';
            }, 2000);
        }, 3000);
    }
    
    toggleViewMode() {
        // 切换第一人称/第三人称视角
        if (this.cameraOffset.z > 0) {
            // 切换到第一人称
            this.cameraOffset.set(0, 0.5, -0.3);
        } else {
            // 切换到第三人称
            this.cameraOffset.set(0, 2, 8);
        }
    }
    
    setupControls() {
        // 键盘按下事件
        document.addEventListener('keydown', (event) => {
            switch(event.code) {
                // 使用方向键控制前后左右移动
                case 'ArrowUp': this.controls.moveForward = true; break;
                case 'ArrowDown': this.controls.moveBackward = true; break;
                case 'ArrowLeft': this.controls.rotateLeft = true; break;
                case 'ArrowRight': this.controls.rotateRight = true; break;
                
                // 使用A和D控制左右平移
                case 'KeyA': this.controls.moveLeft = true; break;
                case 'KeyD': this.controls.moveRight = true; break;
                
                // 使用W和S控制上升下降
                case 'KeyW': this.controls.moveUp = true; break;
                case 'KeyS': this.controls.moveDown = true; break;
                
                // 其他控制保持不变
                case 'Space': this.fire(); break;
            }
        });
        
        // 键盘抬起事件
        document.addEventListener('keyup', (event) => {
            switch(event.code) {
                // 使用方向键控制前后左右移动
                case 'ArrowUp': this.controls.moveForward = false; break;
                case 'ArrowDown': this.controls.moveBackward = false; break;
                case 'ArrowLeft': this.controls.rotateLeft = false; break;
                case 'ArrowRight': this.controls.rotateRight = false; break;
                
                // 使用A和D控制左右平移
                case 'KeyA': this.controls.moveLeft = false; break;
                case 'KeyD': this.controls.moveRight = false; break;
                
                // 使用W和S控制上升下降
                case 'KeyW': this.controls.moveUp = false; break;
                case 'KeyS': this.controls.moveDown = false; break;
            }
        });
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // 控制处理
        this.handleControls(deltaTime);
        
        // 应用物理
        this.applyPhysics(deltaTime);
        
        // 更新模型位置和旋转
        this.group.position.copy(this.position);
        this.group.rotation.copy(this.rotation);
        
        // 动画旋翼
        this.animateRotors(deltaTime);
        
        // 更新相机位置
        this.updateCamera();
        
        // 更新HUD信息
        this.updateHUD();
        
        // 电量消耗
        this.consumeBattery(deltaTime);
        
        // 更新碰撞检测
        this.checkCollisions();
    }
    
    handleControls(deltaTime) {
        const acceleration = 20; // 加速度
        const rotationSpeed = 1.5; // 旋转速度
        
        // 前后移动
        if (this.controls.moveForward) {
            this.velocity.z -= acceleration * deltaTime;
        }
        if (this.controls.moveBackward) {
            this.velocity.z += acceleration * deltaTime;
        }
        
        // 左右移动
        if (this.controls.moveLeft) {
            this.velocity.x -= acceleration * deltaTime;
        }
        if (this.controls.moveRight) {
            this.velocity.x += acceleration * deltaTime;
        }
        
        // 上下移动
        if (this.controls.moveUp) {
            this.velocity.y += acceleration * deltaTime;
        }
        if (this.controls.moveDown) {
            this.velocity.y -= acceleration * deltaTime;
        }
        
        // 旋转
        if (this.controls.rotateLeft) {
            this.rotation.y += rotationSpeed * deltaTime;
        }
        if (this.controls.rotateRight) {
            this.rotation.y -= rotationSpeed * deltaTime;
        }
    }
    
    applyPhysics(deltaTime) {
        // 应用阻力
        const drag = 0.95;
        this.velocity.multiplyScalar(drag);
        
        // 限制最大速度
        this.speed = this.velocity.length();
        if (this.speed > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        // 应用重力
        this.velocity.y -= 9.8 * deltaTime * 0.3; // 轻微的重力
        
        // 防止飞行低于地平面
        if (this.position.y < 0.5 && this.velocity.y < 0) {
            this.position.y = 0.5;
            this.velocity.y = 0;
        }
        
        // 计算移动方向
        const direction = new THREE.Vector3(0, 0, 1).applyEuler(this.rotation);
        const velocity = new THREE.Vector3();
        
        // 根据无人机朝向转换速度矢量
        velocity.z = this.velocity.z * direction.z + this.velocity.x * direction.x;
        velocity.x = this.velocity.x * direction.z - this.velocity.z * direction.x;
        velocity.y = this.velocity.y;
        
        // 更新位置
        this.position.add(velocity.multiplyScalar(deltaTime));
    }
    
    animateRotors(deltaTime) {
        // 旋翼旋转动画
        const rotationSpeed = 20;
        this.rotors.forEach(rotor => {
            rotor.rotation.y += rotationSpeed * deltaTime;
        });
    }
    
    updateCamera() {
        // 计算相机位置相对于无人机的偏移
        const offset = this.cameraOffset.clone();
        
        // 应用垂直视角
        const verticalRotation = new THREE.Euler(this.mouseControl.verticalAngle, 0, 0);
        offset.applyEuler(verticalRotation);
        
        // 应用水平旋转
        offset.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        // 设置相机位置
        this.cameraPosition.copy(this.position).add(offset);
        camera.position.copy(this.cameraPosition);
        
        // 计算相机目标点 (前方一定距离)
        const lookDirection = new THREE.Vector3(0, 0, -10);
        lookDirection.applyEuler(verticalRotation);
        lookDirection.applyEuler(new THREE.Euler(0, this.rotation.y, 0));
        
        this.cameraTarget.copy(this.position).add(lookDirection);
        camera.lookAt(this.cameraTarget);
    }
    
    updateHUD() {
        document.getElementById('altitude').textContent = this.position.y.toFixed(1);
        document.getElementById('speed').textContent = Math.round(this.speed * 3.6); // m/s 转换为 km/h
        document.getElementById('battery').textContent = Math.round(this.battery);
        document.getElementById('coordinates').textContent = 
            `${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}, ${this.position.z.toFixed(1)}`;
    }
    
    consumeBattery(deltaTime) {
        // 电量消耗
        const consumptionRate = 0.5; // 每秒消耗率
        this.battery -= consumptionRate * deltaTime;
        
        // 额外消耗，取决于速度
        this.battery -= this.speed * 0.01 * deltaTime;
        
        // 限制电量范围
        this.battery = Math.max(0, Math.min(100, this.battery));
        
        // 如果电量为零，无法移动
        if (this.battery <= 0) {
            this.velocity.set(0, -1, 0); // 只有下降
        }
    }
    
    // 修改发射子弹功能
    fire() {
        if (!this.active) return;
        
        const currentTime = Date.now() / 1000;
        
        // 检查发射冷却
        if (currentTime - this.lastFireTime < 1 / this.fireRate) return;
        
        // 计算枪口位置和方向
        const gunOffset = new THREE.Vector3(0, -0.2, -1.5).applyEuler(this.rotation);
        const gunPosition = this.position.clone().add(gunOffset);
        
        // 计算射击方向 - 使用相机朝向而不是无人机朝向
        const direction = new THREE.Vector3();
        direction.subVectors(this.cameraTarget, this.cameraPosition).normalize();
        
        // 创建更大的子弹
        const customProjectile = projectileSystem.createProjectile(gunPosition, direction, 120, this, 0xFFFF00);
        
        // 增大玩家子弹尺寸
        if (customProjectile && customProjectile.mesh) {
            customProjectile.mesh.scale.set(1.5, 1.5, 1.5);
            if (customProjectile.glow) {
                customProjectile.glow.scale.set(2, 2, 2);
            }
        }
        
        // 更新发射时间
        this.lastFireTime = currentTime;
        
        // 添加发射音效
        if (audioManager) {
            audioManager.playSound('shot');
        }
    }
    
    checkCollisions() {
        if (!this.active) return;
        
        // 获取针对无人机的碰撞
        const targets = [this, ...enemySystem.enemies];
        const collisions = projectileSystem.checkCollisions(targets);
        
        // 处理敌机被击中
        enemySystem.handleCollisions(collisions);
        
        // 处理玩家被击中
        for (const collision of collisions) {
            if (collision.target === this) {
                this.damage(10); // 被敌人子弹击中扣10点血
            }
        }
    }
    
    damage(amount) {
        if (!this.active) return;
        
        // 震动屏幕效果
        this.cameraShake();
        
        this.health -= amount;
        
        // 受伤闪烁效果
        this.body.material.emissive.setRGB(1, 0, 0);
        setTimeout(() => {
            if (this.active) {
                this.body.material.emissive.setRGB(0.2, 0, 0);
            }
        }, 100);
        
        // 更新HUD显示
        document.getElementById('health').textContent = Math.max(0, Math.round(this.health));
        
        // 更新健康条UI
        this.updateHealthUI();
        
        if (this.health <= 0) {
            this.destroy();
        }
    }

    updateHealthUI() {
        // 获取健康条元素
        const healthBar = document.getElementById('health-bar');
        if (!healthBar) {
            return;
        }
        
        // 计算健康百分比
        const healthPercent = Math.max(0, Math.min(100, this.health)) / 100;
        
        // 更新健康条宽度
        const healthFill = healthBar.querySelector('.health-fill');
        if (healthFill) {
            healthFill.style.width = `${healthPercent * 100}%`;
            
            // 低生命值时添加警示效果
            if (healthPercent < 0.3) {
                healthBar.classList.add('low-health');
            } else {
                healthBar.classList.remove('low-health');
            }
        }
    }

    cameraShake() {
        // 相机震动效果
        const intensity = 0.3;
        const duration = 200; // 毫秒
        const startTime = Date.now();
        
        const originalPosition = this.cameraOffset.clone();
        
        const shakeAnimation = () => {
            const elapsed = Date.now() - startTime;
            if (elapsed < duration) {
                // 应用随机偏移
                this.cameraOffset.x = originalPosition.x + (Math.random() - 0.5) * intensity;
                this.cameraOffset.y = originalPosition.y + (Math.random() - 0.5) * intensity;
                
                // 继续动画
                requestAnimationFrame(shakeAnimation);
            } else {
                // 恢复原始位置
                this.cameraOffset.copy(originalPosition);
            }
        };
        
        // 开始震动动画
        shakeAnimation();
    }
    
    destroy() {
        if (!this.active) return;
        
        this.active = false;
        
        // 创建爆炸效果
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount; i++) {
            // 随机位置
            positions[i * 3] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 4;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
            
            // 红色和橙色粒子
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 0.3 * Math.random();
            colors[i * 3 + 2] = 0;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.7,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.position.copy(this.position);
        scene.add(particles);
        
        // 隐藏无人机模型
        this.group.visible = false;
        
        // 游戏结束逻辑
        setTimeout(() => {
            showGameOverScreen();
        }, 2000);
    }
}

// 游戏结束屏幕
function showGameOverScreen() {
    const gameOver = document.createElement('div');
    gameOver.style.position = 'absolute';
    gameOver.style.top = '50%';
    gameOver.style.left = '50%';
    gameOver.style.transform = 'translate(-50%, -50%)';
    gameOver.style.color = 'white';
    gameOver.style.fontSize = '32px';
    gameOver.style.fontWeight = 'bold';
    gameOver.style.textAlign = 'center';
    gameOver.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    gameOver.style.padding = '20px';
    gameOver.style.background = 'rgba(0,0,0,0.7)';
    gameOver.style.borderRadius = '10px';
    gameOver.style.zIndex = '1000';
    
    gameOver.innerHTML = `
        <div>游戏结束</div>
        <div style="font-size:24px; margin:15px 0;">击落敌机: ${enemySystem.enemiesDestroyed}</div>
        <button id="restartBtn" style="padding:10px 20px; font-size:18px; cursor:pointer; background:#4CAF50; border:none; color:white; border-radius:5px;">重新开始</button>
    `;
    
    document.body.appendChild(gameOver);
    
    document.getElementById('restartBtn').addEventListener('click', () => {
        location.reload();
    });
}
