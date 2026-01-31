# HTTP/SSE 模式部署指南

## 概述

HTTP模式允许MCP服务器作为独立的Web服务运行，通过HTTP和Server-Sent Events (SSE) 进行通信。这种模式适合：

- 需要远程访问的场景
- 多客户端共享同一个服务器
- 与其他Web服务集成
- 生产环境部署

## 架构

```
┌─────────────┐      HTTP/SSE      ┌──────────────────┐
│   Client    │ ◄────────────────► │  MCP HTTP Server │
│ (Claude AI) │                     │  (Express + SSE) │
└─────────────┘                     └──────────────────┘
                                             │
                                             ▼
                                    ┌──────────────┐
                                    │  Posts Files │
                                    └──────────────┘
```

## 快速启动

### 方法 1: 使用npm script（推荐）

```bash
cd /path/to/weekly/mcp-server
npm run start:http
```

### 方法 2: 使用启动脚本

```bash
cd /path/to/weekly/mcp-server
./start-server.sh
```

### 方法 3: 直接运行

```bash
cd /path/to/weekly/mcp-server
node http-server.js
```

启动后你会看到：

```
C++ Weekly MCP HTTP Server running at:
  - Health check: http://localhost:3000/health
  - SSE endpoint: http://localhost:3000/sse
  - Messages endpoint: http://localhost:3000/messages

Server is ready to accept connections.
```

## 配置

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
HOST=localhost      # 监听地址，0.0.0.0 允许外部访问
PORT=3000          # 监听端口
```

### 配置文件

`config.json` 提供更详细的配置选项：

```json
{
  "server": {
    "host": "localhost",
    "port": 3000
  },
  "posts_directory": "../posts",
  "logging": {
    "level": "info",
    "enabled": true
  }
}
```

## 端点说明

### GET /health

健康检查端点，返回服务器状态。

**请求:**
```bash
curl http://localhost:3000/health
```

**响应:**
```json
{
  "status": "ok",
  "service": "cpp-weekly-mcp-server"
}
```

### GET /sse

SSE (Server-Sent Events) 端点，用于建立MCP连接。

**特点:**
- 保持长连接
- 服务器推送消息
- 自动重连机制

**使用:**
```javascript
const eventSource = new EventSource('http://localhost:3000/sse');
eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
};
```

### POST /messages

接收客户端消息的端点。

## Claude Desktop 配置

### 配置HTTP模式

编辑 `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cpp-weekly": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

注意：
- 使用 `url` 而不是 `command` 和 `args`
- URL 指向SSE端点

## 生产环境部署

### 使用 systemd (Linux)

1. 编辑服务文件 `cpp-weekly-mcp.service`：

```ini
[Unit]
Description=C++ Weekly MCP HTTP Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/weekly/mcp-server
Environment="NODE_ENV=production"
Environment="HOST=0.0.0.0"
Environment="PORT=3000"
ExecStart=/usr/bin/node http-server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

2. 安装并启动服务：

```bash
# 复制服务文件
sudo cp cpp-weekly-mcp.service /etc/systemd/system/

# 重载systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start cpp-weekly-mcp

# 设置开机自启
sudo systemctl enable cpp-weekly-mcp

# 查看状态
sudo systemctl status cpp-weekly-mcp

# 查看日志
sudo journalctl -u cpp-weekly-mcp -f
```

### 使用 PM2 (跨平台)

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start http-server.js --name cpp-weekly-mcp

# 查看状态
pm2 status

# 查看日志
pm2 logs cpp-weekly-mcp

# 设置开机自启
pm2 startup
pm2 save
```

### 使用 Docker

创建 `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "http-server.js"]
```

构建和运行：

```bash
# 构建镜像
docker build -t cpp-weekly-mcp .

# 运行容器
docker run -d \
  --name cpp-weekly-mcp \
  -p 3000:3000 \
  -v /path/to/posts:/app/posts:ro \
  cpp-weekly-mcp

# 查看日志
docker logs -f cpp-weekly-mcp
```

## 反向代理配置

### Nginx

```nginx
server {
    listen 80;
    server_name mcp.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # SSE特殊配置
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header X-Accel-Buffering no;
    }
}
```

### Caddy

```
mcp.example.com {
    reverse_proxy localhost:3000
}
```

## 安全建议

### 1. 使用 HTTPS

在生产环境中务必使用HTTPS：

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        # ... 其他配置
    }
}
```

### 2. 添加身份验证

可以在反向代理层添加基本认证：

```nginx
location / {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://localhost:3000;
    # ... 其他配置
}
```

### 3. 限制访问

使用防火墙限制访问：

```bash
# 只允许特定IP访问
sudo ufw allow from 192.168.1.0/24 to any port 3000
```

### 4. CORS配置

如果需要跨域访问，可以在 `http-server.js` 中配置CORS：

```javascript
app.use(cors({
  origin: ['https://trusted-domain.com'],
  credentials: true
}));
```

## 监控和日志

### 健康检查

定期检查服务健康状态：

```bash
curl http://localhost:3000/health
```

可以配置监控工具（如 Prometheus、Grafana）定期检查此端点。

### 日志收集

使用 systemd journal 查看日志：

```bash
# 实时日志
sudo journalctl -u cpp-weekly-mcp -f

# 查看最近的日志
sudo journalctl -u cpp-weekly-mcp -n 100

# 查看错误日志
sudo journalctl -u cpp-weekly-mcp -p err
```

## 测试

### 测试健康端点

```bash
curl http://localhost:3000/health
```

### 测试SSE连接

```bash
curl -N http://localhost:3000/sse
```

### 使用测试脚本

创建 `test-http.js`:

```javascript
const eventSource = new EventSource('http://localhost:3000/sse');

eventSource.onopen = () => {
  console.log('Connected to MCP server');
};

eventSource.onmessage = (event) => {
  console.log('Received:', event.data);
};

eventSource.onerror = (error) => {
  console.error('Error:', error);
};
```

## 故障排除

### 问题: 端口已被占用

```bash
# 查找占用端口的进程
lsof -i :3000

# 或使用
netstat -tulpn | grep 3000

# 更换端口
PORT=3001 node http-server.js
```

### 问题: 无法连接

检查防火墙：

```bash
# 允许端口
sudo ufw allow 3000

# 或临时关闭防火墙测试
sudo ufw disable
```

### 问题: SSE连接断开

SSE连接可能会因为超时而断开，客户端会自动重连。确保：
- 网络稳定
- 没有中间代理干扰
- Nginx等反向代理正确配置了SSE支持

## 性能优化

### 1. 启用缓存

对不变的内容启用缓存：

```javascript
// 在 http-server.js 中添加缓存头
app.get('/weekly/:issue', async (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600');
  // ... 返回内容
});
```

### 2. 使用 Cluster

利用多核CPU：

```javascript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // 启动服务器
}
```

## 与Stdio模式对比

| 特性 | Stdio模式 | HTTP/SSE模式 |
|------|-----------|--------------|
| 部署方式 | 由Claude启动 | 独立进程 |
| 网络访问 | 本地only | 支持远程 |
| 多客户端 | 每个客户端一个进程 | 共享一个服务 |
| 配置复杂度 | 简单 | 中等 |
| 适用场景 | 桌面应用 | 服务器部署 |

## 下一步

- 配置反向代理和HTTPS
- 设置监控和告警
- 配置自动备份
- 添加更多端点和功能

## 获取帮助

如遇问题：
1. 检查服务器日志
2. 测试健康端点
3. 验证端口和防火墙配置
4. 查看Claude Desktop日志
