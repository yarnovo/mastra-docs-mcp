# Mastra Documentation MCP Server

English | [中文](README.md)

This project provides an MCP (Model Context Protocol) server for Mastra official documentation, supporting intelligent document querying and access capabilities based on **vector semantic search**.

## Project Background

When learning Mastra AI framework development, developers often need to communicate with AI large language models to get technical guidance and solutions. However, large language models are prone to hallucinations, providing inaccurate or outdated information that can mislead learners.

To solve this problem, we need to provide large language models with accurate and reliable Mastra official documentation indexing. Through keyword searches, large language models can directly access real links and information from Mastra official documentation, thus providing more accurate technical guidance.

## Solution

This project provides an MCP (Model Context Protocol) server specifically designed for intelligent search and indexing of Mastra official documentation. To obtain complete document structure, we use dynamic data collection technology to scrape navigation and page content from the official website, ensuring coverage of all 333 documentation pages across docs, examples, guides, and API reference.

## Features

- 🔍 **Intelligent Document Search**: Supports mixed Chinese-English search to quickly find relevant Mastra official documentation
- 🎯 **Exact Matching**: Keyword exact matching ensures search result accuracy
- 🧠 **Semantic Search**: Vector embedding-based intelligent search that understands query intent
- 📚 **Complete Documentation Coverage**: Includes 333 official documentation pages covering all aspects of Mastra AI framework
- 🔀 **Hybrid Search Strategy**: Combines keyword matching and semantic search for optimal search results
- 🤖 **AI Framework Specialized**: Optimized for AI development concepts like agents, workflows, tools, and memory

## How to Use in MCP Clients

### Prerequisites

To use semantic search functionality, you need to install Ollama and vector embedding models first:

```bash
# 1. Install Ollama (based on your operating system)
curl -fsSL https://ollama.ai/install.sh | sh

# 2. Start Ollama service
ollama serve

# 3. Download embedding model
ollama pull bge-m3
```

### Cursor Configuration

Create or edit the `.cursor/mcp.json` configuration file in the project root directory:

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

### VSCode Configuration

Create or edit the `.vscode/mcp.json` configuration file in the project root directory:

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

After configuration, restart your IDE to use the Mastra documentation search functionality in your AI assistant.

### Environment Variables

You can adjust search behavior by setting environment variables. These variables can be configured in the `env` field of `.cursor/mcp.json` or `.vscode/mcp.json`.

| Environment Variable   | Meaning                                                                 | Default Value            |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------ |
| `OLLAMA_BASE_URL`      | The address of the Ollama service, used for generating vector embeddings. | `http://localhost:11434` |

## MCP Tool Functions

### search_docs_list

Query and return Mastra official documentation link lists, supporting **hybrid search** technology that combines vector semantic search and keyword exact matching.

**Parameters:**
- `search` (required): Semantic search keyword object containing English and Chinese fields, using vector semantic search technology
  - `en` (required): English semantic search keywords
  - `cn` (required): Chinese semantic search keywords
- `keyword` (required): Exact match keyword array, each element contains English and Chinese fields, performs exact matching through lowercase text comparison, **sorted by array order with higher priority** (results matching earlier keywords appear first), higher priority than semantic search
  - Array element structure:
    - `en` (required): English exact match keywords
    - `cn` (required): Chinese exact match keywords
- `maxKeywordResults` (optional): Maximum number of results returned for keyword exact matching, default 15
- `maxSemanticResults` (optional): Maximum number of results returned for vector semantic search, default 15

**Return Data Format:**
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
  "keywordResultCount": 3,
  "semanticResultCount": 2,
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

**Return Data Field Descriptions:**
- `navTitle`: Navigation title (from document navigation menu)
- `pageTitle`: Page title (from page content)
- `pageDescription`: Page description (from page content summary)
- `link`: Documentation link
- `searchSource`: Search source type, possible values:
  - `"keyword"`: From keyword exact matching
  - `"semantic"`: From vector semantic search

**Search Mode Descriptions:**
- `hybrid_search`: Hybrid search (keyword exact matching + vector semantic search)
- `hybrid_search_partial`: Partial hybrid search (keyword matching only, vector search unavailable or failed)
- `error`: Search execution failed

