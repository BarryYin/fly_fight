// 场景初始化

let scene, camera, renderer;
const canvasContainer = document.getElementById('canvas-container');

function initScene() {
    try {
        console.log('初始化场景...');
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // 天空蓝色背景
        
        // 创建透视相机
        camera = new THREE.PerspectiveCamera(
            75, // 视野角度
            window.innerWidth / window.innerHeight, // 纵横比
            0.1, // 近平面
            1000 // 远平面
        );
        
        // 设置相机初始位置
        camera.position.set(0, 5, 10);
        camera.lookAt(0, 0, 0);
        
        // 创建WebGL渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        
        // 将渲染器的DOM元素添加到页面
        if (canvasContainer) {
            canvasContainer.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
            console.warn('未找到canvas-container元素，已将渲染器添加到body');
        }
        
        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);
        
        // 添加定向光（太阳光）
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(100, 100, 50);
        directionalLight.castShadow = true;
        
        // 配置阴影
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        scene.add(directionalLight);
        
        // 添加地面
        const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x556B2F, // 深绿色地面
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        scene.add(ground);
        
        // 添加雾效果
        scene.fog = new THREE.FogExp2(0x87CEEB, 0.002);
        
        // 窗口大小调整事件
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        console.log('场景初始化完成');
        return true;
    } catch (error) {
        console.error('场景初始化失败:', error);
        return false;
    }
}

// 添加一个简单测试函数来验证场景是否正常
function testScene() {
    // 创建一个简单的立方体
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    
    // 简单的旋转动画
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }
    
    animate();
    console.log('测试场景已创建');
}

// 创建环境元素
function createEnvironment() {
    console.log('创建游戏环境元素...');
    
    // 创建一些随机树和建筑物
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 1000 - 500; // 更广的分布范围
        const z = Math.random() * 1000 - 500;
        
        // 避免在玩家出生点附近创建障碍物
        if (Math.abs(x) < 30 && Math.abs(z) < 30) continue;
        
        // 随机决定创建树或建筑
        if (Math.random() > 0.5) {
            createTree(x, 0, z);
        } else {
            createBuilding(x, 0, z);
        }
    }
    
    console.log('环境元素创建完成');
}

// 创建树
function createTree(x, y, z) {
    const trunkGeometry = new THREE.CylinderGeometry(1, 1.5, 8, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, y + 4, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    const leavesGeometry = new THREE.ConeGeometry(5, 10, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.set(x, y + 13, z);
    leaves.castShadow = true;
    scene.add(leaves);
    
    // 碰撞检测用的边界盒
    const treeGroup = new THREE.Group();
    treeGroup.add(trunk.clone());
    treeGroup.add(leaves.clone());
    treeGroup.position.set(x, y, z);
    treeGroup.userData = { isObstacle: true, type: 'tree' };
    
    // 将树添加到全局障碍物列表
    if (typeof obstacles !== 'undefined') {
        obstacles.push(treeGroup);
    }
}

// 创建建筑物
function createBuilding(x, y, z) {
    const height = Math.random() * 30 + 15;
    const width = Math.random() * 15 + 10;
    const depth = Math.random() * 15 + 10;
    
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: Math.random() > 0.5 ? 0x808080 : 0xA0A0A0,
        roughness: 0.7,
        metalness: 0.2
    });
    const building = new THREE.Mesh(geometry, material);
    building.position.set(x, y + height/2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    scene.add(building);
    
    // 碰撞检测用的边界盒
    building.userData = { isObstacle: true, type: 'building' };
    
    // 将建筑添加到全局障碍物列表
    if (typeof obstacles !== 'undefined') {
        obstacles.push(building);
    }
    
    // 随机在建筑上添加一些窗户
    addWindowsToBuilding(building, width, height, depth);
}

// 添加窗户到建筑
function addWindowsToBuilding(building, width, height, depth) {
    // 窗户行数和列数
    const rows = Math.floor(height / 5);
    const colsX = Math.floor(width / 3);
    const colsZ = Math.floor(depth / 3);
    
    const windowMaterial = new THREE.MeshStandardMaterial({
        color: 0x87CEEB,
        emissive: 0x333333,
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.7
    });
    
    // 在建筑物的四个表面添加窗户
    for (let row = 0; row < rows; row++) {
        // 窗户高度位置，从建筑物底部往上
        const yPos = (row + 0.5) * (height / rows) - height / 2;
        
        // 左右两面的窗户
        for (let col = 0; col < colsX; col++) {
            const xPos = (col + 0.5) * (width / colsX) - width / 2;
            
            // 随机选择是否添加窗户
            if (Math.random() > 0.3) {
                const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
                
                // 前面窗户
                const windowFront = new THREE.Mesh(windowGeometry, windowMaterial);
                windowFront.position.set(xPos, yPos, depth / 2 + 0.01);
                windowFront.rotation.y = Math.PI;
                building.add(windowFront);
                
                // 后面窗户
                const windowBack = new THREE.Mesh(windowGeometry, windowMaterial);
                windowBack.position.set(xPos, yPos, -depth / 2 - 0.01);
                building.add(windowBack);
            }
        }
        
        // 前后两面的窗户
        for (let col = 0; col < colsZ; col++) {
            const zPos = (col + 0.5) * (depth / colsZ) - depth / 2;
            
            // 随机选择是否添加窗户
            if (Math.random() > 0.3) {
                const windowGeometry = new THREE.PlaneGeometry(1.5, 2);
                
                // 左面窗户
                const windowLeft = new THREE.Mesh(windowGeometry, windowMaterial);
                windowLeft.position.set(-width / 2 - 0.01, yPos, zPos);
                windowLeft.rotation.y = Math.PI / 2;
                building.add(windowLeft);
                
                // 右面窗户
                const windowRight = new THREE.Mesh(windowGeometry, windowMaterial);
                windowRight.position.set(width / 2 + 0.01, yPos, zPos);
                windowRight.rotation.y = -Math.PI / 2;
                building.add(windowRight);
            }
        }
    }
}
