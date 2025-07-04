# Mastra 文档 MCP 服务器

[English](README_EN.md) | 中文

这个项目提供 Mastra 官方文档的 MCP（Model Context Protocol）服务器，支持**基于向量语义搜索**的智能文档查询和访问功能。

## 项目背景

在学习 Mastra AI 框架开发过程中，开发者经常需要与AI大模型交流以获取技术指导和解决方案。但是，大模型容易产生幻觉，提供不准确或过时的信息，这会误导学习者。

为了解决这个问题，我们需要为大模型提供准确、可靠的 Mastra 官方文档索引。通过关键字搜索，大模型可以直接获取来自 Mastra 官方文档的真实链接和信息，从而提供更准确的技术指导。

## 解决方案

本项目提供了一个 MCP（Model Context Protocol）服务器，专门用于 Mastra 官方文档的智能搜索和索引。为了获取完整的文档结构，我们采用动态数据采集技术从官方网站抓取导航和页面内容，确保收录所有333个文档页面，覆盖文档、示例、指南和API参考。

## 功能特性

- 🔍 **智能文档搜索**: 支持中英文混合搜索，快速找到相关的 Mastra 官方文档
- 🎯 **精确匹配**: 关键词精确匹配，确保搜索结果的准确性
- 🧠 **语义搜索**: 基于向量嵌入的智能搜索，理解查询意图
- 📚 **完整文档覆盖**: 收录333个官方文档页面，覆盖 Mastra AI 框架各个方面
- 🔀 **混合搜索策略**: 结合关键词匹配和语义搜索，提供最佳搜索结果
- 🤖 **AI框架专用**: 专门针对智能体、工作流、工具、记忆等 AI 开发概念优化

## 在MCP客户端中如何使用

### 前置要求

为了使用语义搜索功能，需要先安装Ollama和向量嵌入模型：

```bash
# 1. 安装 Ollama (根据你的操作系统)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. 启动 Ollama 服务
ollama serve

# 3. 下载嵌入模型
ollama pull bge-m3
```

### Cursor 配置

在项目根目录创建或编辑 `.cursor/mcp.json` 配置文件：

```json
{
    "mcpServers": {
        "mastra-docs-mcp": {
            "command": "npx",
            "args": [
                "-y",
                "mastra-docs-mcp"
            ],
            "env": {
                "OLLAMA_BASE_URL": "http://localhost:11434"
            }
        }
    }
}
```

### VSCode 配置

在项目根目录创建或编辑 `.vscode/mcp.json` 配置文件：

```json
{
    "servers": {
        "mastra-docs-mcp": {
            "type": "stdio",
            "command": "npx",
            "args": [
                "-y",
                "mastra-docs-mcp"
            ],
            "env": {
                "OLLAMA_BASE_URL": "http://localhost:11434"
            }
        }
    }
}
```

配置完成后，重启你的IDE，就可以在AI助手中使用 Mastra 文档搜索功能了。

### 环境变量说明

您可以通过设置环境变量来调整搜索行为。这些变量可以在 `.cursor/mcp.json` 或 `.vscode/mcp.json` 的 `env` 字段中配置。

| 环境变量               | 含义                                                                                                                                                                                            | 默认值                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `OLLAMA_BASE_URL`      | Ollama 服务的地址，用于生成向量嵌入。                                                                                                                                                           | `http://localhost:11434` |

## MCP工具功能

### search_docs_list

查询并返回 Mastra 官方文档链接列表，支持**混合搜索**技术，结合向量语义搜索和关键词精确匹配。

**参数:**
- `search` (必需): 语义搜索关键字对象，包含英文和中文字段，使用向量语义搜索技术
  - `en` (必需): 英文语义搜索关键字
  - `cn` (必需): 中文语义搜索关键字
- `keyword` (必需): 精确匹配关键词数组，每个元素包含英文和中文字段，通过文本小写比对进行精确匹配，**按数组顺序进行优先级排序**（前面的关键词匹配结果排在最前面），优先级高于语义搜索
  - 数组中每个元素结构:
    - `en` (必需): 英文精确匹配关键词
    - `cn` (必需): 中文精确匹配关键词
