const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 配置
const config = {
    serverFile: 'server_multiplayer.js',
    defaultPort: process.env.PORT || 3000,
    logFile: 'server.log',
    killExisting: true
};

// 检查服务器文件是否存在
if (!fs.existsSync(path.join(__dirname, config.serverFile))) {
    console.error(`错误: 找不到服务器文件 ${config.serverFile}`);
    process.exit(1);
}

// 杀死可能占用端口的进程
async function killProcessOnPort(port) {
    try {
        // 不同系统有不同的命令
        let command, args;
        
        if (process.platform === 'win32') {
            command = 'netstat';
            args = ['-ano', '|', 'findstr', `:${port}`];
        } else {
            command = 'lsof';
            args = ['-i', `:${port}`];
        }

        console.log(`尝试杀死占用端口 ${port} 的进程...`);
        
        // 使用系统命令查找并杀死进程
        const findProcess = spawn(command, args, {
            shell: true
        });
        
        let output = '';
        findProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        await new Promise((resolve) => {
            findProcess.on('close', (code) => {
                // 解析输出以找到PID
                let pids = [];
                
                if (process.platform === 'win32') {
                    // Windows格式
                    const lines = output.split('\n');
                    for (const line of lines) {
                        const match = line.match(/(\d+)$/);
                        if (match) {
                            pids.push(match[1]);
                        }
                    }
                } else {
                    // Unix格式
                    const lines = output.split('\n').slice(1); // 跳过标题行
                    for (const line of lines) {
                        const parts = line.trim().split(/\s+/);
                        if (parts.length > 1) {
                            pids.push(parts[1]);
                        }
                    }
                }
                
                // 去重
                pids = [...new Set(pids)];
                
                // 杀死所有进程
                for (const pid of pids) {
                    if (pid && pid !== process.pid.toString()) {
                        console.log(`杀死进程 ${pid}`);
                        try {
                            process.kill(parseInt(pid));
                        } catch (e) {
                            console.error(`无法杀死进程 ${pid}: ${e.message}`);
                        }
                    }
                }
                
                resolve();
            });
        });
        
        console.log(`端口 ${port} 已释放`);
        return true;
    } catch (error) {
        console.error(`无法释放端口 ${port}: ${error.message}`);
        return false;
    }
}

// 启动服务器
async function startServer() {
    // 如果配置为杀死现有进程
    if (config.killExisting) {
        await killProcessOnPort(config.defaultPort);
    }
    
    // 打开日志文件
    const logStream = fs.createWriteStream(path.join(__dirname, config.logFile), { flags: 'a' });
    
    // 启动服务器
    console.log(`启动服务器: ${config.serverFile}`);
    const server = spawn('node', [config.serverFile], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });
    
    // 记录启动时间
    const startTime = new Date().toISOString();
    logStream.write(`\n[${startTime}] 服务器启动\n`);
    
    // 将输出重定向到控制台和日志文件
    server.stdout.on('data', (data) => {
        process.stdout.write(data);
        logStream.write(data);
    });
    
    server.stderr.on('data', (data) => {
        process.stderr.write(data);
        logStream.write(`[ERROR] ${data}`);
    });
    
    // 处理服务器退出
    server.on('close', (code) => {
        const endTime = new Date().toISOString();
        const message = `[${endTime}] 服务器退出，代码: ${code}\n`;
        logStream.write(message);
        console.log(message);
        logStream.end();
    });
    
    // 处理脚本退出
    process.on('SIGINT', () => {
        console.log('收到中断信号，关闭服务器...');
        if (!server.killed) {
            server.kill('SIGINT');
        }
        setTimeout(() => {
            process.exit(0);
        }, 1000);
    });
}

// 运行启动函数
startServer().catch(error => {
    console.error(`启动服务器出错: ${error.message}`);
});

console.log(`服务器日志将保存到: ${config.logFile}`);