**Usage Examples:**
- Agent workflow search: `search_docs_list(search={en:"agent", cn:"智能体"}, keyword=[{en:"workflow", cn:"工作流"}])`
- Tool and protocol search: `search_docs_list(search={en:"tool", cn:"工具"}, keyword=[{en:"mcp", cn:"协议"}])`
- Find installation guides: `search_docs_list(search={en:"installation", cn:"安装Mastra"}, keyword=[{en:"guide", cn:"指南"}])`
- RAG vector search: `search_docs_list(search={en:"rag", cn:"检索增强"}, keyword=[{en:"vector", cn:"向量"}])`
- Memory thread functionality: `search_docs_list(search={en:"memory", cn:"记忆管理"}, keyword=[{en:"thread", cn:"线程"}])`
- Multi-keyword priority search: `search_docs_list(search={en:"ai development", cn:"AI开发"}, keyword=[{en:"agent", cn:"智能体"}, {en:"workflow", cn:"工作流"}, {en:"tool", cn:"工具"}])` (agent results prioritized, then workflow, finally tool)
- Custom result count: `search_docs_list(search={en:"agent", cn:"智能体"}, keyword=[{en:"workflow", cn:"工作流"}], maxKeywordResults=20, maxSemanticResults=10)`

**Performance and Token Consumption:**

The values of `maxKeywordResults` and `maxSemanticResults` determine the number of results returned.
- **Higher Values**: Return more relevant documents, providing richer context for the large language model, which can improve the accuracy of its responses.
- **Token Consumption**: Each returned document link (link item) consumes about 50 tokens. If you set both `maxKeywordResults` and `maxSemanticResults` to 100, the theoretical maximum token consumption would be close to `(100 + 100) * 50 = 10,000` tokens.
- **Recommended Value**: Considering that exact match results are often fewer, the actual consumption is typically around 1,500 tokens (default value 15). You can adjust these values based on your token usage costs and accuracy requirements.

## Data Statistics

### Collection Results
- **Original navigation links**: 87
- **Dynamically obtained links**: 2415  
- **New links added**: 2328
- **Expanded menu items**: 492
- **Expansion rounds**: 7 rounds

### Data Completeness
- **Page title coverage**: ~98.5%
- **Page description coverage**: ~97.2%
- **Vectorized document count**: 2415
- **Vector dimensions**: 1024 (bge-m3 model)

## Technical Implementation

### Vector Search Engine

Based on the following technology stack:
- **LanceDB**: High-performance vector database
- **Ollama**: Local embedding model service
- **bge-m3**: Multilingual embedding model supporting mixed Chinese-English queries

### Hybrid Search Workflow

1. **Parameter Parsing**: 
   - Receives object-structured `search` and `keyword` parameters
   - Extracts English (`en`) and Chinese (`cn`) field content respectively

2. **Keyword Exact Matching**: 
   - Converts English and Chinese keywords to lowercase
   - Performs text inclusion matching in navigation titles, page titles, and page descriptions
   - Matches both English and Chinese keywords simultaneously to expand matching scope
   - Returns specified number of matching results

3. **Vector Semantic Search**:
   - Merges English and Chinese search terms into a single query (`search.cn + " " + search.en`)
   - Converts merged query to vector embedding
   - Performs similarity search in LanceDB
   - Returns semantically most relevant results

4. **Result Merging & Deduplication**:
   - Keyword matching results are sorted by keyword array order priority (earlier keyword matches appear first)
   - Deduplicates keyword matching results, keeping the highest priority result
   - Prioritizes keyword matching results (higher priority than semantic search)
   - Adds semantic search results (deduplicated based on link field)
   - Ensures no duplicate links, maintaining result quality

5. **Intelligent Fallback**: If vector search is unavailable, still provides keyword matching results

### Automated Expansion Strategy

```javascript
// Find unexpanded menu buttons
const expandButtons = await page.$$('.btn-expander .icon-arrow-forward-ios:not(.is-rotated)');
```

### Error Handling Mechanisms
- Automatic retry mechanism
- Scroll to visible area
- DOM update waiting
- Exception capture and logging
- Vector service connection detection

## Generated Data Formats

### enhanced-list.json - Enhanced Link Data
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

## Performance Metrics

### Build Performance
- Browser startup: ~2-3 seconds
- Page loading: ~5-10 seconds  
- Navigation expansion: ~30-60 seconds
- Data parsing: ~1-2 seconds
- Vectorization processing: ~5-10 minutes (2415 documents)
- Total build time: ~15-20 minutes

