// Vercel API 入口文件

// 导入所需模块
const express = require('express');
const { createServer } = require('http');

// 创建 Express 应用
const app = express();

// 设置静态文件目录
app.use(express.static('public'));

// 添加一个健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: '无人机战斗模拟器 API 正常运行中',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development'
  });
});

// 添加获取在线玩家数量的端点
app.get('/api/stats', (req, res) => {
  // 这里改为从数据库或缓存获取实际数据
  const mockStats = {
    onlinePlayers: Math.floor(Math.random() * 10),
    totalGames: 120,
    updatedAt: new Date().toISOString()
  };
  
  res.json(mockStats);
});

// 处理根路径 - 显示API文档
app.get('/api', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>无人机战斗模拟器 API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
          .method { font-weight: bold; color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>无人机战斗模拟器 API</h1>
        <p>这是无人机战斗模拟器的服务器 API。</p>
        <p>注意: WebSocket 功能在 Vercel 环境中有限制，请考虑使用其他平台如 Heroku、Railway 或 AWS 部署 WebSocket 服务器。</p>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/health - 健康检查
        </div>
        
        <div class="endpoint">
          <span class="method">GET</span> /api/stats - 获取游戏统计数据
        </div>
        
        <p>详细文档请参考 <a href="https://github.com/yourusername/fly_game">GitHub 仓库</a></p>
      </body>
    </html>
  `);
});

// 为Vercel创建兼容的导出
module.exports = app;

// 如果不是在Vercel环境中运行，则启动独立服务器
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  
  const server = createServer(app);
  
  server.listen(PORT, () => {
    console.log(`API 服务器运行在 http://localhost:${PORT}`);
  });
}
