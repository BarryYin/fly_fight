// WebSocket连接调试工具

/**
 * 测试WebSocket连接并返回详细诊断信息
 * @param {string} url WebSocket连接URL
 * @return {Promise} 包含测试结果的Promise
 */
function testWebSocketConnection(url) {
    return new Promise((resolve, reject) => {
        console.log(`正在尝试连接到: ${url}`);
        
        // 显示测试开始
        const debugInfo = {
            success: false,
            url: url,
            error: null,
            message: '',
            timestamp: new Date().toISOString()
        };
        
        try {
            const socket = new WebSocket(url);
            
            // 设置超时
            const timeout = setTimeout(() => {
                debugInfo.error = '连接超时';
                debugInfo.message = '服务器没有在5秒内响应';
                console.error('WebSocket连接超时');
                reject(debugInfo);
            }, 5000);
            
            // 连接成功
            socket.onopen = () => {
                clearTimeout(timeout);
                debugInfo.success = true;
                debugInfo.message = '成功连接到服务器';
                console.log('WebSocket连接成功!');
                
                // 发送一个测试消息
                socket.send(JSON.stringify({
                    type: 'debug',
                    message: 'connection-test'
                }));
                
                // 4秒后关闭连接
                setTimeout(() => {
                    socket.close();
                    resolve(debugInfo);
                }, 2000);
            };
            
            // 连接出错
            socket.onerror = (error) => {
                clearTimeout(timeout);
                debugInfo.error = '连接错误';
                debugInfo.message = `WebSocket错误: ${error.toString()}`;
                console.error('WebSocket连接错误:', error);
                reject(debugInfo);
            };
            
            // 收到消息
            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    debugInfo.message += `\n收到服务器消息: ${JSON.stringify(data)}`;
                    console.log('收到服务器消息:', data);
                } catch(e) {
                    debugInfo.message += `\n收到非JSON消息: ${event.data}`;
                    console.log('收到非JSON消息:', event.data);
                }
            };
            
            // 连接关闭
            socket.onclose = (event) => {
                clearTimeout(timeout);
                debugInfo.message += `\n连接已关闭，代码: ${event.code}，原因: ${event.reason}`;
                console.log(`WebSocket连接已关闭，代码: ${event.code}，原因: ${event.reason}`);
                resolve(debugInfo);
            };
        } catch(e) {
            debugInfo.error = '创建WebSocket失败';
            debugInfo.message = e.toString();
            console.error('创建WebSocket异常:', e);
            reject(debugInfo);
        }
    });
}

