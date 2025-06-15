#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MastraNavLink {
  title: string;
  href: string;
  fullUrl: string;
}

interface MastraNavData {
  name: string;
  baseUrl: string;
  total: number;
  generated: string;
  sources: string[];
  links: MastraNavLink[];
}

interface PageInfo {
  title: string;
  description: string;
}

interface MastraDescriptionsData {
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

interface EnhancedLink {
  navTitle: string;          // 原来的title字段，重命名为navTitle
  link: string;             // 原来的fullUrl字段，重命名为link  
  pageTitle: string;        // 新增：页面标题
  pageDescription: string;  // 新增：页面描述
}

interface OutputData {
  total: number;
  generated: string;
  stats: {
    totalLinks: number;
    withPageTitle: number;
    withPageDescription: number;
    completionRate: {
      pageTitle: string;
      pageDescription: string;
    };
  };
  sourceInfo: {
    navigation: {
      name: string;
      baseUrl: string;
      sources: string[];
      generated: string;
    };
    descriptions: {
      name: string;
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
      generated: string;
    };
  };
  links: EnhancedLink[];
}

/**
 * 合并Mastra导航数据和页面描述数据
 * 生成最终的增强链接列表
 */
async function mergeMastraData(): Promise<void> {
  console.log("🔗 开始合并Mastra导航数据和页面描述数据...");

  try {
    // 读取 mastra-nav.json
    console.log("📋 读取Mastra导航数据...");
    const navPath = join(__dirname, "..", "..", "sources", "mastra-nav.json");
    if (!existsSync(navPath)) {
      throw new Error(`导航数据文件不存在: ${navPath}。请先运行 npm run parse-mastra-nav`);
    }
    
    const navData: MastraNavData = JSON.parse(readFileSync(navPath, "utf-8"));
    const baseLinks = navData.links || [];
    console.log(`  ✅ 读取了 ${baseLinks.length} 个导航链接`);
    console.log(`  📍 来源: ${navData.sources?.join(', ')}`);
    console.log(`  🌐 基础URL: ${navData.baseUrl}`);

    // 读取 mastra-descriptions.json
    console.log("📄 读取Mastra页面描述数据...");
    const descriptionsPath = join(__dirname, "..", "..", "sources", "mastra-descriptions.json");
    let pageData: Record<string, PageInfo> = {};
    let descriptionsData: MastraDescriptionsData | null = null;

    if (existsSync(descriptionsPath)) {
      try {
        descriptionsData = JSON.parse(readFileSync(descriptionsPath, "utf-8"));
        if (descriptionsData) {
          pageData = descriptionsData.pages || {};
          console.log(`  ✅ 读取了 ${Object.keys(pageData).length} 个页面描述`);
          console.log(`  📊 处理统计: ${descriptionsData.processingStats.successRate} 成功率`);
          console.log(`  ⏱️  处理时间: ${descriptionsData.processingStats.processingTime}`);
        }
      } catch (descError) {
        console.warn("  ⚠️ 无法读取页面描述数据，将使用基础链接数据");
        console.warn("  ", (descError as Error).message);
      }
    } else {
      console.warn("  ⚠️ 页面描述文件不存在，将使用基础链接数据");
      console.warn(`  📁 期望路径: ${descriptionsPath}`);
      console.warn("  💡 提示: 运行 npm run fetch-mastra-descriptions 生成描述数据");
    }

    // 合并数据：创建增强链接列表
    console.log("🔗 合并数据生成增强链接列表...");
    const enhancedLinks: EnhancedLink[] = baseLinks.map((navLink, index) => {
      // 使用fullUrl作为key查找页面信息
      const pageInfo = pageData[navLink.fullUrl];
      
      // 如果找不到，尝试使用不同的URL变体查找
      let finalPageInfo = pageInfo;
      if (!finalPageInfo) {
        // 尝试其他可能的URL格式
        const alternativeUrls = [
          navLink.fullUrl.replace(/\/$/, ''), // 移除末尾斜杠
          navLink.fullUrl + '/', // 添加末尾斜杠
        ];
        
        for (const altUrl of alternativeUrls) {
          if (pageData[altUrl]) {
            finalPageInfo = pageData[altUrl];
            break;
          }
        }
      }

      if (index < 5) { // 显示前5个合并示例
        console.log(`  ${index + 1}. 导航: "${navLink.title}"`);
        console.log(`     链接: ${navLink.fullUrl}`);
        console.log(`     页面标题: ${finalPageInfo?.title || "无"}`);
        console.log(`     页面描述: ${finalPageInfo?.description ? `${finalPageInfo.description.substring(0, 50)}...` : "无"}`);
      }

      return {
        navTitle: navLink.title,              // 原title -> navTitle
        link: navLink.fullUrl,                // 原fullUrl -> link
        pageTitle: finalPageInfo?.title || "",           // 新增字段
        pageDescription: finalPageInfo?.description || "" // 新增字段
      };
    });

    // 统计信息
    const withPageTitle = enhancedLinks.filter((link) => link.pageTitle).length;
    const withPageDescription = enhancedLinks.filter((link) => link.pageDescription).length;

    // 创建输出数据结构
    const outputData: OutputData = {
      total: enhancedLinks.length,
      generated: new Date().toISOString(),
      stats: {
        totalLinks: enhancedLinks.length,
        withPageTitle: withPageTitle,
        withPageDescription: withPageDescription,
        completionRate: {
          pageTitle: `${((withPageTitle / enhancedLinks.length) * 100).toFixed(1)}%`,
          pageDescription: `${((withPageDescription / enhancedLinks.length) * 100).toFixed(1)}%`,
        },
      },
      sourceInfo: {
        navigation: {
          name: navData.name,
          baseUrl: navData.baseUrl,
          sources: navData.sources,
          generated: navData.generated,
        },
        descriptions: descriptionsData ? {
          name: descriptionsData.name,
          processingStats: descriptionsData.processingStats,
          crawlerConfig: descriptionsData.crawlerConfig,
          generated: descriptionsData.generated,
        } : {
          name: "未获取",
          processingStats: {
            totalLinks: 0,
            successCount: 0,
            failedCount: 0,
            successRate: "0%",
            processingTime: "0s",
          },
          crawlerConfig: {
            batchSize: 0,
            headless: true,
            userAgent: "",
          },
          generated: "",
        },
      },
      links: enhancedLinks,
    };

    // 写入合并后的数据
    const outputPath = join(__dirname, "..", "..", "sources", "enhanced-list.json");
    writeFileSync(outputPath, JSON.stringify(outputData, null, 2), "utf-8");

    console.log("\n✅ Mastra数据合并完成！");
    console.log(`📊 合并统计信息:`);
    console.log(`   • 总链接数: ${enhancedLinks.length}`);
    console.log(`   • 有页面标题: ${withPageTitle} (${outputData.stats.completionRate.pageTitle})`);
    console.log(`   • 有页面描述: ${withPageDescription} (${outputData.stats.completionRate.pageDescription})`);
    console.log(`   • 导航来源: ${navData.sources?.join(', ')}`);
    console.log(`   • 描述获取: ${descriptionsData ? descriptionsData.processingStats.successRate + " 成功率" : "未执行"}`);
    console.log(`💾 输出文件: ${outputPath}`);
    console.log(`📋 字段结构:`);
    console.log(`   • navTitle: 导航标题`);
    console.log(`   • link: 完整链接`);
    console.log(`   • pageTitle: 页面标题`);
    console.log(`   • pageDescription: 页面描述`);

    // 显示前3个合并结果示例
    console.log(`\n📋 合并结果示例:`);
    enhancedLinks.slice(0, 3).forEach((link, index) => {
      console.log(`${index + 1}. 导航标题: ${link.navTitle}`);
      console.log(`   页面标题: ${link.pageTitle || "无"}`);
      console.log(`   页面描述: ${link.pageDescription ? `${link.pageDescription.substring(0, 100)}...` : "无"}`);
      console.log(`   链接: ${link.link}\n`);
    });

  } catch (error) {
    console.error("❌ 合并Mastra数据失败:", (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
  }
}

// 执行合并
mergeMastraData().catch(console.error); 