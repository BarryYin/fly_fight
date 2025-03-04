// 此脚本用于通过命令行下载Three.js库

const fs = require('fs');
const path = require('path');
const https = require('https');

// Three.js URL
const url = 'https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js';
// 保存路径
const savePath = path.join(__dirname, 'three.min.js');

console.log('开始下载Three.js...');
console.log(`下载地址: ${url}`);
console.log(`保存路径: ${savePath}`);

// 检查目标目录是否存在，不存在则创建
const dir = path.dirname(savePath);
if (!fs.existsSync(dir)) {
    console.log(`创建目录: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
}

// 下载文件
const file = fs.createWriteStream(savePath);
https.get(url, (response) => {
    if (response.statusCode !== 200) {
        console.error(`下载失败，状态码: ${response.statusCode}`);
        file.close();
        fs.unlinkSync(savePath); // 删除部分下载的文件
        return;
    }

    response.pipe(file);

    file.on('finish', () => {
        file.close();
        console.log('Three.js下载完成!');
        console.log(`文件已保存到: ${savePath}`);
        
        // 检查文件大小
        const stats = fs.statSync(savePath);
        console.log(`文件大小: ${(stats.size / 1024).toFixed(2)} KB`);
    });
}).on('error', (err) => {
    console.error(`下载错误: ${err.message}`);
    file.close();
    fs.unlinkSync(savePath); // 删除部分下载的文件
});
