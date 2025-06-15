#!/usr/bin/env tsx

import puppeteer, { Browser } from "puppeteer";
import { writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function debugMastraSelectors(): Promise<void> {
  let browser: Browser | null = null;

  try {
    console.log("🚀 启动浏览器...");
    browser = await puppeteer.launch({
      headless: false, // 设置为false以便观察
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1920, height: 1080 });

    console.log("📄 访问Mastra文档页面...");
    
    await page.goto("https://mastra.ai/en/docs", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    console.log("✅ 页面加载完成");

    // 等待一下让页面完全加载
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 检查所有aside元素
    console.log("🔍 检查页面中的aside元素...");
    const asideElements = await page.evaluate(() => {
      const asides = document.querySelectorAll("aside");
      const results: Array<{id: string, className: string, textContent: string}> = [];
      
      asides.forEach((aside: Element, index: number) => {
        results.push({
          id: aside.id || `no-id-${index}`,
          className: aside.className || "no-class",
          textContent: (aside.textContent || "").substring(0, 100) + "..."
        });
      });
      
      return results;
    });

    console.log(`📋 找到 ${asideElements.length} 个aside元素:`);
    asideElements.forEach((element, index) => {
      console.log(`${index + 1}. ID: ${element.id}`);
      console.log(`   Class: ${element.className}`);
      console.log(`   Content: ${element.textContent}\n`);
    });

    // 检查导航相关的元素
    console.log("🔍 检查可能的导航元素...");
    const navElements = await page.evaluate(() => {
      const selectors = [
        "nav",
        "[role='navigation']",
        ".nav",
        ".navigation", 
        ".sidebar",
        ".docs-nav",
        ".menu"
      ];
      
      const results: Array<{selector: string, count: number, sample?: {id: string, className: string}}> = [];
      
      selectors.forEach((selector: string) => {
        const elements = document.querySelectorAll(selector);
        const result: {selector: string, count: number, sample?: {id: string, className: string}} = {
          selector: selector,
          count: elements.length
        };
        
        if (elements.length > 0) {
          const first = elements[0];
          result.sample = {
            id: first.id || "no-id",
            className: first.className || "no-class"
          };
        }
        
        results.push(result);
      });
      
      return results;
    });

    console.log("📋 导航相关元素:");
    navElements.forEach((element) => {
      if (element.count > 0) {
        console.log(`${element.selector}: ${element.count} 个`);
        if (element.sample) {
          console.log(`   示例 - ID: ${element.sample.id}, Class: ${element.sample.className}`);
        }
      }
    });

    // 获取页面的完整HTML以供分析
    console.log("💾 保存页面HTML用于分析...");
    const pageHtml = await page.content();
    const outputPath = path.join(__dirname, "..", "sources", "debug-page.html");
    writeFileSync(outputPath, pageHtml, "utf-8");
    console.log(`📁 页面HTML已保存到: ${outputPath}`);

    console.log("✅ 调试完成！");
    
  } catch (error) {
    console.error("❌ 调试失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

debugMastraSelectors(); 