/**
 * 简单飞行游戏模块
 * 基于Three.js的飞行模拟演示
 */

// 使用CDN导入Three.js模块
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.132.2/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.132.2/examples/jsm/controls/OrbitControls.js';

/**
 * 飞行游戏主类
 */
class FlightGame {
    /**
     * 构造函数 - 初始化游戏环境
     */
    constructor() {
        // 状态跟踪
        this.isInitialized = false;
        this.gameObjects = {};
        this.keysPressed = {};
        this.speed = 0.1;
        this.gravity = 0.001;
        
        // 初始化场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // 天空蓝色
        
        // 初始化相机
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        // 初始化渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);
        
        // 添加环境光和平行光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        this.scene.add(directionalLight);
        
        // 创建场景元素
        this.createEnvironment();
        this.createAirplane();
        
        // 初始化控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // 设置事件监听器
        this.setupEventListeners();
        
        // 绑定动画循环
        this.animate = this.animate.bind(this);
        
        // 开始游戏循环
        this.animate();
        
        // 标记初始化完成
        this.isInitialized = true;
        console.log('飞行游戏初始化完成');
    }
    
    /**
     * 创建游戏环境
     */
    createEnvironment() {
        // 创建地面
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000, 32, 32);
        const groundMaterial = new THREE.MeshPhongMaterial({
            color: 0x228B22,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        this.gameObjects.ground = ground;
        
        // 添加山脉作为障碍物
        this.createMountains();
    }
    
    /**
     * 创建山脉环境
     */
    createMountains() {
        for (let i = 0; i < 20; i++) {
            const mountainGeometry = new THREE.ConeGeometry(
                10 + Math.random() * 20, // 半径
                30 + Math.random() * 50, // 高度
                16 // 分段数
            );
            
            const mountainMaterial = new THREE.MeshPhongMaterial({
                color: new THREE.Color(
                    0.2 + Math.random() * 0.1,
                    0.4 + Math.random() * 0.2,
                    0.2 + Math.random() * 0.1
                )
            });
            
            const mountain = new THREE.Mesh(mountainGeometry, mountainMaterial);
            
            // 随机位置
            mountain.position.set(
                (Math.random() - 0.5) * 500,
                0,
                (Math.random() - 0.5) * 500
            );
            
            mountain.castShadow = true;
            mountain.receiveShadow = true;
            this.scene.add(mountain);
        }
    }
    
    /**
     * 创建玩家飞机
     */
    createAirplane() {
        // 创建飞机组
        const airplane = new THREE.Group();
        
        // 机身
        const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x808080,
            shininess: 80
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        airplane.add(body);
        
        // 机翼
        const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1);
        const wingMaterial = new THREE.MeshPhongMaterial({
            color: 0x4040A0,
            shininess: 40
        });
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        wing.position.y = 0.1;
        wing.castShadow = true;
        airplane.add(wing);
        
        // 尾翼
        const tailGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
        const tailMaterial = new THREE.MeshPhongMaterial({
            color: 0x4040A0,
            shininess: 40
        });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.z = -1;
        tail.position.y = 0.25;
        tail.castShadow = true;
        airplane.add(tail);
        
        // 螺旋桨
        const propellerGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.05);
        const propellerMaterial = new THREE.MeshPhongMaterial({
            color: 0x8B4513
        });
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        propeller.position.z = 1;
        propeller.castShadow = true;
        airplane.add(propeller);
        
