#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "localhost";
const POSTS_DIR = path.join(__dirname, "..", "posts");

// 工具函数：获取所有周刊文件
async function getAllWeeklies() {
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files
      .filter((f) => f.endsWith(".md") && f !== "template.md")
      .map((f) => f.replace(".md", ""))
      .sort((a, b) => {
        const numA = parseInt(a);
        const numB = parseInt(b);
        return numA - numB;
      });
    return mdFiles;
  } catch (error) {
    throw new Error(`Failed to read posts directory: ${error.message}`);
  }
}

// 工具函数：读取周刊内容
async function getWeeklyContent(issueNumber) {
  try {
    const filePath = path.join(POSTS_DIR, `${issueNumber}.md`);
    const content = await fs.readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Failed to read issue ${issueNumber}: ${error.message}`);
  }
}

// 工具函数：提取周刊元数据
function extractMetadata(content) {
  const lines = content.split("\n");
  const metadata = {
    title: "",
    sections: [],
  };

  // 提取标题
  const titleMatch = content.match(/# C\+\+ 中文周刊 第(\d+)期/);
  if (titleMatch) {
    metadata.title = `第${titleMatch[1]}期`;
  }

  // 提取各个章节
  const sectionRegex = /^## (.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    metadata.sections.push(match[1]);
  }

  return metadata;
}

// 工具函数：生成摘要
function generateSummary(content) {
  const metadata = extractMetadata(content);
  const lines = content.split("\n").filter((line) => line.trim());

  // 提取前几段非空内容作为简介
  let intro = "";
  let linkCount = 0;

  // 统计链接和资源
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = content.match(linkRegex);
  if (matches) {
    linkCount = matches.length;
  }

  // 找到第一段有意义的内容
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      !line.startsWith("#") &&
      !line.startsWith("---") &&
      !line.startsWith("layout:") &&
      !line.startsWith("title:") &&
      line.length > 20
    ) {
      intro = line;
      break;
    }
  }

  return {
    title: metadata.title,
    sections: metadata.sections,
    intro: intro,
    linkCount: linkCount,
    characterCount: content.length,
  };
}

// 工具函数：搜索周刊内容
async function searchWeeklies(keyword) {
  const allWeeklies = await getAllWeeklies();
  const results = [];

  for (const issueNumber of allWeeklies) {
    const content = await getWeeklyContent(issueNumber);
    if (content.toLowerCase().includes(keyword.toLowerCase())) {
      const lines = content.split("\n");
      const matchingLines = [];

      for (let i = 0; i < lines.length; i++) {
        if (lines[i].toLowerCase().includes(keyword.toLowerCase())) {
          // 获取上下文：前后各1行
          const context = [];
          if (i > 0) context.push(lines[i - 1]);
          context.push(lines[i]);
          if (i < lines.length - 1) context.push(lines[i + 1]);
          matchingLines.push(context.join("\n"));
        }
      }

      results.push({
        issue: issueNumber,
        matches: matchingLines.slice(0, 5), // 限制每期最多5个匹配
      });
    }
  }

  return results;
}

// 工具处理函数
async function handleToolCall(name, args) {
  switch (name) {
    case "list_weeklies": {
      const weeklies = await getAllWeeklies();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: weeklies.length,
                issues: weeklies,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "get_weekly": {
      const { issue } = args;
      const content = await getWeeklyContent(issue);
      return {
        content: [
          {
            type: "text",
            text: content,
          },
        ],
      };
    }

    case "get_weekly_summary": {
      const { issue } = args;
      const content = await getWeeklyContent(issue);
      const summary = generateSummary(content);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(summary, null, 2),
          },
        ],
      };
    }

    case "get_latest_weekly": {
      const weeklies = await getAllWeeklies();
      const latest = weeklies[weeklies.length - 1];
      const content = await getWeeklyContent(latest);
      return {
        content: [
          {
            type: "text",
            text: `# 最新一期: ${latest}\n\n${content}`,
          },
        ],
      };
    }

    case "search_weeklies": {
      const { keyword } = args;
      const results = await searchWeeklies(keyword);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                keyword: keyword,
                totalMatches: results.length,
                results: results,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// 创建Express应用
const app = express();

// 启用CORS
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "cpp-weekly-mcp-server" });
});

// SSE端点
app.get("/sse", async (req, res) => {
  console.log("New SSE connection established");

  // 创建MCP服务器实例
  const server = new Server(
    {
      name: "cpp-weekly-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 定义工具列表
  server.setRequestHandler("tools/list", async () => {
    return {
      tools: [
        {
          name: "list_weeklies",
          description:
            "列出所有可用的C++中文周刊期数。返回按期数排序的列表。",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_weekly",
          description:
            "获取指定期数的完整周刊内容。提供期数(如'001', '195')即可获取该期的完整Markdown内容。",
          inputSchema: {
            type: "object",
            properties: {
              issue: {
                type: "string",
                description: "周刊期数，如'001', '195'等",
              },
            },
            required: ["issue"],
          },
        },
        {
          name: "get_weekly_summary",
          description:
            "获取指定期数周刊的摘要信息，包括标题、章节列表、简介、链接数量等元数据。",
          inputSchema: {
            type: "object",
            properties: {
              issue: {
                type: "string",
                description: "周刊期数，如'001', '195'等",
              },
            },
            required: ["issue"],
          },
        },
        {
          name: "get_latest_weekly",
          description:
            "获取最新一期周刊的完整内容。自动返回期数最大的周刊。",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "search_weeklies",
          description:
            "在所有周刊中搜索包含指定关键词的内容。返回匹配的期数和相关上下文片段。",
          inputSchema: {
            type: "object",
            properties: {
              keyword: {
                type: "string",
                description: "要搜索的关键词",
              },
            },
            required: ["keyword"],
          },
        },
      ],
    };
  });

  // 处理工具调用
  server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;

    try {
      return await handleToolCall(name, args);
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  // 创建SSE传输
  const transport = new SSEServerTransport("/messages", res);
  await server.connect(transport);

  // 连接关闭时清理
  req.on("close", () => {
    console.log("SSE connection closed");
  });
});

// POST端点用于发送消息
app.post("/messages", async (req, res) => {
  // SSE传输会处理这些消息
  res.json({ status: "received" });
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`C++ Weekly MCP HTTP Server running at:`);
  console.log(`  - Health check: http://${HOST}:${PORT}/health`);
  console.log(`  - SSE endpoint: http://${HOST}:${PORT}/sse`);
  console.log(`  - Messages endpoint: http://${HOST}:${PORT}/messages`);
  console.log(`\nServer is ready to accept connections.`);
});
