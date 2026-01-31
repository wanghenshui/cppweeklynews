#!/usr/bin/env node

/**
 * C++ Weekly MCP Server - 基于官方SDK的StreamableHTTPServerTransport实现
 *
 * 这是使用MCP SDK标准模式的正确实现
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import http from "node:http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const POSTS_DIR = path.join(__dirname, "..", "posts");
const MODE = process.env.MODE || "http"; // http 或 stdio

// 工具函数
async function getAllWeeklies() {
  try {
    const files = await fs.readdir(POSTS_DIR);
    return files
      .filter((f) => f.endsWith(".md") && f !== "template.md")
      .map((f) => f.replace(".md", ""))
      .sort((a, b) => parseInt(a) - parseInt(b));
  } catch (error) {
    throw new Error(`Failed to read posts directory: ${error.message}`);
  }
}

async function getWeeklyContent(issueNumber) {
  try {
    const filePath = path.join(POSTS_DIR, `${issueNumber}.md`);
    return await fs.readFile(filePath, "utf-8");
  } catch (error) {
    throw new Error(`Failed to read issue ${issueNumber}: ${error.message}`);
  }
}

function extractMetadata(content) {
  const metadata = { title: "", sections: [] };
  const titleMatch = content.match(/# C\+\+ 中文周刊 第(\d+)期/);
  if (titleMatch) metadata.title = `第${titleMatch[1]}期`;

  const sectionRegex = /^## (.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    metadata.sections.push(match[1]);
  }
  return metadata;
}

function generateSummary(content) {
  const metadata = extractMetadata(content);
  const lines = content.split("\n").filter((line) => line.trim());

  let intro = "";
  let linkCount = 0;

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const matches = content.match(linkRegex);
  if (matches) linkCount = matches.length;

  for (const line of lines) {
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
    intro,
    linkCount,
    characterCount: content.length,
  };
}

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
          const context = [];
          if (i > 0) context.push(lines[i - 1]);
          context.push(lines[i]);
          if (i < lines.length - 1) context.push(lines[i + 1]);
          matchingLines.push(context.join("\n"));
        }
      }

      results.push({
        issue: issueNumber,
        matches: matchingLines.slice(0, 5),
      });
    }
  }

  return results;
}

// 创建MCP服务器
function createMCPServer() {
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
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "list_weeklies",
          description: "列出所有可用的C++中文周刊期数。返回按期数排序的列表。",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "get_weekly",
          description: "获取指定期数的完整周刊内容。",
          inputSchema: {
            type: "object",
            properties: {
              issue: { type: "string", description: "周刊期数，如'001', '195'等" },
            },
            required: ["issue"],
          },
        },
        {
          name: "get_weekly_summary",
          description: "获取周刊摘要信息。",
          inputSchema: {
            type: "object",
            properties: {
              issue: { type: "string", description: "周刊期数" },
            },
            required: ["issue"],
          },
        },
        {
          name: "get_latest_weekly",
          description: "获取最新一期周刊的完整内容。",
          inputSchema: { type: "object", properties: {} },
        },
        {
          name: "search_weeklies",
          description: "搜索周刊内容。",
          inputSchema: {
            type: "object",
            properties: {
              keyword: { type: "string", description: "搜索关键词" },
            },
            required: ["keyword"],
          },
        },
      ],
    };
  });

  // 处理工具调用
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "list_weeklies": {
          const weeklies = await getAllWeeklies();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({ total: weeklies.length, issues: weeklies }, null, 2),
              },
            ],
          };
        }

        case "get_weekly": {
          const content = await getWeeklyContent(args.issue);
          return { content: [{ type: "text", text: content }] };
        }

        case "get_weekly_summary": {
          const content = await getWeeklyContent(args.issue);
          const summary = generateSummary(content);
          return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
        }

        case "get_latest_weekly": {
          const weeklies = await getAllWeeklies();
          const latest = weeklies[weeklies.length - 1];
          const content = await getWeeklyContent(latest);
          return { content: [{ type: "text", text: `# 最新一期: ${latest}\n\n${content}` }] };
        }

        case "search_weeklies": {
          const results = await searchWeeklies(args.keyword);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { keyword: args.keyword, totalMatches: results.length, results },
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
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true,
      };
    }
  });

  return server;
}

// HTTP模式启动
async function startHTTPServer() {
  const server = createMCPServer();

  // 创建StreamableHTTP传输（有状态模式）
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  // 连接服务器和传输
  await server.connect(transport);
  console.log("✓ MCP Server connected to transport");

  // 创建HTTP服务器
  const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    // 健康检查端点
    if (url.pathname === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "cpp-weekly-mcp-server" }));
      return;
    }

    // MCP端点 - 让传输处理所有MCP请求
    if (url.pathname === "/mcp") {
      // 读取请求body（对于POST请求）
      let body = undefined;
      if (req.method === "POST") {
        const chunks = [];
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        const bodyText = Buffer.concat(chunks).toString();
        try {
          body = bodyText ? JSON.parse(bodyText) : undefined;
        } catch (e) {
          console.error("Failed to parse body:", e);
        }
      }

      // 让传输处理请求
      await transport.handleRequest(req, res, body);
      return;
    }

    // 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  httpServer.listen(PORT, HOST, () => {
    console.log("\n" + "=".repeat(60));
    console.log("C++ Weekly MCP HTTP Server");
    console.log("=".repeat(60));
    console.log(`Server running at: http://${HOST}:${PORT}`);
    console.log(`  - Health check: http://${HOST}:${PORT}/health`);
    console.log(`  - MCP endpoint: http://${HOST}:${PORT}/mcp`);
    console.log("\nConfigure in Claude Desktop:");
    console.log(`{`);
    console.log(`  "mcpServers": {`);
    console.log(`    "cpp-weekly": {`);
    console.log(`      "url": "http://${HOST}:${PORT}/mcp"`);
    console.log(`    }`);
    console.log(`  }`);
    console.log(`}`);
    console.log("=".repeat(60));
    console.log("");
  });
}

// Stdio模式启动
async function startStdioServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("C++ Weekly MCP Server running on stdio");
}

// 主函数
async function main() {
  if (MODE === "stdio") {
    await startStdioServer();
  } else {
    await startHTTPServer();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
