# HTTP模式快速开始

## 5分钟启动HTTP MCP服务器

### 步骤 1: 确认环境

确保已安装Node.js >= 18 和所有依赖：

```bash
cd /Users/wqw/wqw/weekly/mcp-server
npm install
```

### 步骤 2: 启动HTTP服务器

```bash
npm run start:http
```

你会看到：

```
C++ Weekly MCP HTTP Server running at:
  - Health check: http://localhost:3000/health
  - SSE endpoint: http://localhost:3000/sse
  - Messages endpoint: http://localhost:3000/messages

Server is ready to accept connections.
```

### 步骤 3: 验证服务器运行

打开另一个终端窗口，测试健康端点：

```bash
curl http://localhost:3000/health
```

应该返回：

```json
{"status":"ok","service":"cpp-weekly-mcp-server"}
```

### 步骤 4: 配置Claude Desktop

编辑Claude Desktop配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

添加或修改配置：

```json
{
  "mcpServers": {
    "cpp-weekly": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

**注意**：使用 `url` 字段而不是 `command` 和 `args`。

### 步骤 5: 重启Claude Desktop

完全退出并重新启动Claude Desktop应用。

### 步骤 6: 测试

在Claude中输入：

```
列出所有C++周刊
```

如果成功，Claude会返回周刊列表！

## 配置选项

### 更改端口和主机

创建 `.env` 文件：

```bash
HOST=0.0.0.0    # 允许外部访问
PORT=3001       # 使用不同端口
```

然后启动：

```bash
npm run start:http
```

### 后台运行

```bash
# 使用nohup
nohup npm run start:http > server.log 2>&1 &

# 或使用PM2（需要先安装）
npm install -g pm2
pm2 start http-server.js --name cpp-weekly-mcp
```

## 常见问题

### Q: 端口3000已被占用

**A**: 更改端口

```bash
PORT=3001 npm run start:http
```

### Q: 远程无法访问

**A**: 确保：
1. HOST设置为 `0.0.0.0`
2. 防火墙允许该端口
3. 使用正确的IP地址

```bash
# 允许端口
sudo ufw allow 3000

# 查看本机IP
ip addr  # Linux
ifconfig # macOS
```

### Q: 服务意外停止

**A**: 使用进程管理器：

```bash
# 推荐使用PM2
pm2 start http-server.js --name cpp-weekly-mcp
pm2 logs cpp-weekly-mcp
```

## 生产环境部署

查看详细文档：

- **HTTP模式完整指南**: [HTTP_MODE.md](./HTTP_MODE.md)
- **部署总结**: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

包括：
- Docker部署
- systemd服务
- Nginx反向代理
- HTTPS配置
- 监控和日志

## 测试工具

运行完整测试：

```bash
# HTTP端点测试
./test-http.sh

# MCP客户端测试（需要服务器运行）
node client-example.js
```

## 停止服务器

```bash
# 如果是前台运行，按Ctrl+C

# 如果是后台运行，找到进程并kill
lsof -i :3000  # 找到PID
kill <PID>

# 如果使用PM2
pm2 stop cpp-weekly-mcp
```

## 下一步

1. 配置反向代理添加HTTPS
2. 设置开机自启
3. 配置监控和告警
4. 添加访问控制（如需要）

查看 [HTTP_MODE.md](./HTTP_MODE.md) 了解详细配置！