// 显示网络调试信息的UI
function showNetworkDebugUI() {
    // 创建调试面板
    const container = document.createElement('div');
    container.id = 'network-debug-panel';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.width = '400px';
    container.style.padding = '10px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    container.style.color = '#00ff00';
    container.style.fontFamily = 'monospace';
    container.style.fontSize = '12px';
    container.style.zIndex = '10000';
    container.style.borderRadius = '5px';
    container.style.overflowY = 'auto';
    container.style.maxHeight = '80vh';
    
    const header = document.createElement('h3');
    header.textContent = '网络连接诊断';
    header.style.marginTop = '0';
    container.appendChild(header);
    
    // 当前连接状态
    const statusDiv = document.createElement('div');
    statusDiv.innerHTML = `
        <div>连接URL: <span id="debug-url"></span></div>
        <div>连接状态: <span id="debug-status">未测试</span></div>
        <div>最后错误: <span id="debug-error">无</span></div>
        <div>WebSocket就绪状态: <span id="debug-ready-state">未连接</span></div>
    `;
    container.appendChild(statusDiv);
    
    // 添加测试按钮
    const testPanel = document.createElement('div');
    testPanel.style.marginTop = '10px';
    testPanel.innerHTML = `
        <input type="text" id="ws-test-url" placeholder="WebSocket URL" style="width:100%; margin-bottom:5px; padding:5px; background:#222; color:#00ff00; border:1px solid #00aa00;">
        <button id="test-ws-btn" style="background:#005500; color:#00ff00; border:1px solid #00aa00; padding:5px 10px; cursor:pointer; width:100%;">测试连接</button>
    `;
    container.appendChild(testPanel);
    
    // 显示测试结果的区域
    const resultDiv = document.createElement('div');
    resultDiv.id = 'ws-test-result';
    resultDiv.style.marginTop = '10px';
    resultDiv.style.padding = '10px';
    resultDiv.style.border = '1px dashed #00aa00';
    resultDiv.style.display = 'none';
    container.appendChild(resultDiv);
    
    // 添加可执行命令区
    const commandDiv = document.createElement('div');
    commandDiv.style.marginTop = '10px';
    commandDiv.innerHTML = `
        <h4 style="margin-bottom:5px;">快速操作</h4>
        <button id="reconnect-btn" style="background:#005500; color:#00ff00; border:1px solid #00aa00; padding:5px 10px; cursor:pointer; margin-right:5px;">重新连接</button>
        <button id="apply-fix-btn" style="background:#005500; color:#00ff00; border:1px solid #00aa00; padding:5px 10px; cursor:pointer;">应用修复</button>
    `;
    container.appendChild(commandDiv);
    
    // 添加关闭按钮
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '关闭';
    closeBtn.style.position = 'absolute';
    closeBtn.style.top = '10px';
    closeBtn.style.right = '10px';
    closeBtn.style.background = '#aa0000';
    closeBtn.style.color = 'white';
    closeBtn.style.border = 'none';
    closeBtn.style.borderRadius = '3px';
    closeBtn.style.padding = '3px 8px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.onclick = () => container.remove();
    container.appendChild(closeBtn);
    
    document.body.appendChild(container);
    
    // 设置默认WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    document.getElementById('ws-test-url').value = `${protocol}//${host}/ws`;
    
    // 添加按钮事件处理
    document.getElementById('test-ws-btn').onclick = () => {
        const url = document.getElementById('ws-test-url').value;
        const resultDiv = document.getElementById('ws-test-result');
        
        resultDiv.innerHTML = '正在测试连接...';
        resultDiv.style.display = 'block';
        
        testWebSocketConnection(url)
            .then(result => {
                resultDiv.innerHTML = `
                    <div style="color:${result.success ? '#00ff00' : '#ff0000'}">
                        <strong>测试结果:</strong> ${result.success ? '成功' : '失败'}<br>
                        <strong>URL:</strong> ${result.url}<br>
                        <strong>消息:</strong> <pre>${result.message}</pre>
                        <strong>时间:</strong> ${result.timestamp}
                    </div>
                `;
            })
            .catch(error => {
                resultDiv.innerHTML = `
                    <div style="color:#ff0000">
                        <strong>测试失败:</strong><br>
                        <strong>URL:</strong> ${error.url}<br>
                        <strong>错误:</strong> ${error.error}<br>
                        <strong>消息:</strong> <pre>${error.message}</pre>
                        <strong>时间:</strong> ${error.timestamp}
                    </div>
                `;
            });
    };
    
    // 重新连接按钮
    document.getElementById('reconnect-btn').onclick = () => {
        if (typeof multiplayerManager !== 'undefined') {
            multiplayerManager.disconnect();
            setTimeout(() => {
                multiplayerManager.connect();
            }, 500);
        }
    };
    
    // 应用修复按钮
    document.getElementById('apply-fix-btn').onclick = () => {
        applyConnectionFix();
    };
    
    // 更新连接信息
    updateNetworkDebugInfo();
    setInterval(updateNetworkDebugInfo, 1000);
}

