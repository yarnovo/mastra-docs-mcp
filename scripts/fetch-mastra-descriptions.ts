#!/usr/bin/env tsx

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Config {
  name: string;
  input: {
    navigationFile: string;
  };
  output: {
    descriptionsFile: string;
  };
  crawler: {
    batchSize: number;
    timeout: number;
    headless: boolean;
    slowMo: number;
    delays: {
      thinking: { min: number; max: number };
      reading: { min: number; max: number };
      tabOpening: { min: number; max: number };
      batchInterval: { min: number; max: number };
    };
    retries: {
      maxAttempts: number;
      backoffMs: number;
    };
    userAgent: string;
  };
}

interface LinkData {
  title: string;
  href: string;
  fullUrl: string;
}

interface NavigationData {
  name: string;
  baseUrl: string;
  total: number;
  generated: string;
  sources: string[];
  links: LinkData[];
}

interface PageInfo {
  title: string;
  description: string;
}

interface PageResult {
  url: string;
  success: boolean;
  data: PageInfo;
}

interface OutputData {
  name: string;
  baseUrl: string;
  total: number;
  generated: string;
  processingStats: {
    totalLinks: number;
    successCount: number;
    failedCount: number;
    successRate: string;
    processingTime: string;
  };
  crawlerConfig: {
    batchSize: number;
    headless: boolean;
    userAgent: string;
  };
  pages: Record<string, PageInfo>;
}

// 随机延迟函数
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 模拟人类行为
async function simulateHumanBehavior(page: Page, config: Config): Promise<void> {
  try {
    const viewport = page.viewportSize();
    if (viewport) {
      const x = Math.floor(Math.random() * viewport.width);
      const y = Math.floor(Math.random() * viewport.height);
      
      await page.mouse.move(x, y, {
        steps: Math.floor(Math.random() * 5) + 3,
      });

      if (Math.random() > 0.7) {
        await page.mouse.wheel(0, Math.floor(Math.random() * 300) + 100);
        await new Promise(resolve => 
          setTimeout(resolve, randomDelay(200, 500))
        );
      }
    }

    const readingDelay = randomDelay(
      config.crawler.delays.reading.min,
      config.crawler.delays.reading.max
    );
    await new Promise(resolve => setTimeout(resolve, readingDelay));
  } catch (error) {
    console.log(`   🤖 模拟行为出错: ${(error as Error).message}`);
  }
}

