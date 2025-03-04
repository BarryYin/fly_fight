let ws;
const status = document.getElementById('status');
const app = document.getElementById('app');
let drone;

function connect() {
    ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
        status.textContent = '连接状态：已连接';
        status.style.color = 'green';
        initDrone();
    };

    ws.onclose = () => {
        status.textContent = '连接状态：已断开，正在重连...';
        status.style.color = 'red';
        setTimeout(connect, 1000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket错误:', error);
        status.textContent = '连接状态：连接错误';
        status.style.color = 'red';
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateDronePositions(data);
    };
}

function initDrone() {
    if (!drone) {
        drone = document.createElement('div');
        drone.className = 'drone';
        app.appendChild(drone);
    }
}

function updateDronePositions(data) {
    for (const id in data) {
        let droneElement = document.getElementById(`drone-${id}`);
        if (!droneElement) {
            droneElement = document.createElement('div');
            droneElement.className = 'drone';
            droneElement.id = `drone-${id}`;
            app.appendChild(droneElement);
        }
        droneElement.style.left = `${data[id].x}px`;
        droneElement.style.top = `${data[id].y}px`;
    }
}

function sendPosition(x, y) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ x, y }));
    }
}

app.addEventListener('mousemove', (e) => {
    const rect = app.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        sendPosition(x, y);
    }
});

// 启动连接
connect();
