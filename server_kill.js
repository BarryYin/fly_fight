/**
 * 进程终止工具
 * 用于释放被占用的端口
 */

const { exec } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 获取要释放的端口
function getPortToKill() {
    return new Promise((resolve) => {
        rl.question('输入要释放的端口号 (默认: 3000): ', (answer) => {
            const port = parseInt(answer) || 3000;
            resolve(port);
        });
    });
}

// 查找并杀死占用端口的进程
function findAndKillProcess(port) {
    console.log(`正在查找占用端口 ${port} 的进程...`);
    
    // 根据不同操作系统使用不同命令
    const cmd = process.platform === 'win32' 
        ? `netstat -ano | findstr :${port}`
        : `lsof -i :${port}`;
        
    const killCmd = process.platform === 'win32'
        ? (pid) => `taskkill /F /PID ${pid}`
        : (pid) => `kill -9 ${pid}`;
    
    // 执行查找命令
    exec(cmd, (err, stdout) => {
        if (err) {
            console.error(`查找进程时出错: ${err.message}`);
            rl.close();
            return;
        }
        
        if (!stdout) {
            console.log(`未找到占用端口 ${port} 的进程`);
            rl.close();
            return;
        }
        
        console.log('找到以下进程:');
        console.log(stdout);
        
        // 提取PID
        let pids = [];
        if (process.platform === 'win32') {
            // Windows格式: TCP  127.0.0.1:3000  0.0.0.0:0  LISTENING  12345
            const lines = stdout.split('\n');
            for (const line of lines) {
                const match = line.match(/LISTENING\s+(\d+)/);
                if (match && match[1]) pids.push(match[1]);
            }
        } else {
            // Unix格式: node    12345 user  123u  IPv4 123456      0t0  TCP *:3000 (LISTEN)
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes('LISTEN')) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length > 1) pids.push(parts[1]);
                }
            }
        }
        
        // 去重
        pids = [...new Set(pids)];
        
        if (pids.length === 0) {
            console.log('未能提取PID信息');
            rl.close();
            return;
        }
        
        // 询问用户确认
        rl.question(`确定要终止这些进程吗? (y/N): `, (answer) => {
            if (answer.toLowerCase() === 'y') {
                pids.forEach(pid => {
                    console.log(`正在终止进程 ${pid}...`);
                    exec(killCmd(pid), (err) => {
                        if (err) {
                            console.error(`终止进程 ${pid} 失败: ${err.message}`);
                        } else {
                            console.log(`进程 ${pid} 已终止`);
                        }
                    });
                });
                
                setTimeout(() => {
                    console.log(`端口 ${port} 应该已被释放`);
                    rl.close();
                }, 1000);
            } else {
                console.log('操作已取消');
                rl.close();
            }
        });
    });
}

// 主函数
async function main() {
    console.log('端口释放工具');
    console.log('------------');
    
    try {
        const port = await getPortToKill();
        findAndKillProcess(port);
    } catch (error) {
        console.error(`执行过程中出错: ${error.message}`);
        rl.close();
    }
}

main();