- `maxKeywordResults` (可选): 关键词精确匹配返回的最大结果数量，默认为15
- `maxSemanticResults` (可选): 向量语义搜索返回的最大结果数量，默认为15

**返回数据格式:**
```json
{
  "total": 333,
  "search": {
    "en": "agent",
    "cn": "智能体"
  },
  "keyword": [
    {
      "en": "workflow",
      "cn": "工作流"
    }
  ],
  "combinedSearchTerm": "agent 智能体",
  "searchMethod": "hybrid_search",
  "maxKeywordResults": 15,
  "maxSemanticResults": 15,
  "keywordResultCount": 5,
  "semanticResultCount": 3,
  "vectorSearchAvailable": true,
  "error": null,
  "links": [
    {
      "navTitle": "Overview",
      "pageTitle": "Creating and Calling Agents | Agent Documentation | Mastra",
      "pageDescription": "Overview of agents in Mastra, detailing their capabilities and how they interact with tools, workflows, and external systems.",
      "link": "https://mastra.ai/docs/agents/overview",
      "searchSource": "keyword"
    },
    ...
  ]
}
```

**返回数据字段说明:**
- `navTitle`: 导航标题 (来自文档导航菜单)
- `pageTitle`: 页面标题 (来自页面内容)
- `pageDescription`: 页面描述 (来自页面内容摘要)
- `link`: 文档链接
- `searchSource`: 搜索来源类型，可能的值:
  - `"keyword"`: 来自关键词精确匹配
  - `"semantic"`: 来自向量语义搜索

**搜索模式说明:**
- `hybrid_search`: 混合搜索 (关键词精确匹配 + 向量语义搜索)
- `hybrid_search_partial`: 部分混合搜索 (仅关键词匹配，向量搜索不可用或失败)
- `error`: 搜索执行失败

**使用示例:**
- 智能体工作流搜索: `search_docs_list(search={en:"agent", cn:"智能体"}, keyword=[{en:"workflow", cn:"工作流"}])`
- 工具与协议搜索: `search_docs_list(search={en:"tool", cn:"工具"}, keyword=[{en:"mcp", cn:"协议"}])`
- 查找安装指南: `search_docs_list(search={en:"installation", cn:"安装Mastra"}, keyword=[{en:"guide", cn:"指南"}])`
- RAG向量搜索: `search_docs_list(search={en:"rag", cn:"检索增强"}, keyword=[{en:"vector", cn:"向量"}])`
- 记忆线程功能: `search_docs_list(search={en:"memory", cn:"记忆管理"}, keyword=[{en:"thread", cn:"线程"}])`
- 多关键词优先级搜索: `search_docs_list(search={en:"ai development", cn:"AI开发"}, keyword=[{en:"agent", cn:"智能体"}, {en:"workflow", cn:"工作流"}, {en:"tool", cn:"工具"}])` (agent匹配结果优先，其次workflow，最后tool)
- 自定义结果数量: `search_docs_list(search={en:"agent", cn:"智能体"}, keyword=[{en:"workflow", cn:"工作流"}], maxKeywordResults=20, maxSemanticResults=10)`

**性能与Token消耗说明:**

`maxKeywordResults` 和 `maxSemanticResults` 的值决定了返回结果的数量。
- **更高的值**: 返回更多相关文档，可以为大语言模型提供更丰富的上下文，从而提高回答的准确性。
- **Token 消耗**: 每个返回的文档链接（link item）大约消耗 50 个 Token。如果您将 `maxKeywordResults` 和 `maxSemanticResults` 都设置为 100，理论上最大 Token 消耗将接近 `(100 + 100) * 50 = 10,000` 个 Token。
- **推荐值**: 考虑到精确搜索的结果通常较少，实际消耗通常在 1500 个 Token 左右（默认值15）。您可以根据自己的 Token 使用成本和对准确性的要求，自行调整这些值。



## 数据统计