        // 添加到场景并保存引用
        airplane.position.y = 5; // 设置初始高度
        this.scene.add(airplane);
        this.gameObjects.airplane = airplane;
        this.gameObjects.propeller = propeller;
    }
    
    /**
     * 设置事件监听器
     */
    setupEventListeners() {
        // 调整大小
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // 键盘控制
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));
        
        // 确保在页面关闭时清理
        window.addEventListener('beforeunload', this.cleanup.bind(this));
    }
    
    /**
     * 处理窗口大小变化
     */
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    /**
     * 处理键盘按下
     */
    onKeyDown(event) {
        this.keysPressed[event.code] = true;
    }
    
    /**
     * 处理键盘抬起
     */
    onKeyUp(event) {
        this.keysPressed[event.code] = false;
    }
    
    /**
     * 处理飞机移动
     */
    handleAirplaneMovement() {
        if (!this.gameObjects.airplane) return;
        
        const airplane = this.gameObjects.airplane;
        
        // 前后移动
        if (this.keysPressed['ArrowUp'] || this.keysPressed['KeyW']) {
            airplane.position.z -= this.speed;
        }
        if (this.keysPressed['ArrowDown'] || this.keysPressed['KeyS']) {
            airplane.position.z += this.speed;
        }
        
        // 左右移动
        if (this.keysPressed['ArrowLeft'] || this.keysPressed['KeyA']) {
            airplane.position.x -= this.speed;
            airplane.rotation.z = Math.min(airplane.rotation.z + 0.01, 0.3); // 向左倾斜
        } else if (this.keysPressed['ArrowRight'] || this.keysPressed['KeyD']) {
            airplane.position.x += this.speed;
            airplane.rotation.z = Math.max(airplane.rotation.z - 0.01, -0.3); // 向右倾斜
        } else {
            // 回正
            if (airplane.rotation.z > 0.01) {
                airplane.rotation.z -= 0.01;
            } else if (airplane.rotation.z < -0.01) {
                airplane.rotation.z += 0.01;
            } else {
                airplane.rotation.z = 0;
            }
        }
        
        // 上下移动
        if (this.keysPressed['Space']) {
            airplane.position.y += this.speed;
            airplane.rotation.x = Math.max(airplane.rotation.x - 0.01, -0.2); // 向上仰
        } else if (this.keysPressed['ShiftLeft']) {
            airplane.position.y -= this.speed;
            airplane.rotation.x = Math.min(airplane.rotation.x + 0.01, 0.2); // 向下俯
        } else {
            // 回正
            if (airplane.rotation.x > 0.01) {
                airplane.rotation.x -= 0.01;
            } else if (airplane.rotation.x < -0.01) {
                airplane.rotation.x += 0.01;
            } else {
                airplane.rotation.x = 0;
            }
        }
        
        // 模拟重力
        if (!this.keysPressed['Space'] && !this.keysPressed['ShiftLeft']) {
            airplane.position.y -= this.gravity;
        }
        
        // 高度限制，防止飞机飞入地下
        if (airplane.position.y < 0.5) {
            airplane.position.y = 0.5;
        }
        
        // 旋转螺旋桨
        if (this.gameObjects.propeller) {
            this.gameObjects.propeller.rotation.x += 0.3;
        }
    }
    
    /**
     * 动画循环
     */
    animate() {
        requestAnimationFrame(this.animate);
        
        // 处理飞机移动
        this.handleAirplaneMovement();
        
        // 更新控制器
        this.controls.update();
        
        // 更新第三人称相机跟踪
        this.updateCameraPosition();
        
        // 渲染场景
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * 更新相机位置以跟随飞机
     */
    updateCameraPosition() {
        if (!this.gameObjects.airplane) return;
        
        const airplane = this.gameObjects.airplane;
        
        // 设置相机位置在飞机后上方
        const offset = new THREE.Vector3(-2, 2, 6);
        const cameraPosition = airplane.position.clone().add(offset);
        
        // 平滑过渡相机位置
        this.camera.position.lerp(cameraPosition, 0.05);
        
        // 相机始终看向飞机
        this.camera.lookAt(airplane.position);
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // 移除事件监听器
        window.removeEventListener('resize', this.onWindowResize);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        
        // 处理其他可能需要的清理工作
        this.renderer.dispose();
        this.controls.dispose();
    }
}

/**
 * 当文档加载完成后启动游戏
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        // 创建游戏实例
        const game = new FlightGame();
        
        // 将游戏实例导出到窗口对象，方便调试
        window.game = game;
        
        // 显示帮助信息
        console.log('游戏控制: 使用箭头键或WASD移动飞机，空格键上升，Shift键下降。');
    } catch (error) {
        console.error('游戏初始化失败:', error);
        
        // 在页面上显示错误消息
        const errorMessage = document.createElement('div');
        errorMessage.style.position = 'absolute';
        errorMessage.style.top = '50%';
        errorMessage.style.left = '50%';
        errorMessage.style.transform = 'translate(-50%, -50%)';
        errorMessage.style.color = 'white';
        errorMessage.style.background = 'rgba(255,0,0,0.7)';
        errorMessage.style.padding = '20px';
        errorMessage.style.borderRadius = '5px';
        errorMessage.textContent = '游戏加载失败，请检查控制台获取详细信息。';
        document.body.appendChild(errorMessage);
    }
});
