#!/usr/bin/env tsx

import { readFileSync, writeFileSync, readdirSync } from "fs";
import { JSDOM } from "jsdom";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ParseConfig {
  name: string;
  baseUrl: string;
  input: {
    htmlFolder: string;
  };
  output: {
    jsonFile: string;
  };
}

interface LinkData {
  title: string;
  href: string;
  fullUrl: string;
}

interface OutputData {
  name: string;
  baseUrl: string;
  total: number;
  generated: string;
  sources: string[];
  links: LinkData[];
}

function parseMastraNavigation(): void {
  try {
    // 读取配置文件
    console.log("📄 读取配置文件...");
    const configPath = path.join(__dirname, "..", "..", "config", "parse-mastra-nav.config.json");
    const configContent = readFileSync(configPath, "utf-8");
    const config: ParseConfig = JSON.parse(configContent);

    // 读取HTML文件夹
    console.log("📄 读取HTML文件夹...");
    const htmlFolderPath = path.join(__dirname, "..", "..", "sources", config.input.htmlFolder);
    const htmlFiles = readdirSync(htmlFolderPath).filter(file => file.endsWith('.html'));
    
    console.log(`📋 找到 ${htmlFiles.length} 个HTML文件: ${htmlFiles.join(', ')}`);

    // 提取所有链接（扁平化处理，不保留层级结构）
    const links: LinkData[] = [];
    const processedSources: string[] = [];

    for (const htmlFile of htmlFiles) {
      const sourceName = path.basename(htmlFile, '.html');
      console.log(`\n🔍 解析 ${sourceName} HTML结构...`);
      
      const htmlPath = path.join(htmlFolderPath, htmlFile);
      const htmlContent = readFileSync(htmlPath, "utf-8");
      
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const anchors = document.querySelectorAll("a");

      console.log(`📋 ${sourceName} 找到 ${anchors.length} 个链接元素`);

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute("href");
        const title = anchor.textContent?.trim();

        if (href && title) {
          // 构建完整URL
          const fullUrl = href.startsWith("http")
            ? href
            : `${config.baseUrl}${href}`;

          links.push({
            title: title,
            href: href,
            fullUrl: fullUrl,
          });
        }
      });

      processedSources.push(sourceName);
    }

    // 去重处理（基于fullUrl）
    const uniqueLinks = links.filter((link, index, self) => 
      self.findIndex(l => l.fullUrl === link.fullUrl) === index
    );

    console.log(`\n🔗 合并去重后得到 ${uniqueLinks.length} 个唯一链接`);

    // 生成输出数据
    const outputData: OutputData = {
      name: config.name,
      baseUrl: config.baseUrl,
      total: uniqueLinks.length,
      generated: new Date().toISOString(),
      sources: processedSources,
      links: uniqueLinks,
    };

    // 保存JSON文件
    const outputPath = path.join(__dirname, "..", "..", "sources", config.output.jsonFile);
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf-8");

    console.log(`💾 JSON数据已保存到: ${outputPath}`);
    console.log(`📊 总计: ${uniqueLinks.length} 个链接`);
    console.log(`📦 源文件: ${processedSources.join(', ')}`);
    console.log(`🕒 生成时间: ${outputData.generated}`);

    // 显示前5个链接作为示例
    console.log("\n📋 前5个链接示例:");
    uniqueLinks.slice(0, 5).forEach((link, index) => {
      console.log(`${index + 1}. ${link.title}`);
      console.log(`   ${link.fullUrl}\n`);
    });

    console.log("✅ 解析完成！");
  } catch (error) {
    console.error("❌ 解析失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

parseMastraNavigation(); 