### Query Performance
- Vector search response: <200 milliseconds
- Database connection: <100 milliseconds
- Embedding vector generation: ~50-100 milliseconds

## Technology Stack

### Core Technologies
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe development language
- **MCP SDK**: Model Context Protocol implementation

### Data Collection
- **Puppeteer**: Headless browser control
- **JSDOM**: HTML parsing and processing
- **Playwright**: Browser installation management

### Search Technologies
- **LanceDB**: Vector database
- **Ollama**: Local AI model service
- **bge-m3**: Multilingual embedding model
- **Apache Arrow**: High-performance data processing

### Development Tools
- **Vitest**: Unit testing framework
- **tsx**: TypeScript executor
- **Zod**: Parameter validation
- **Rimraf**: Cross-platform file deletion

## Environment Variables

```bash
# Ollama service address
OLLAMA_BASE_URL=http://localhost:11434
```

## Development & Testing

### File Structure

```
├── scripts/                    # Build scripts (TypeScript)
│   ├── fetch-nav.ts            # Dynamically fetch navigation structure
│   ├── parse-nav.ts            # Parse HTML and generate JSON
│   ├── fetch-descriptions.ts   # Fetch page titles and descriptions
│   ├── merge-data.ts           # Merge navigation and page data
│   └── build-vector-db.ts      # Build vector database
├── src/                        # Source code
│   ├── index.ts                # MCP server implementation
│   └── vector-search.ts        # Vector search engine
├── sources/                    # Data files
│   ├── list.json               # Basic link list
│   ├── descriptions.json       # Page description data
│   ├── enhanced-list.json      # Enhanced link data (merged)
│   └── db/                     # Vector database
├── tests/                      # Test files
│   └── mcp-client.test.ts      # MCP client tests
├── dist/                       # Compiled JavaScript files
├── nav-dist.html               # Dynamically obtained complete navigation (2415 links)
├── tsconfig.json               # TypeScript configuration
├── tsconfig.build.json         # Build configuration
└── package.json                # Project configuration
```

### Installation & Configuration

#### Prerequisites

1. **Node.js**: Version >= 18.0.0
2. **Ollama**: For vector embedding generation
   ```bash
   # Install Ollama (according to your operating system)
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Start Ollama service
   ollama serve
   
   # Download embedding model
   ollama pull bge-m3
   ```

#### Clone Project to Local
```bash
git clone https://github.com/your-username/unreal-engine-docs-mcp.git
cd unreal-engine-docs-mcp
```

#### Install Dependencies
```bash
npm install
```

#### Build Project
```bash
npm run build
```

### Using Existing Data

The project's `sources/` directory already contains preprocessed metadata:
- `enhanced-list.json`: Complete data for 2415 Unreal Engine documentation links
- `db/`: Pre-built vector database files

You can use this data directly without rebuilding.

### Rebuild Documentation Data (Optional)

If you need to get the latest documentation data, you can rebuild:

#### Complete Build Process
```bash
# Complete build process (fetch navigation → parse → fetch descriptions → merge data)
npm run build-docs
```

#### Step-by-step Execution
```bash
# 1. Fetch dynamic navigation structure
npm run fetch-nav

# 2. Parse HTML to generate link list
npm run parse-nav

# 3. Fetch page titles and descriptions
npm run fetch-descriptions

# 4. Merge data to generate enhanced link list
npm run merge-data
```

### Build Vector Database

If you need to rebuild the vector database:
```bash
# Ensure Ollama service is running
ollama serve

# Build vector database
npm run build-vector-db
```

### Testing

You can write test cases in the `tests/` directory:

```bash
# Execute all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Troubleshooting

### Vector Search Unavailable
1. Check if Ollama service is running: `ollama serve`
2. Confirm model is installed: `ollama list`
3. Check if vector database exists: `sources/db/`
4. Rebuild vector database: `npm run build-vector-db`

### Data Fetch Failed
1. Check network connection
2. Confirm Unreal Engine documentation website is accessible
3. Check browser installation: `npm run install-browsers`

## Future Optimization Plans

- [ ] Support incremental data updates

## Contributing

Welcome to submit Issues and Pull Requests to improve this project.

### Development Process
1. Fork the project
2. Create a feature branch
3. Submit changes
4. Run tests to ensure they pass
5. Submit Pull Request

## License

MIT License 