// 处理单个页面
async function processSinglePage(
  page: Page,
  linkData: LinkData,
  index: number,
  total: number,
  config: Config
): Promise<PageResult> {
  const url = linkData.fullUrl;

  try {
    console.log(`   [${index}/${total}] 🔗 ${linkData.title}`);
    console.log(`   📍 ${url}`);

    // 思考延迟
    const thinkingDelay = randomDelay(
      config.crawler.delays.thinking.min,
      config.crawler.delays.thinking.max
    );
    await new Promise(resolve => setTimeout(resolve, thinkingDelay));

    // 访问页面
    console.log(`   [${index}] 📄 正在加载...`);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: config.crawler.timeout,
    });

    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response?.status()}: ${response?.statusText()}`);
    }

    // 等待并模拟行为
    await new Promise(resolve => setTimeout(resolve, 800));
    await simulateHumanBehavior(page, config);

    // 提取页面信息
    console.log(`   [${index}] 🔍 提取信息...`);
    const pageInfo = await page.evaluate(() => {
      const pageTitle = document.title || "";

      // 尝试获取各种描述
      const selectors = [
        'meta[name="description"]',
        'meta[property="og:description"]',
        'meta[name="twitter:description"]',
        'meta[property="description"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const content = element.getAttribute("content");
          if (content && content.trim()) {
            return {
              title: pageTitle.trim(),
              description: content.trim(),
            };
          }
        }
      }

      return {
        title: pageTitle.trim(),
        description: "",
      };
    });

    console.log(`   [${index}] ✅ 成功`);
    console.log(`      📑 标题: ${pageInfo.title || "无"}`);
    console.log(`      📝 描述: ${pageInfo.description ? `${pageInfo.description.substring(0, 50)}...` : "无"}`);

    return {
      url,
      success: true,
      data: pageInfo,
    };
  } catch (error) {
    console.log(`   [${index}] ❌ 失败: ${(error as Error).message}`);
    return {
      url,
      success: false,
      data: { title: "", description: "" },
    };
  }
}

async function fetchMastraDescriptions(): Promise<void> {
  let browser: Browser | null = null;
  const startTime = Date.now();

  try {
    // 读取配置文件
    console.log("📄 读取配置文件...");
    const configPath = path.join(__dirname, "..", "..", "config", "fetch-descriptions.config.json");
    const configContent = readFileSync(configPath, "utf-8");
    const config: Config = JSON.parse(configContent);
    
    console.log(`🎯 ${config.name}`);
    console.log(`📊 批处理大小: ${config.crawler.batchSize}`);
    console.log(`⏱️  超时设置: ${config.crawler.timeout}ms`);

    // 读取导航数据
    console.log("📋 读取导航数据...");
    const navPath = path.join(__dirname, "..", "..", "sources", config.input.navigationFile);
    const navData: NavigationData = JSON.parse(readFileSync(navPath, "utf-8"));
    const links = navData.links || [];

    console.log(`📊 找到 ${links.length} 个链接需要处理`);
    console.log(`🗂️  数据源: ${navData.sources?.join(', ') || '未知'}`);

    // 启动浏览器
    console.log("🚀 启动浏览器...");
    browser = await chromium.launch({
      headless: config.crawler.headless,
      slowMo: config.crawler.slowMo,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const pageData: Record<string, PageInfo> = {};
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    // 按批次处理
    const totalBatches = Math.ceil(links.length / config.crawler.batchSize);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * config.crawler.batchSize;
      const endIndex = Math.min(startIndex + config.crawler.batchSize, links.length);
      const batch = links.slice(startIndex, endIndex);
      const currentBatch = batchIndex + 1;

      console.log(`\n🚀 第 ${currentBatch}/${totalBatches} 批 (${batch.length} 个页面)`);
      console.log(`📍 范围: ${startIndex + 1}-${endIndex} / ${links.length}`);

      // 批次间延迟
      if (batchIndex > 0) {
        const batchDelay = randomDelay(
          config.crawler.delays.batchInterval.min,
          config.crawler.delays.batchInterval.max
        );
        console.log(`⏰ 批次间隔 ${batchDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      // 创建浏览器上下文
      const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: config.crawler.userAgent,
      });

      const pages: Page[] = [];
      const pagePromises: Promise<PageResult>[] = [];

      // 创建页面并处理
      for (let i = 0; i < batch.length; i++) {
        const linkData = batch[i];
        const pageIndex = startIndex + i + 1;

        const page = await context.newPage();
        pages.push(page);

        // 资源拦截优化
        await page.route("**/*", route => {
          const resourceType = route.request().resourceType();
          if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
            route.abort();
          } else {
            route.continue();
          }
        });

        const pagePromise = processSinglePage(
          page,
          linkData,
          pageIndex,
          links.length,
          config
        );
        pagePromises.push(pagePromise);

        // 标签页间延迟
        if (i < batch.length - 1) {
          const tabDelay = randomDelay(
            config.crawler.delays.tabOpening.min,
            config.crawler.delays.tabOpening.max
          );
          await new Promise(resolve => setTimeout(resolve, tabDelay));
        }
      }

      // 等待当前批次完成
      const batchResults = await Promise.allSettled(pagePromises);

      // 关闭页面和上下文
      for (const page of pages) {
        try {
          await page.close();
        } catch (error) {
          console.log(`   ⚠️  关闭页面错误: ${(error as Error).message}`);
        }
      }
      await context.close();

      // 处理结果
      batchResults.forEach((result, index) => {
        processedCount++;
        
        if (result.status === "fulfilled") {
          const pageResult = result.value;
          pageData[pageResult.url] = pageResult.data;
          
          if (pageResult.success) {
            successCount++;
          } else {
            failedCount++;
          }
        } else {
          const linkData = batch[index];
          failedCount++;
          pageData[linkData.fullUrl] = { title: "", description: "" };
        }
      });

      const batchSuccess = batchResults.filter(
        r => r.status === "fulfilled" && r.value.success
      ).length;

      console.log(`✅ 第 ${currentBatch} 批完成 - 成功: ${batchSuccess}/${batch.length}`);
      console.log(`📈 总进度: ${processedCount}/${links.length} (${((processedCount / links.length) * 100).toFixed(1)}%)`);
    }

    // 计算处理时间
    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(1);

    // 保存结果
    const outputPath = path.join(__dirname, "..", "..", "sources", config.output.descriptionsFile);
    const outputData: OutputData = {
      name: navData.name,
      baseUrl: navData.baseUrl,
      total: Object.keys(pageData).length,
      generated: new Date().toISOString(),
      processingStats: {
        totalLinks: links.length,
        successCount,
        failedCount,
        successRate: `${((successCount / links.length) * 100).toFixed(1)}%`,
        processingTime: `${processingTime}s`,
      },
      crawlerConfig: {
        batchSize: config.crawler.batchSize,
        headless: config.crawler.headless,
        userAgent: config.crawler.userAgent,
      },
      pages: pageData,
    };

    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf-8");

    console.log(`\n🎉 处理完成！`);
    console.log(`📁 输出文件: ${outputPath}`);
    console.log(`📊 最终统计:`);
    console.log(`   - 总链接: ${links.length}`);
    console.log(`   - 成功: ${successCount}`);
    console.log(`   - 失败: ${failedCount}`);
    console.log(`   - 成功率: ${outputData.processingStats.successRate}`);
    console.log(`   - 处理时间: ${processingTime}s`);
    console.log(`   - 有标题: ${Object.values(pageData).filter(d => d.title).length}`);
    console.log(`   - 有描述: ${Object.values(pageData).filter(d => d.description).length}`);

    // 显示示例
    console.log("\n📋 页面信息示例:");
    let exampleCount = 0;
    for (const [url, info] of Object.entries(pageData)) {
      if ((info.title || info.description) && exampleCount < 3) {
        console.log(`${exampleCount + 1}. 标题: ${info.title || "无"}`);
        console.log(`   描述: ${info.description || "无"}`);
        console.log(`   链接: ${url}\n`);
        exampleCount++;
      }
    }

  } catch (error) {
    console.error("❌ 获取描述失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    console.log("✅ 资源清理完成");
  }
}

fetchMastraDescriptions(); 