### 采集成果
- **导航链接总数**: 333个
- **数据来源**: docs, examples, guides, reference  
- **页面抓取成功率**: 100%
- **处理时间**: 395.1秒

### 数据完整性
- **页面标题覆盖率**: 100% (333/333)
- **页面描述覆盖率**: 93.4% (311/333)
- **向量化文档数量**: 333个

### 文档分类统计
- **Docs 文档**: 73个链接
- **Examples 示例**: 88个链接  
- **Guides 指南**: 5个链接
- **Reference 参考**: 167个链接
- **向量维度**: 1024 (bge-m3模型)

## 技术实现

### 向量搜索引擎

基于以下技术栈：
- **LanceDB**: 高性能向量数据库
- **Ollama**: 本地嵌入模型服务
- **bge-m3**: 多语言嵌入模型，支持中英文混合查询

### 混合搜索工作流程

1. **参数解析**: 
   - 接收对象化的 `search` 和 `keyword` 参数
   - 分别提取英文 (`en`) 和中文 (`cn`) 字段内容

2. **关键词精确匹配**: 
   - 将英文和中文关键词转换为小写
   - 在导航标题、页面标题、页面描述中进行文本包含匹配
   - 同时匹配英文和中文关键词，扩大匹配范围
   - 返回指定数量的匹配结果

3. **向量语义搜索**:
   - 合并英文和中文搜索词为单一查询 (`search.cn + " " + search.en`)
   - 将合并查询转换为向量嵌入
   - 在 LanceDB 中执行相似度搜索
   - 返回语义最相关的结果

4. **结果合并与去重**:
   - 关键词匹配结果按关键词数组的顺序进行优先级排序 (前面的关键词匹配结果排在前面)
   - 对关键词匹配结果去重，保留优先级最高的结果
   - 优先添加关键词匹配结果 (优先级高于语义搜索)
   - 添加语义搜索结果 (基于 link 字段去重)
   - 确保无重复链接，保持结果质量

5. **智能降级**: 如果向量搜索不可用，仍可提供关键词匹配结果

### 自动化展开策略

```javascript
// 查找未展开的菜单按钮
const expandButtons = await page.$$('.btn-expander .icon-arrow-forward-ios:not(.is-rotated)');
```

### 错误处理机制
- 自动重试机制
- 滚动到可视区域
- DOM更新等待
- 异常捕获和日志记录
- 向量服务连接检测

## 生成的数据格式

### enhanced-list.json - 增强链接数据
```json
{
  "total": 2415,
  "generated": "2025-01-12T10:30:15.387Z",
  "stats": {
    "totalLinks": 2415,
    "withPageTitle": 2380,
    "withPageDescription": 2347,
    "completionRate": {
      "pageTitle": "98.5%",
      "pageDescription": "97.2%"
    }
  },
  "links": [
    {
      "navTitle": "新内容",
      "pageTitle": "虚幻引擎新功能",
      "pageDescription": "了解虚幻引擎5.6的新功能和改进。",
      "link": "https://dev.epicgames.com/documentation/zh-cn/unreal-engine/whats-new"
    }
  ]
}
```

## 性能指标

### 构建性能
- 浏览器启动: ~2-3秒
- 页面加载: ~5-10秒  
- 导航展开: ~30-60秒
- 数据解析: ~1-2秒
- 向量化处理: ~5-10分钟 (2415个文档)
- 总构建时间: ~15-20分钟

### 查询性能
- 向量搜索响应: <200毫秒
- 数据库连接: <100毫秒
- 嵌入向量生成: ~50-100毫秒

## 技术栈

### 核心技术
- **Node.js**: 运行环境
- **TypeScript**: 类型安全的开发语言
- **MCP SDK**: Model Context Protocol 实现

### 数据采集
- **Puppeteer**: 无头浏览器控制
- **JSDOM**: HTML解析和处理
- **Playwright**: 浏览器安装管理

### 搜索技术
- **LanceDB**: 向量数据库
- **Ollama**: 本地AI模型服务
- **bge-m3**: 多语言嵌入模型
- **Apache Arrow**: 高性能数据处理

