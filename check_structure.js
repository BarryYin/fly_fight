const fs = require('fs');
const path = require('path');

// 必要的文件列表
const requiredFiles = [
    'js/lib/three.min.js',
    'js/scene.js',
    'js/main.js',
    'index.html',
    'css/style.css'
];

// 检查文件函数
function checkFile(filepath) {
    const fullPath = path.join(__dirname, filepath);
    try {
        const stats = fs.statSync(fullPath);
        console.log(`✅ 找到文件: ${filepath} (大小: ${stats.size} 字节)`);
        return true;
    } catch (error) {
        console.error(`❌ 未找到文件: ${filepath}`);
        return false;
    }
}

// 检查文件内容是否包含特定文本
function fileContains(filepath, text) {
    try {
        const fullPath = path.join(__dirname, filepath);
        const content = fs.readFileSync(fullPath, 'utf8');
        return content.includes(text);
    } catch (error) {
        return false;
    }
}

console.log('正在检查项目结构...');
console.log('==========================================');

// 检查必要文件是否存在
let allFilesExist = true;
for (const file of requiredFiles) {
    if (!checkFile(file)) {
        allFilesExist = false;
    }
}

// 检查Three.js库是否是有效文件
if (checkFile('js/lib/three.min.js')) {
    if (fileContains('js/lib/three.min.js', 'THREE')) {
        console.log('✅ Three.js库文件内容有效');
    } else {
        console.error('❌ Three.js库文件内容无效或损坏');
        allFilesExist = false;
    }
}

console.log('==========================================');
console.log(`总体状态: ${allFilesExist ? '✅ 所有必要文件已找到' : '❌ 部分文件缺失'}`);

// 检查服务器配置
if (checkFile('server.js')) {
    if (fileContains('server.js', 'express.static')) {
        console.log('✅ 服务器配置了静态文件中间件');
    } else {
        console.error('❌ 服务器可能未正确配置静态文件服务');
    }
}