// 更新网络调试面板信息
function updateNetworkDebugInfo() {
    // 如果没有多人游戏管理器或者面板不存在，则退出
    if (typeof multiplayerManager === 'undefined' || !document.getElementById('debug-status')) return;
    
    // 更新连接状态信息
    document.getElementById('debug-status').textContent = multiplayerManager.connected ? '已连接' : '未连接';
    document.getElementById('debug-status').style.color = multiplayerManager.connected ? '#00ff00' : '#ff0000';
    
    // 显示URL
    let wsUrl = '未指定';
    if (multiplayerManager.socket) {
        wsUrl = multiplayerManager.socket.url || '未知';
    } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws (未连接)`;
    }
    document.getElementById('debug-url').textContent = wsUrl;
    
    // 显示WebSocket就绪状态
    let readyState = '未连接';
    let readyStateColor = '#ff0000';
    
    if (multiplayerManager.socket) {
        switch(multiplayerManager.socket.readyState) {
            case 0: 
                readyState = '正在连接(CONNECTING)';
                readyStateColor = '#ffff00';
                break;
            case 1: 
                readyState = '已连接(OPEN)';
                readyStateColor = '#00ff00';
                break;
            case 2: 
                readyState = '正在关闭(CLOSING)';
                readyStateColor = '#ffa500';
                break;
            case 3: 
                readyState = '已关闭(CLOSED)';
                readyStateColor = '#ff0000';
                break;
        }
    }
    
    document.getElementById('debug-ready-state').textContent = readyState;
    document.getElementById('debug-ready-state').style.color = readyStateColor;
}

// 应用连接修复
function applyConnectionFix() {
    console.log('正在应用连接修复...');
    
    // 1. 确保HTML中有连接状态元素
    if (!document.getElementById('connection-status')) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'connection-status';
        statusDiv.style.position = 'fixed';
        statusDiv.style.top = '5px';
        statusDiv.style.left = '50%';
        statusDiv.style.transform = 'translateX(-50%)';
        statusDiv.style.background = 'rgba(0,0,0,0.7)';
        statusDiv.style.color = '#ffff00';
        statusDiv.style.padding = '5px 10px';
        statusDiv.style.borderRadius = '5px';
        statusDiv.style.zIndex = '10000';
        statusDiv.style.fontSize = '12px';
        statusDiv.textContent = '未连接';
        document.body.appendChild(statusDiv);
        console.log('创建了连接状态元素');
    }
    
    // 2. 修复WebSocket连接参数
    if (typeof multiplayerManager !== 'undefined') {
        try {
            // 强制断开旧连接
            multiplayerManager.disconnect();
            
            // 重写连接方法，使用正确的WebSocket URL
            const originalConnect = multiplayerManager.connect;
            multiplayerManager.connect = function(serverUrl) {
                try {
                    console.log('使用修复后的连接方法...');
                    // 确保指定了正确的WebSocket路径
                    if (!serverUrl) {
                        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                        const host = window.location.host;
                        serverUrl = `${protocol}//${host}/ws`;
                    }
                    
                    console.log('尝试连接到:', serverUrl);
                    document.getElementById('connection-status').textContent = '正在连接...';
                    document.getElementById('connection-status').style.color = '#ffff00';
                    
                    // 调用原始连接方法
                    return originalConnect.call(this, serverUrl);
                } catch (error) {
                    console.error('连接错误:', error);
                    document.getElementById('connection-status').textContent = '连接失败';
                    document.getElementById('connection-status').style.color = '#ff0000';
                    alert('无法连接到多人游戏服务器，请检查服务器是否运行');
                }
            };
            
            // 重新连接
            setTimeout(() => {
                multiplayerManager.connect();
                console.log('修复应用完成，已尝试重新连接');
            }, 1000);
        } catch (error) {
            console.error('应用修复时出错:', error);
        }
    } else {
        console.error('未找到multiplayerManager对象，无法应用修复');
    }
}

// 导出调试功能
window.NetworkDebug = {
    test: testWebSocketConnection,
    showUI: showNetworkDebugUI,
    applyFix: applyConnectionFix
};

console.log('网络调试工具已加载，按Ctrl+Shift+N显示调试面板');

// 添加快捷键
document.addEventListener('keydown', (event) => {
    // Ctrl+Shift+N 显示网络调试面板
    if (event.ctrlKey && event.shiftKey && event.code === 'KeyN') {
        showNetworkDebugUI();
    }
});