### 开发工具
- **Vitest**: 单元测试框架
- **tsx**: TypeScript执行器
- **Zod**: 参数验证
- **Rimraf**: 跨平台文件删除

## 环境变量

```bash
# Ollama服务地址
OLLAMA_BASE_URL=http://localhost:11434
```

## 开发与测试

### 文件结构

```
├── scripts/                    # 构建脚本 (TypeScript)
│   ├── fetch-nav.ts            # 动态获取导航结构
│   ├── parse-nav.ts            # 解析HTML并生成JSON
│   ├── fetch-descriptions.ts   # 获取页面标题和描述信息
│   ├── merge-data.ts           # 合并导航和页面数据
│   └── build-vector-db.ts      # 构建向量数据库
├── src/                        # 源代码
│   ├── index.ts                # MCP服务器实现
│   └── vector-search.ts        # 向量搜索引擎
├── sources/                    # 数据文件
│   ├── list.json               # 基础链接列表
│   ├── descriptions.json       # 页面描述数据
│   ├── enhanced-list.json      # 增强链接数据 (合并后)
│   └── db/                     # 向量数据库
├── tests/                      # 测试文件
│   └── mcp-client.test.ts      # MCP客户端测试
├── dist/                       # 编译后的JavaScript文件
├── nav-dist.html               # 动态获取的完整导航(2415个链接)
├── tsconfig.json               # TypeScript配置
├── tsconfig.build.json         # 构建配置
└── package.json                # 项目配置
```

### 安装与配置

#### 前置要求

1. **Node.js**: 版本 >= 18.0.0
2. **Ollama**: 用于向量嵌入生成
   ```bash
   # 安装 Ollama (根据你的操作系统)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # 启动 Ollama 服务
   ollama serve
   
   # 下载嵌入模型
   ollama pull bge-m3
   ```

#### 克隆项目到本地
```bash
git clone https://github.com/your-username/unreal-engine-docs-mcp.git
cd unreal-engine-docs-mcp
```

#### 安装依赖
```bash
npm install
```

#### 构建项目
```bash
npm run build
```

### 使用现有数据

项目的 `sources/` 目录已经包含了预处理好的元数据：
- `enhanced-list.json`: 包含2415个虚幻引擎文档链接的完整数据
- `db/`: 预构建的向量数据库文件

你可以直接使用这些数据，无需重新构建。

### 重新构建文档数据 (可选)

如果需要获取最新的文档数据，可以重新构建：

#### 完整构建流程
```bash
# 完整构建流程 (获取导航→解析→获取描述→合并数据)
npm run build-docs
```

#### 分步执行
```bash
# 1. 获取动态导航结构
npm run fetch-nav

# 2. 解析HTML生成链接列表
npm run parse-nav

# 3. 获取页面标题和描述
npm run fetch-descriptions

# 4. 合并数据生成增强链接列表
npm run merge-data
```

### 构建向量数据库

如果需要重新构建向量数据库：
```bash
# 确保 Ollama 服务正在运行
ollama serve

# 构建向量数据库
npm run build-vector-db
```

### 测试

你可以编写测试用例在 `tests/` 目录中：

```bash
# 执行所有测试
npm test

# 监视模式运行测试
npm run test:watch
```

## 故障排除

### 向量搜索不可用
1. 检查 Ollama 服务是否运行: `ollama serve`
2. 确认模型已安装: `ollama list`
3. 检查向量数据库是否存在: `sources/db/`
4. 重新构建向量数据库: `npm run build-vector-db`

### 数据获取失败
1. 检查网络连接
2. 确认虚幻引擎文档网站可访问
3. 检查浏览器安装: `npm run install-browsers`

## 后续优化计划

- [ ] 支持增量数据更新

## 贡献指南

欢迎提交Issue和Pull Request来改进这个项目。

### 开发流程
1. Fork 项目
2. 创建特性分支
3. 提交更改
4. 运行测试确保通过
5. 提交Pull Request

## 许可证

MIT License 