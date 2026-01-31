# 快速开始指南

## 5分钟快速部署

### 步骤 1: 检查环境

确保已安装 Node.js (版本 >= 18):

```bash
node --version
```

### 步骤 2: 安装依赖

```bash
cd /path/to/weekly/mcp-server
npm install
```

### 步骤 3: 测试服务器

运行测试脚本确认服务器能正常读取周刊：

```bash
node test.js
```

你应该看到类似输出：
```
✓ 找到 195 期周刊
✓ 成功读取，共 4962 字符
✓ 标题: # C++ 中文周刊 第1期
✓ 章节: 资讯, 文章, 视频, 开源项目, 工具
```

### 步骤 4: 配置 Claude Desktop

#### macOS

1. 打开配置文件:
```bash
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

2. 添加配置:
```json
{
  "mcpServers": {
    "cpp-weekly": {
      "command": "node",
      "args": ["/Users/你的用户名/path/to/weekly/mcp-server/index.js"]
    }
  }
}
```

**重要**: 将路径替换为实际路径！可以用以下命令获取完整路径：
```bash
cd /path/to/weekly/mcp-server && pwd
```

#### Windows

1. 打开配置文件:
```
%APPDATA%\Claude\claude_desktop_config.json
```

2. 添加配置:
```json
{
  "mcpServers": {
    "cpp-weekly": {
      "command": "node",
      "args": ["C:\\path\\to\\weekly\\mcp-server\\index.js"]
    }
  }
}
```

### 步骤 5: 重启 Claude Desktop

完全退出并重新启动 Claude Desktop 应用。

### 步骤 6: 测试连接

在 Claude 中输入：

```
请列出所有C++中文周刊
```

如果配置成功，Claude会返回所有周刊的列表！

## 验证配置

### 方法 1: 在对话中测试

向Claude提问：
- "有多少期C++周刊？"
- "给我看第1期"
- "搜索coroutine相关内容"

### 方法 2: 查看MCP状态

在 Claude Desktop 中，点击工具图标（🔧），应该能看到 "cpp-weekly" 服务器已连接。

## 常见问题

### Q: Claude 没有反应或说找不到工具

**A:** 检查配置文件格式是否正确，特别注意：
- JSON 格式是否有效（没有多余逗号）
- 路径是否正确（使用绝对路径）
- 是否重启了 Claude Desktop

### Q: 如何查看错误日志？

**A:** 日志位置：
- macOS: `~/Library/Logs/Claude/`
- Windows: `%APPDATA%\Claude\logs\`

查看 `mcp*.log` 文件了解详细错误信息。

### Q: 路径中包含空格怎么办？

**A:** 在 JSON 中直接写即可，不需要转义：
```json
"args": ["/Users/my name/weekly/mcp-server/index.js"]
```

### Q: 可以同时配置多个MCP服务器吗？

**A:** 可以！在 `mcpServers` 中添加多个配置：
```json
{
  "mcpServers": {
    "cpp-weekly": {
      "command": "node",
      "args": ["/path/to/weekly/mcp-server/index.js"]
    },
    "other-server": {
      "command": "python",
      "args": ["/path/to/other/server.py"]
    }
  }
}
```

## 下一步

- 查看 [README.md](./README.md) 了解所有功能
- 查看 [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) 学习使用技巧
- 查看 [index.js](./index.js) 了解实现细节

## 获取帮助

如果遇到问题：
1. 运行 `node test.js` 确认基本功能正常
2. 检查 Claude Desktop 日志
3. 确认 Node.js 版本 >= 18
4. 提交 issue 到项目仓库

祝使用愉快！
