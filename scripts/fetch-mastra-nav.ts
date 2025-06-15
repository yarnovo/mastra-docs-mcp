#!/usr/bin/env tsx

import puppeteer, { Browser } from "puppeteer";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MastraConfig {
  name: string;
  baseUrl: string;
  docsUrls: Record<string, string>;
  navigation: {
    selector: string;
    id: string;
    fullSelector: string;
  };
  output: {
    htmlFolder: string;
  };
  crawler: {
    timeout: number;
    waitForSelector: string;
    userAgent: string;
  };
}

async function fetchMastraNavigation(): Promise<void> {
  let browser: Browser | null = null;

  try {
    // 读取配置文件
    console.log("📄 读取配置文件...");
    const configPath = path.join(__dirname, "..", "..", "config", "fetch-mastra-nav.config.json");
    const configContent = readFileSync(configPath, "utf-8");
    const config: MastraConfig = JSON.parse(configContent);
    
    console.log(`🎯 目标网站: ${config.name}`);
    console.log(`🔗 文档页面数量: ${Object.keys(config.docsUrls).length}`);

    console.log("🚀 启动浏览器...");
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // 设置用户代理和视口
    await page.setUserAgent(config.crawler.userAgent);
    await page.setViewport({ width: 1920, height: 1080 });

    // 创建sources目录和HTML文件夹
    const sourcesPath = path.join(__dirname, "..", "..", "sources");
    const htmlFolderPath = path.join(sourcesPath, config.output.htmlFolder);
    try {
      mkdirSync(htmlFolderPath, { recursive: true });
    } catch (err) {
      // 目录已存在
    }

    let totalLinks = 0;

    // 循环处理每个文档页面
    for (const [pageName, pageUrl] of Object.entries(config.docsUrls)) {
      console.log(`\n📄 处理页面: ${pageName} (${pageUrl})`);
      
      // 访问页面并等待加载完成
      await page.goto(pageUrl, {
        waitUntil: "networkidle2",
        timeout: config.crawler.timeout,
      });
      console.log(`✅ ${pageName} 页面加载完成`);

      // 等待导航元素加载
      console.log(`⏳ 等待导航元素加载 (${config.navigation.fullSelector})...`);
      await page.waitForSelector(config.navigation.fullSelector, { 
        timeout: 10000 
      });

      // 获取完整的导航HTML
      console.log(`📋 提取 ${pageName} 导航HTML结构...`);
      const navigationHtml = await page.evaluate((selector: string) => {
        const navElement = document.querySelector(selector);
        return navElement ? navElement.outerHTML : null;
      }, config.navigation.fullSelector);

      if (!navigationHtml) {
        throw new Error(`未找到 ${config.navigation.fullSelector} 元素在页面 ${pageName}`);
      }

      // 保存HTML到文件
      const htmlOutputPath = path.join(htmlFolderPath, `${pageName}.html`);
      writeFileSync(htmlOutputPath, navigationHtml, "utf-8");
      console.log(`💾 ${pageName} 导航HTML已保存到: ${htmlOutputPath}`);

      // 统计链接数量（仅用于显示信息）
      const linkCount = await page.evaluate((selector: string) => {
        const navElement = document.querySelector(selector);
        if (!navElement) return 0;
        return navElement.querySelectorAll("a").length;
      }, config.navigation.fullSelector);

      console.log(`🔗 ${pageName} 检测到 ${linkCount} 个链接`);
      totalLinks += linkCount;
    }

    console.log(`\n🎉 所有页面处理完成！`);
    console.log(`📊 总计检测到 ${totalLinks} 个链接`);
    console.log("✅ HTML获取完成！请运行解析脚本生成JSON数据。");
    
  } catch (error) {
    console.error("❌ 获取Mastra导航失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

fetchMastraNavigation(); 