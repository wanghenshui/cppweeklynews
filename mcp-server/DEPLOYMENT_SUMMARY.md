# 部署总结

## 项目概述

C++ 中文周刊 MCP 服务器现已支持两种运行模式：

1. **Stdio模式** - 适合Claude Desktop本地使用
2. **HTTP/SSE模式** - 适合独立部署和远程访问

## 文件清单

### 核心文件
- `index.js` - Stdio模式服务器主程序
- `http-server.js` - HTTP/SSE模式服务器主程序
- `package.json` - 项目依赖配置

### 配置文件
- `config.json` - 服务器配置
- `.env.example` - 环境变量示例
- `claude_desktop_config.example.json` - Claude Desktop配置示例

### 启动脚本
- `start-server.sh` - HTTP服务器启动脚本
- `cpp-weekly-mcp.service` - systemd服务配置

### Docker支持
- `Dockerfile` - Docker镜像构建文件
- `docker-compose.yml` - Docker Compose配置

### 测试脚本
- `test.js` - 基本功能测试
- `test-http.sh` - HTTP端点测试
- `client-example.js` - MCP客户端示例

### 文档
- `README.md` - 主文档
- `QUICKSTART.md` - 快速开始指南
- `HTTP_MODE.md` - HTTP模式详细部署指南
- `USAGE_EXAMPLES.md` - 使用示例
- `DEPLOYMENT_SUMMARY.md` - 本文档

## 快速启动

### Stdio模式（Claude Desktop）

```bash
# 1. 安装依赖
npm install

# 2. 配置Claude Desktop
# 编辑 ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "cpp-weekly": {
      "command": "node",
      "args": ["/Users/wqw/wqw/weekly/mcp-server/index.js"]
    }
  }
}

# 3. 重启Claude Desktop
```

### HTTP/SSE模式（独立服务）

```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm run start:http
# 或
./start-server.sh

# 3. 验证服务
curl http://localhost:3000/health

# 4. 配置Claude Desktop使用HTTP端点
{
  "mcpServers": {
    "cpp-weekly": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

## 部署方式对比

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Stdio** | 配置简单<br>无需额外端口 | 仅本地访问<br>每个客户端独立进程 | 个人桌面使用 |
| **HTTP/SSE** | 支持远程访问<br>多客户端共享<br>易于扩展 | 需要端口和网络配置 | 团队使用<br>服务器部署 |
| **Docker** | 环境隔离<br>易于部署 | 需要Docker环境 | 容器化部署 |
| **systemd** | 开机自启<br>自动重启 | 仅Linux | Linux服务器 |
| **PM2** | 跨平台<br>进程管理 | 需要全局安装PM2 | 多平台服务器 |

## 生产环境部署建议

### 1. 使用Docker（推荐）

```bash
# 构建镜像
docker build -t cpp-weekly-mcp .

# 使用docker-compose启动
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 2. 使用systemd（Linux）

```bash
# 安装服务
sudo cp cpp-weekly-mcp.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl start cpp-weekly-mcp
sudo systemctl enable cpp-weekly-mcp
```

### 3. 使用PM2（跨平台）

```bash
npm install -g pm2
pm2 start http-server.js --name cpp-weekly-mcp
pm2 save
pm2 startup
```

## 安全配置

### 1. 反向代理（Nginx）

```nginx
server {
    listen 443 ssl http2;
    server_name mcp.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

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

### 2. 防火墙配置

```bash
# 只允许特定IP访问
sudo ufw allow from 192.168.1.0/24 to any port 3000

# 或配置Nginx反向代理，只开放443端口
sudo ufw allow 443
```

### 3. 环境变量

```bash
# 不要在代码中硬编码敏感信息
# 使用.env文件（已加入.gitignore）
HOST=0.0.0.0
PORT=3000
```

## 监控和维护

### 健康检查

```bash
# 手动检查
curl http://localhost:3000/health

# 使用监控工具
# Prometheus、Grafana、Uptime Kuma等
```

### 日志管理

```bash
# systemd日志
sudo journalctl -u cpp-weekly-mcp -f

# Docker日志
docker-compose logs -f

# PM2日志
pm2 logs cpp-weekly-mcp
```

### 备份策略

```bash
# 备份posts目录
tar -czf posts-backup-$(date +%Y%m%d).tar.gz ../posts/

# 自动备份脚本
0 2 * * * /path/to/backup-script.sh
```

## 性能优化

### 1. 启用缓存

在反向代理层缓存静态内容：

```nginx
location ~ ^/weekly/\d+ {
    proxy_pass http://localhost:3000;
    proxy_cache my_cache;
    proxy_cache_valid 200 1h;
}
```

### 2. 使用CDN

将服务部署在CDN后，加速全球访问。

### 3. 数据库索引

如果将来迁移到数据库，确保对常用查询字段建立索引。

## 故障排除

### 问题：端口被占用

```bash
# 查找占用进程
lsof -i :3000
# 或
netstat -tulpn | grep 3000

# 更换端口
PORT=3001 npm run start:http
```

### 问题：SSE连接不稳定

- 检查网络连接
- 确认反向代理正确配置
- 查看服务器和客户端日志

### 问题：无法读取posts

- 确认posts目录路径正确
- 检查文件权限
- 验证Docker volume挂载

## 扩展计划

### 未来可能添加的功能

1. **认证授权** - JWT或OAuth2
2. **API限流** - 防止滥用
3. **缓存层** - Redis缓存热门内容
4. **全文搜索** - 使用Elasticsearch
5. **WebSocket** - 双向实时通信
6. **GraphQL** - 灵活的查询接口
7. **多语言** - 国际化支持

## 测试

### 单元测试

```bash
node test.js
```

### HTTP端点测试

```bash
./test-http.sh
```

### MCP协议测试

```bash
node client-example.js
```

### 负载测试

使用工具如 `ab`, `wrk`, 或 `k6`:

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3000/health

# wrk
wrk -t4 -c100 -d30s http://localhost:3000/health
```

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **MCP SDK**: @modelcontextprotocol/sdk
- **传输**: SSE (Server-Sent Events)
- **容器**: Docker
- **进程管理**: systemd / PM2

## 支持与反馈

- 查看文档：README.md, HTTP_MODE.md
- 运行测试：test.js, test-http.sh
- 提交问题：GitHub Issues
- 查看日志获取详细错误信息

## 版本历史

- **v1.0.0** (2026-01-31)
  - ✓ Stdio模式支持
  - ✓ HTTP/SSE模式支持
  - ✓ 5个核心工具
  - ✓ Docker支持
  - ✓ systemd服务配置
  - ✓ 完整文档

## 许可证

MIT License

---

**部署成功！** 🎉

现在你可以：
- 在本地使用Stdio模式
- 部署为HTTP服务供多人使用
- 通过Docker快速部署
- 在Linux服务器上使用systemd管理

选择最适合你的部署方式开始使用吧！
