#!/usr/bin/env node

/**
 * MCP HTTP客户端示例
 *
 * 演示如何通过HTTP/SSE与MCP服务器交互
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

async function main() {
  console.log("Connecting to MCP server at:", SERVER_URL);
  console.log("=".repeat(50));
  console.log("");

  try {
    // 创建客户端
    const client = new Client(
      {
        name: "cpp-weekly-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    // 创建SSE传输
    const transport = new SSEClientTransport(new URL(SERVER_URL + "/sse"));

    // 连接到服务器
    await client.connect(transport);
    console.log("✓ Connected to server\n");

    // 1. 列出可用工具
    console.log("1. Listing available tools...");
    const tools = await client.listTools();
    console.log(`   Found ${tools.tools.length} tools:`);
    tools.tools.forEach((tool) => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log("");

    // 2. 测试 list_weeklies
    console.log("2. Calling list_weeklies...");
    const weekliesList = await client.callTool({
      name: "list_weeklies",
      arguments: {},
    });
    const weekliesData = JSON.parse(weekliesList.content[0].text);
    console.log(`   ✓ Found ${weekliesData.total} issues`);
    console.log(`   First: ${weekliesData.issues[0]}, Last: ${weekliesData.issues[weekliesData.issues.length - 1]}`);
    console.log("");

    // 3. 测试 get_weekly_summary
    console.log("3. Getting summary of issue 001...");
    const summary = await client.callTool({
      name: "get_weekly_summary",
      arguments: { issue: "001" },
    });
    const summaryData = JSON.parse(summary.content[0].text);
    console.log(`   ✓ Title: ${summaryData.title}`);
    console.log(`   ✓ Sections: ${summaryData.sections.join(", ")}`);
    console.log(`   ✓ Links: ${summaryData.linkCount}`);
    console.log("");

    // 4. 测试 search_weeklies
    console.log("4. Searching for 'coroutine'...");
    const searchResult = await client.callTool({
      name: "search_weeklies",
      arguments: { keyword: "coroutine" },
    });
    const searchData = JSON.parse(searchResult.content[0].text);
    console.log(`   ✓ Found ${searchData.totalMatches} matching issues`);
    if (searchData.results.length > 0) {
      console.log(`   ✓ First match in issue: ${searchData.results[0].issue}`);
    }
    console.log("");

    // 5. 测试 get_latest_weekly
    console.log("5. Getting latest weekly...");
    const latest = await client.callTool({
      name: "get_latest_weekly",
      arguments: {},
    });
    const latestContent = latest.content[0].text;
    const latestMatch = latestContent.match(/最新一期: (\d+)/);
    if (latestMatch) {
      console.log(`   ✓ Latest issue: ${latestMatch[1]}`);
    }
    console.log("");

    console.log("=".repeat(50));
    console.log("✓ All tests passed!");
    console.log("");

    // 关闭连接
    await client.close();
    process.exit(0);
  } catch (error) {
    console.error("✗ Error:", error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
