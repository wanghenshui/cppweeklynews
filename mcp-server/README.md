# C++ 中文周刊 MCP 服务器

这是一个用于C++中文周刊内容的MCP (Model Context Protocol) 服务器，可以让AI助手访问和总结周刊内容。

## 快速开始

**新手？** 查看 [快速开始指南 (QUICKSTART.md)](./QUICKSTART.md) 5分钟完成部署！

**使用示例？** 查看 [使用示例 (USAGE_EXAMPLES.md)](./USAGE_EXAMPLES.md) 学习如何提问。

**HTTP模式？** 查看 [HTTP模式部署指南 (HTTP_MODE.md)](./HTTP_MODE.md) 了解如何部署为独立Web服务。

**修复说明：** 查看 [FIXES.md](./FIXES.md) 了解HTTP模式的接口修复详情。

## 运行模式

本MCP服务器支持两种运行模式：

### 1. Stdio 模式（默认）

由Claude Desktop直接启动，适合桌面使用：

```bash
node index.js
```

### 2. HTTP/SSE 模式

作为独立Web服务运行，支持远程访问和多客户端：

```bash
npm run start:http
# 或
./start-server.sh
```

服务器启动在 `http://localhost:3000`

## 功能

- **列出所有周刊** (`list_weeklies`): 获取所有可用周刊的期数列表
- **获取周刊内容** (`get_weekly`): 获取指定期数的完整内容
- **获取周刊摘要** (`get_weekly_summary`): 获取周刊的元数据和摘要
- **获取最新周刊** (`get_latest_weekly`): 自动获取最新一期
- **搜索周刊** (`search_weeklies`): 按关键词搜索所有周刊

## 安装

```bash
cd mcp-server
npm install
```

## 配置

### 在 Claude Desktop 中使用

编辑 Claude Desktop 配置文件：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

添加以下配置：

```json
{
  "mcpServers": {
    "cpp-weekly": {
      "command": "node",
      "args": ["/path/to/weekly/mcp-server/index.js"]
    }
  }
}
```

将 `/path/to/weekly` 替换为实际的项目路径。

### 在其他MCP客户端中使用

MCP服务器通过stdio通信，可以被任何支持MCP的客户端使用：

```bash
node /path/to/weekly/mcp-server/index.js
```

## 工具说明

### 1. list_weeklies

列出所有周刊期数。

**参数**: 无

**返回示例**:
```json
{
  "total": 195,
  "issues": ["001", "002", "003", ...]
}
```

### 2. get_weekly

获取指定期数的完整内容。

**参数**:
- `issue` (string): 周刊期数，如 "001", "195"

**返回**: 完整的Markdown格式周刊内容

### 3. get_weekly_summary

获取周刊的摘要信息。

**参数**:
- `issue` (string): 周刊期数

**返回示例**:
```json
{
  "title": "第1期",
  "sections": ["资讯", "文章", "视频", "开源项目", "工具"],
  "intro": "每周日推送从reddit/hackernews/lobsters摘抄一些c++动态",
  "linkCount": 25,
  "characterCount": 5432
}
```

### 4. get_latest_weekly

获取最新一期周刊。

**参数**: 无

**返回**: 最新一期的完整内容

### 5. search_weeklies

在所有周刊中搜索关键词。

**参数**:
- `keyword` (string): 搜索关键词

**返回示例**:
```json
{
  "keyword": "coroutine",
  "totalMatches": 5,
  "results": [
    {
      "issue": "001",
      "matches": ["...匹配的上下文..."]
    }
  ]
}
```

## 使用示例

配置完成后，在Claude Desktop中可以这样提问：

- "列出所有C++周刊"
- "给我看第1期的内容"
- "第195期讲了什么？"
- "搜索关于coroutine的内容"
- "最新一期周刊讲了什么？"

## 开发

服务器使用 `@modelcontextprotocol/sdk` 实现，遵循MCP标准协议。

主要文件：
- `index.js`: 服务器主程序
- `package.json`: 依赖配置

## 故障排除

### 服务器无法启动

1. 确保Node.js版本 >= 18
2. 检查依赖是否正确安装: `npm install`
3. 检查路径配置是否正确

### 无法读取文件

确保 `posts` 目录存在于 `mcp-server` 的上级目录中。

### Claude Desktop无法连接

1. 重启Claude Desktop
2. 检查配置文件格式是否正确
3. 查看Claude Desktop的日志文件

## 许可证

MIT
