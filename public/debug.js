const DebugTool = {
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) {
                console.error('WebGL不支持');
                return false;
            }
            console.log('WebGL支持版本:', gl.getParameter(gl.VERSION));
            return true;
        } catch (e) {
            console.error('WebGL检测发生错误:', e);
            return false;
        }
    },

    checkThreeJSScene(renderer, camera, scene) {
        if (!renderer || !camera || !scene) {
            console.error('Three.js核心组件未初始化');
            return false;
        }
        
        console.log('渲染器信息:', {
            size: renderer.getSize(new THREE.Vector2()),
            pixelRatio: renderer.getPixelRatio()
        });
        
        console.log('相机信息:', {
            position: camera.position,
            fov: camera.fov,
            aspect: camera.aspect
        });
        
        console.log('场景信息:', {
            children: scene.children.length,
            lights: scene.children.filter(child => child.type.includes('Light')).length
        });
        
        return true;
    },

    checkWebSocket() {
        const wsStatus = document.getElementById('status');
        if (wsStatus) {
            console.log('WebSocket状态:', wsStatus.textContent);
        }
        
        return window.WebSocket !== undefined;
    }
};

// 添加到window对象以便控制台访问
window.DebugTool = DebugTool;
