// 子弹和碰撞系统

class Projectile {
    constructor(position, direction, speed, owner, color = 0xFFFF00) {
        this.position = position.clone();
        this.direction = direction.normalized ? direction.clone() : direction.clone().normalize();
        this.speed = speed;
        this.owner = owner; // 谁发射的子弹
        this.lifeTime = 3; // 子弹存在3秒
        this.active = true;
        
        // 创建子弹视觉效果
        const geometry = new THREE.SphereGeometry(0.2, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: color });
        this.mesh = new THREE.Mesh(geometry, material);
        
        // 添加拖尾效果
        this.trail = new THREE.Points(
            new THREE.BufferGeometry(),
            new THREE.PointsMaterial({
                color: color,
                size: 0.1,
                blending: THREE.AdditiveBlending,
                transparent: true,
                opacity: 0.7
            })
        );
        
        this.trailPositions = [];
        for (let i = 0; i < 10; i++) {
            this.trailPositions.push(this.position.clone());
        }
        
        this.updateTrail();
        
        // 添加到场景
        scene.add(this.mesh);
        scene.add(this.trail);
        
        // 添加发光效果
        this.addLightEffect(color);
    }
    
    addLightEffect(color) {
        // 创建点光源，增强视觉效果
        this.light = new THREE.PointLight(color, 1, 4);
        this.light.position.copy(this.position);
        scene.add(this.light);
        
        // 创建光晕效果
        const glowGeometry = new THREE.SphereGeometry(0.4, 8, 8);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.glow.position.copy(this.position);
        scene.add(this.glow);
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // 减少存活时间
        this.lifeTime -= deltaTime;
        if (this.lifeTime <= 0) {
            this.deactivate();
            return;
        }
        
        // 移动子弹
        const moveAmount = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(moveAmount);
        this.mesh.position.copy(this.position);
        
        // 更新光源和光晕位置
        if (this.light) {
            this.light.position.copy(this.position);
        }
        if (this.glow) {
            this.glow.position.copy(this.position);
            
            // 添加脉冲效果
            const scale = 1 + 0.1 * Math.sin(Date.now() * 0.01);
            this.glow.scale.set(scale, scale, scale);
        }
        
        // 更新拖尾
        this.trailPositions.pop();
        this.trailPositions.unshift(this.position.clone());
        this.updateTrail();
    }
    
    updateTrail() {
        const positions = new Float32Array(this.trailPositions.length * 3);
        
        for (let i = 0; i < this.trailPositions.length; i++) {
            positions[i * 3] = this.trailPositions[i].x;
            positions[i * 3 + 1] = this.trailPositions[i].y;
            positions[i * 3 + 2] = this.trailPositions[i].z;
        }
        
        this.trail.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        this.trail.geometry.attributes.position.needsUpdate = true;
    }
    
    deactivate() {
        // 先淡出，然后移除
        if (this.light) {
            // 淡出光源
            const fadeOut = () => {
                this.light.intensity -= 0.1;
                if (this.light.intensity <= 0) {
                    scene.remove(this.light);
                    this.light = null;
                } else {
                    requestAnimationFrame(fadeOut);
                }
            };
            fadeOut();
        }
        
        if (this.glow) {
            scene.remove(this.glow);
            this.glow = null;
        }
        
        this.active = false;
        scene.remove(this.mesh);
        scene.remove(this.trail);
        
        // 播放击中声音
        if (audioManager && Math.random() > 0.5) {
            audioManager.playSound('hit');
        }
    }
}

class ProjectileSystem {
    constructor() {
        this.projectiles = [];
    }
    
    createProjectile(position, direction, speed, owner, color) {
        // 播放发射声音
        if (audioManager) {
            audioManager.playSound('shot');
        }
        
        const projectile = new Projectile(position, direction, speed, owner, color);
        this.projectiles.push(projectile);
        return projectile;
    }
    
    update(deltaTime) {
        // 更新所有子弹
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].active) {
                this.projectiles[i].update(deltaTime);
            } else {
                this.projectiles.splice(i, 1); // 移除不活跃的子弹
            }
        }
    }
    
    checkCollisions(targets) {
        const collisions = [];
        
        // 检查每个子弹是否与目标碰撞
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            if (!projectile.active) continue;
            
            for (const target of targets) {
                // 跳过子弹所有者
                if (projectile.owner === target) continue;
                if (!target.active) continue;
                
                // 根据目标和发射者调整碰撞半径
                let collisionRadius;
                
                // 如果是敌机子弹打玩家，增加碰撞半径以提高命中率
                if (target === drone && projectile.owner instanceof Enemy) {
                    collisionRadius = 3.0; // 敌机子弹打玩家更容易命中
                }
                // 玩家子弹打敌机
                else if (target instanceof Enemy && projectile.owner === drone) {
                    collisionRadius = 3.5; // 玩家打敌机正常命中
                }
                // 其他情况
                else {
                    collisionRadius = 2.5; 
                }
                
                // 简单球体碰撞检测
                const distance = projectile.position.distanceTo(target.position);
                
                if (distance < collisionRadius) {
                    collisions.push({
                        projectile: projectile,
                        target: target
                    });
                    
                    // 子弹击中后消失
                    projectile.deactivate();
                    break;
                }
            }
        }
        
        // 当发生碰撞时，创建碰撞特效
        if (collisions.length > 0) {
            collisions.forEach(collision => {
                this.createCollisionEffect(collision.projectile.position, collision.projectile.direction);
            });
        }
        
        return collisions;
    }
    
    createCollisionEffect(position, direction) {
        // 创建碰撞火花效果
        const sparkCount = 10;
        const sparkGeometry = new THREE.BufferGeometry();
        const sparkPositions = new Float32Array(sparkCount * 3);
        const sparkVelocities = [];
        
        // 初始化所有火花在碰撞位置
        for (let i = 0; i < sparkCount; i++) {
            sparkPositions[i * 3] = position.x;
            sparkPositions[i * 3 + 1] = position.y;
            sparkPositions[i * 3 + 2] = position.z;
            
            // 创建随机方向的速度，偏向反弹方向
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 10 - direction.x * 5,
                (Math.random() - 0.5) * 10 - direction.y * 5,
                (Math.random() - 0.5) * 10 - direction.z * 5
            );
            sparkVelocities.push(vel);
        }
        
        sparkGeometry.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
        
        const sparkMaterial = new THREE.PointsMaterial({
            color: 0xFFAA00,
            size: 0.2,
            blending: THREE.AdditiveBlending
        });
        
        const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
        scene.add(sparks);
        
        // 火花动画
        let time = 0;
        const maxTime = 0.5; // 0.5秒
        
        const animateSparks = () => {
            time += 0.016; // 约16ms
            
            if (time >= maxTime) {
                scene.remove(sparks);
                return;
            }
            
            // 更新火花位置
            for (let i = 0; i < sparkCount; i++) {
                const idx = i * 3;
                const vel = sparkVelocities[i];
                
                sparkPositions[idx] += vel.x * 0.016;
                sparkPositions[idx + 1] += vel.y * 0.016;
                sparkPositions[idx + 2] += vel.z * 0.016;
                
                // 模拟重力和阻力
                vel.y -= 9.8 * 0.016;
                vel.multiplyScalar(0.95);
            }
            
            sparkGeometry.attributes.position.needsUpdate = true;
            sparkMaterial.opacity = 1 - (time / maxTime);
            
            requestAnimationFrame(animateSparks);
        };
        
        animateSparks();
    }
}

// 全局单例
const projectileSystem = new ProjectileSystem();
