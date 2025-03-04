import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class FlightGame {
    constructor() {
        // 初始化场景
        this.scene = new THREE.Scene();
        
        // 初始化相机
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        
        // 初始化渲染器
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x87CEEB); // 天空蓝色
        document.body.appendChild(this.renderer.domElement);
        
        // 添加环境光和平行光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        this.scene.add(directionalLight);
        
        // 创建地面
        this.createGround();
        
        // 创建飞机
        this.createAirplane();
        
        // 初始化控制器
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        
        // 绑定动画循环
        this.animate = this.animate.bind(this);
        this.animate();
        
        // 监听窗口大小变化
        window.addEventListener('resize', this.onWindowResize.bind(this));
    }
    
    createGround() {
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x228B22,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);
    }
    
    createAirplane() {
        // 简单的飞机模型
        const geometry = new THREE.Group();
        
        // 机身
        const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        geometry.add(body);
        
        // 机翼
        const wingGeometry = new THREE.BoxGeometry(4, 0.1, 1);
        const wingMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const wing = new THREE.Mesh(wingGeometry, wingMaterial);
        wing.position.y = 0.1;
        geometry.add(wing);
        
        // 尾翼
        const tailGeometry = new THREE.BoxGeometry(1, 0.5, 0.5);
        const tailMaterial = new THREE.MeshPhongMaterial({ color: 0x808080 });
        const tail = new THREE.Mesh(tailGeometry, tailMaterial);
        tail.position.z = -1;
        tail.position.y = 0.25;
        geometry.add(tail);
        
        this.airplane = geometry;
        this.scene.add(this.airplane);
        this.airplane.position.y = 5; // 设置初始高度
    }
    
    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    animate() {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    }
}

// 启动游戏
const game = new FlightGame();