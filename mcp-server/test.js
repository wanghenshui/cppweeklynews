#!/usr/bin/env node

/**
 * 简单的测试脚本，用于验证MCP服务器的基本功能
 * 注意: 这不是通过MCP协议测试，而是直接测试工具函数
 */

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const POSTS_DIR = path.join(__dirname, "..", "posts");

async function testGetAllWeeklies() {
  console.log("\n=== 测试: 获取所有周刊 ===");
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files
      .filter((f) => f.endsWith(".md") && f !== "template.md")
      .map((f) => f.replace(".md", ""))
      .sort((a, b) => parseInt(a) - parseInt(b));

    console.log(`✓ 找到 ${mdFiles.length} 期周刊`);
    console.log(`  最早: ${mdFiles[0]}, 最新: ${mdFiles[mdFiles.length - 1]}`);
    return mdFiles;
  } catch (error) {
    console.error("✗ 失败:", error.message);
    return [];
  }
}

async function testGetWeekly(issue) {
  console.log(`\n=== 测试: 获取第 ${issue} 期 ===`);
  try {
    const filePath = path.join(POSTS_DIR, `${issue}.md`);
    const content = await fs.readFile(filePath, "utf-8");
    console.log(`✓ 成功读取，共 ${content.length} 字符`);
    console.log(`  前100个字符: ${content.substring(0, 100).replace(/\n/g, " ")}...`);
    return content;
  } catch (error) {
    console.error("✗ 失败:", error.message);
    return null;
  }
}

async function testExtractMetadata(content) {
  console.log("\n=== 测试: 提取元数据 ===");
  const titleMatch = content.match(/# C\+\+ 中文周刊 第(\d+)期/);
  const sections = [];
  const sectionRegex = /^## (.+)$/gm;
  let match;
  while ((match = sectionRegex.exec(content)) !== null) {
    sections.push(match[1]);
  }

  console.log(`✓ 标题: ${titleMatch ? titleMatch[0] : "未找到"}`);
  console.log(`✓ 章节: ${sections.join(", ")}`);
  return { title: titleMatch ? titleMatch[1] : "", sections };
}

async function testSearch(keyword) {
  console.log(`\n=== 测试: 搜索关键词 "${keyword}" ===`);
  try {
    const files = await fs.readdir(POSTS_DIR);
    const mdFiles = files.filter(
      (f) => f.endsWith(".md") && f !== "template.md"
    );

    let matchCount = 0;
    for (const file of mdFiles.slice(0, 10)) {
      // 只测试前10个
      const content = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        matchCount++;
      }
    }

    console.log(`✓ 在前10期中找到 ${matchCount} 期包含该关键词`);
  } catch (error) {
    console.error("✗ 失败:", error.message);
  }
}

async function main() {
  console.log("开始测试 C++ 中文周刊 MCP 服务器功能...\n");

  // 测试获取所有周刊
  const weeklies = await testGetAllWeeklies();

  if (weeklies.length === 0) {
    console.error("\n无法继续测试，未找到周刊文件");
    return;
  }

  // 测试获取特定周刊
  const content = await testGetWeekly("001");

  if (content) {
    // 测试提取元数据
    await testExtractMetadata(content);
  }

  // 测试搜索
  await testSearch("coroutine");

  console.log("\n=== 测试完成 ===");
  console.log("\n提示: 这只是基本功能测试。");
  console.log("要完整测试MCP协议，请在Claude Desktop中配置并使用。");
}

main().catch(console.error);
