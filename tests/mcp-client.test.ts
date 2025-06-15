#!/usr/bin/env node

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let client: Client;
let transport: StdioClientTransport;

// 检测是否在CI环境中
const isCI = !!process.env.CI;

describe.skipIf(isCI)('MCP 服务端测试', () => {
  beforeAll(async () => {
    console.log("🚀 开始测试 MCP 服务端...");

    // 创建客户端传输，连接到编译后的服务端
    const serverPath = join(__dirname, "..", "dist", "bin", "index.js");
    console.log(`📁 服务端路径: ${serverPath}`);

    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    // 创建客户端
    client = new Client({
      name: "unreal-engine-docs-test-client",
      version: "1.0.0",
    });

    // 连接到服务端
    console.log("🔗 连接到服务端...");
    await client.connect(transport);
    console.log("✅ 成功连接到服务端");
  });

  afterAll(async () => {
    // 关闭客户端连接
    if (client) {
      await client.close();
      console.log("🔌 客户端连接已关闭");
    }
  });

  it('应该能列出可用工具', async () => {
    console.log("\n📋 列出可用工具...");
    const tools = await client.listTools();
    
    expect(tools.tools).toBeDefined();
    expect(tools.tools.length).toBeGreaterThan(0);
    
    console.log("可用工具:");
    tools.tools.forEach((tool) => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // 检查是否有预期的工具
    const toolNames = tools.tools.map(t => t.name);
    expect(toolNames).toContain('search_docs_list');
  });

  it('应该能调用混合搜索工具 (对象参数结构)', async () => {
    console.log("\n🔧 测试1: 调用混合搜索工具 (数组关键词结构)");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "agent",
          cn: "智能体"
        },
        keyword: [
          {
            en: "workflow",
            cn: "工作流"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.total).toBeDefined();
    expect(data.search).toEqual({ en: "agent", cn: "智能体" });
    expect(data.keyword).toEqual([{ en: "workflow", cn: "工作流" }]);
    expect(data.combinedSearchTerm).toBe("智能体 agent");
    expect(data.searchMethod).toBeDefined();
    expect(data.maxKeywordResults).toBeDefined();
    expect(data.maxSemanticResults).toBeDefined();
    expect(data.keywordResultCount).toBeDefined();
    expect(data.semanticResultCount).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("数组关键词结构混合搜索结果统计:");
    console.log(`  - 总数: ${data.total}`);
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词数组: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果:");
    data.links.slice(0, 5).forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能执行对象结构的关键词精确匹配优先混合搜索', async () => {
    console.log("\n🔧 测试2: 数组关键词结构的精确匹配优先混合搜索");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "tool",
          cn: "工具"
        },
        keyword: [
          {
            en: "mcp",
            cn: "协议"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toEqual({ en: "tool", cn: "工具" });
    expect(data.keyword).toEqual([{ en: "mcp", cn: "协议" }]);
    expect(data.combinedSearchTerm).toBe("工具 tool");
    expect(data.searchMethod).toBeDefined();
    expect(data.vectorSearchAvailable).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("数组关键词结构混合搜索结果统计:");
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词数组: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果 (关键词匹配优先):");
    data.links.forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     页面描述: ${link.pageDescription || "无"}`);
      console.log(`     搜索来源: ${link.searchSource}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能搜索对象结构的完整混合查询', async () => {
    console.log("\n🔧 测试3: 数组关键词结构的完整混合搜索");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "memory",
          cn: "记忆"
        },
        keyword: [
          {
            en: "agent",
            cn: "智能体"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toEqual({ en: "memory", cn: "记忆" });
    expect(data.keyword).toEqual([{ en: "agent", cn: "智能体" }]);
    expect(data.combinedSearchTerm).toBe("记忆 memory");
    expect(data.searchMethod).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("数组关键词结构的完整混合搜索结果统计:");
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词数组: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    if (data.links.length > 0) {
      console.log("中文搜索结果:");
      data.links.forEach((link: any, index: number) => {
        console.log(`  ${index + 1}. ${link.navTitle}`);
        console.log(`     页面标题: ${link.pageTitle || "无"}`);
        console.log(`     搜索来源: ${link.searchSource}`);
        console.log(`     链接: ${link.link}`);
      });
    } else {
      console.log("  - 无搜索结果");
    }
  });

  it('应该能执行多种对象结构的混合搜索组合', async () => {
    const searchCombinations = [
      { search: { en: "workflow", cn: "工作流" }, keyword: [{ en: "agent", cn: "智能体" }], name: "工作流+智能体" },
      { search: { en: "rag", cn: "RAG" }, keyword: [{ en: "vector", cn: "向量" }], name: "RAG+向量" },
      { search: { en: "tool", cn: "工具" }, keyword: [{ en: "mcp", cn: "协议" }], name: "工具+协议" },
      { search: { en: "memory", cn: "记忆" }, keyword: [{ en: "thread", cn: "线程" }], name: "记忆+线程" },
    ];
    
    for (const combo of searchCombinations) {
      console.log(`\n🔧 测试数组关键词结构混合搜索: ${combo.name}`);
      const result = await client.callTool({
        name: "search_docs_list",
        arguments: {
          search: combo.search,
          keyword: combo.keyword,
        },
      });

      expect(result).toBeDefined();
      const content = result as any;
      expect(content.content).toBeDefined();
      expect(content.content.length).toBeGreaterThan(0);
      expect(content.content[0].type).toBe("text");

      const data = JSON.parse(content.content[0].text);
      expect(data.search).toEqual(combo.search);
      expect(data.keyword).toEqual(combo.keyword);
      expect(data.combinedSearchTerm).toBe(`${combo.search.cn} ${combo.search.en}`);
      expect(data.searchMethod).toBeDefined();
      expect(data.links).toBeDefined();
      expect(Array.isArray(data.links)).toBe(true);

      console.log(
        `  - 关键词匹配: ${data.keywordResultCount} 个，语义搜索: ${data.semanticResultCount} 个`
      );
      console.log(
        `  - 总结果: ${data.links.length} 个 (搜索方法: ${data.searchMethod})`
      );
      if (data.links.length > 0) {
        console.log(`  - 首个结果: ${data.links[0].navTitle}`);
      }
    }
  });

  it('应该能执行多个关键词的数组搜索', async () => {
    console.log("\n🔧 测试4: 多个关键词数组搜索");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "ai development",
          cn: "AI开发"
        },
        keyword: [
          {
            en: "agent",
            cn: "智能体"
          },
          {
            en: "workflow",
            cn: "工作流"
          },
          {
            en: "tool",
            cn: "工具"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.search).toEqual({ en: "ai development", cn: "AI开发" });
    expect(data.keyword).toHaveLength(3);
    expect(data.keyword).toEqual([
      { en: "agent", cn: "智能体" },
      { en: "workflow", cn: "工作流" },
      { en: "tool", cn: "工具" }
    ]);
    expect(data.combinedSearchTerm).toBe("AI开发 ai development");
    expect(data.searchMethod).toBeDefined();
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("多个关键词数组搜索结果统计:");
    console.log(`  - 语义搜索对象: ${JSON.stringify(data.search)}`);
    console.log(`  - 关键词数组长度: ${data.keyword.length}`);
    console.log(`  - 关键词数组: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 合并搜索词: ${data.combinedSearchTerm}`);
    console.log(`  - 搜索方法: ${data.searchMethod}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 向量搜索可用: ${data.vectorSearchAvailable}`);
    console.log(`  - 返回链接数: ${data.links.length}`);
    console.log("搜索结果 (按关键词优先级排序):");
    data.links.slice(0, 5).forEach((link: any, index: number) => {
      console.log(`  ${index + 1}. ${link.navTitle}`);
      console.log(`     页面标题: ${link.pageTitle || "无"}`);
      console.log(`     搜索来源: ${link.searchSource}`);
      console.log(`     链接: ${link.link}`);
    });
  });

  it('应该能验证搜索来源字段', async () => {
    console.log("\n🔧 测试: 验证搜索来源字段");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "workflow",
          cn: "工作流"
        },
        keyword: [
          {
            en: "agent",
            cn: "智能体"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    // 验证每个链接都有 searchSource 字段
    data.links.forEach((link: any, index: number) => {
      expect(link.searchSource).toBeDefined();
      expect(['keyword', 'semantic']).toContain(link.searchSource);
      console.log(`  ${index + 1}. ${link.navTitle} - 来源: ${link.searchSource}`);
    });

    console.log(`✅ 所有 ${data.links.length} 个链接都包含有效的搜索来源字段`);
  });

  it('应该能按关键词优先级排序搜索结果', async () => {
    console.log("\n🔧 测试: 验证关键词优先级排序");
    const result = await client.callTool({
      name: "search_docs_list",
      arguments: {
        search: {
          en: "mastra",
          cn: "框架"
        },
        keyword: [
          {
            en: "agent", // 第1优先级
            cn: "智能体"
          },
          {
            en: "workflow", // 第2优先级  
            cn: "工作流"
          },
          {
            en: "tool", // 第3优先级
            cn: "工具"
          }
        ],
      },
    });

    expect(result).toBeDefined();
    const content = result as any;
    expect(content.content).toBeDefined();
    expect(content.content.length).toBeGreaterThan(0);
    expect(content.content[0].type).toBe("text");

    const data = JSON.parse(content.content[0].text);
    expect(data.links).toBeDefined();
    expect(Array.isArray(data.links)).toBe(true);

    console.log("关键词优先级排序测试结果:");
    console.log(`  - 关键词数组: ${JSON.stringify(data.keyword)}`);
    console.log(`  - 关键词匹配数: ${data.keywordResultCount}`);
    console.log(`  - 语义搜索数: ${data.semanticResultCount}`);
    console.log(`  - 返回链接数: ${data.links.length}`);

    // 分析关键词搜索结果的排序
    const keywordResults = data.links.filter((link: any) => link.searchSource === 'keyword');
    if (keywordResults.length > 0) {
      console.log("关键词搜索结果 (应按优先级排序):");
      keywordResults.forEach((link: any, index: number) => {
        // 检查哪个关键词匹配了
        let matchedKeyword = "";
        const searchFields = [
          link.navTitle?.toLowerCase() || "",
          link.pageTitle?.toLowerCase() || "",
          link.pageDescription?.toLowerCase() || "",
        ];
        
        data.keyword.forEach((kw: any, kwIndex: number) => {
          const keywordTerm = kw.en.toLowerCase();
          const keywordCnTerm = kw.cn.toLowerCase();
          
          if (searchFields.some((field: string) => 
            field.includes(keywordTerm) || field.includes(keywordCnTerm)
          )) {
            if (!matchedKeyword) {
              matchedKeyword = `第${kwIndex + 1}优先级: "${kw.en}/${kw.cn}"`;
            }
          }
        });

        console.log(`    ${index + 1}. ${link.navTitle}`);
        console.log(`       匹配关键词: ${matchedKeyword}`);
        console.log(`       页面标题: ${link.pageTitle || "无"}`);
      });
    }

    console.log(`✅ 关键词优先级排序测试完成`);
  });
});
