# MCP 服务器使用示例

## 在 Claude Desktop 中使用

配置完成后，你可以直接与Claude对话来访问C++周刊内容。以下是一些示例：

### 1. 列出所有周刊

**提问:**
```
请列出所有C++中文周刊的期数
```

**Claude会使用 `list_weeklies` 工具，并返回类似:**
```
共有195期C++中文周刊，从第001期到第195期。
```

### 2. 获取特定期数内容

**提问:**
```
给我看第1期的内容
```

**Claude会使用 `get_weekly` 工具，返回第1期的完整Markdown内容。**

### 3. 获取周刊摘要

**提问:**
```
第195期讲了什么？给我一个概览
```

**Claude会使用 `get_weekly_summary` 工具，并返回:**
```json
{
  "title": "第195期",
  "sections": ["资讯", "文章", "视频"],
  "intro": "每周日推送从reddit/hackernews/lobsters摘抄一些c++动态",
  "linkCount": 18,
  "characterCount": 4523
}
```

### 4. 搜索关键词

**提问:**
```
搜索所有关于协程(coroutine)的内容
```

**Claude会使用 `search_weeklies` 工具，返回包含"coroutine"的所有期数和相关内容片段。**

### 5. 获取最新周刊

**提问:**
```
最新一期周刊讲了什么？
```

**Claude会使用 `get_latest_weekly` 工具，自动获取最新一期的内容。**

### 6. 组合查询

**提问:**
```
帮我找出所有讨论C++20新特性的周刊，并总结一下
```

**Claude会:**
1. 使用 `search_weeklies` 搜索 "C++20"
2. 对搜索结果进行分析
3. 使用 `get_weekly` 获取相关期数的详细内容
4. 生成总结报告

### 7. 深度分析

**提问:**
```
分析一下C++周刊中最常讨论的主题是什么
```

**Claude会:**
1. 使用 `list_weeklies` 获取所有期数
2. 使用 `get_weekly_summary` 获取每期的章节信息
3. 统计和分析常见主题
4. 生成分析报告

## 技术细节

### 工具列表

服务器提供以下5个工具：

1. **list_weeklies** - 无参数，返回所有期数列表
2. **get_weekly** - 参数: `issue` (string)
3. **get_weekly_summary** - 参数: `issue` (string)
4. **get_latest_weekly** - 无参数
5. **search_weeklies** - 参数: `keyword` (string)

### JSON-RPC 示例

如果你要直接通过MCP协议调用（用于开发和调试）：

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weekly",
    "arguments": {
      "issue": "001"
    }
  }
}
```

## 常见场景

### 学习路径规划

```
我想学习C++20的新特性，从周刊中找出相关内容，按照难度排序
```

### 技术趋势分析

```
分析最近一年的周刊，C++社区最关注什么技术话题？
```

### 资源收集

```
找出所有关于性能优化的文章和工具推荐
```

### 快速查阅

```
第100期到第110期之间有没有讨论模块(module)相关的内容？
```

## 提示

- Claude可以同时使用多个工具来完成复杂任务
- 搜索功能支持中英文
- 摘要功能会自动提取章节结构
- 所有工具都会返回原始Markdown格式，保持原始链接和格式

## 故障排除

如果Claude无法访问周刊内容：

1. 确认MCP服务器已正确配置在 `claude_desktop_config.json` 中
2. 重启Claude Desktop
3. 检查服务器路径是否正确
4. 查看Claude Desktop的日志文件

**macOS日志位置:**
```
~/Library/Logs/Claude/mcp*.log
```

**Windows日志位置:**
```
%APPDATA%\Claude\logs\mcp*.log
```
