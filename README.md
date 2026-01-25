# Social Media Agent

AI-driven social media content automation system built with LangGraph.

## Features

- **AI Post Generation**: Generate engaging social media posts using LLM with human-in-the-loop review
- **Multi-Platform Publishing**: Publish to Twitter and LinkedIn simultaneously
- **URL Deduplication**: Prevent duplicate posts using LangGraph Store
- **Content Extraction**: Automatically extract page content, relevant links, and images from URLs
- **Flexible Scheduling**: Schedule posts with natural language date parsing (e.g., "tomorrow at 2pm")
- **Content Quality Control**: Automatic post condensation to meet platform requirements
- **Full Observability**: LangSmith integration for tracing and debugging

## Architecture

### Generate Post Graph (Core Pipeline)

The `generate_post` graph is the core pipeline that transforms input links into social media posts:

```
                   START
                     │
                     ▼
              ┌─────────────┐
              │  checkUrls  │ ─────────► END (all duplicates)
              │ (去重检查)   │
              └─────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ verifyLinks │
              │ (内容提取)   │
              └─────────────┘
                     │
                     ▼
              ┌──────────────┐
              │generateReport│
              │ (生成报告)    │
              └──────────────┘
                     │
                     ▼
              ┌─────────────┐
              │ generatePost│
              │ (生成帖子)   │
              └─────────────┘
                     │
          ┌─────────┴─────────┐
          ▼                   ▼
    condensePost ──────► humanReview ◄───────┐
    (压缩帖子)           (人工审核)           │
                              │              │
                    ┌────────┼────────┐     │
                    ▼        ▼        ▼     │
             schedulePost rewritePost update│
             (发布/排期)  (重写帖子)  (更新时间)
                    │        │        │     │
                    ▼        └────────┴─────┘
                   END
```

**Phase 0: URL Deduplication**
- `checkUrls`: Filters out URLs that have already been used for post generation (via LangGraph Store). If all URLs are duplicates, ends the graph early.

**Phase 1: Content Extraction & Generation**
- `verifyLinks`: Invokes verify-links sub-graph to extract page contents, relevant links, and images
- `generateReport`: Analyzes content and generates a marketing report as context
- `generatePost`: Creates engaging social media post based on the report
- `condensePost`: Shortens posts if needed (max 3 attempts)

**Phase 2: Human Review (Interrupt)**
- `humanReview`: Human-in-the-loop interrupt for post review
- `rewritePost`: Rewrites post based on user feedback
- `updateScheduleDate`: Parses and validates new schedule date
- `schedulePost`: Publishes to Twitter/LinkedIn or schedules for later

### Graph Components

| Graph | Description |
|-------|-------------|
| `generate_post` | Core pipeline: URL deduplication → content extraction → post generation → human review → publishing |
| `verify_links` | Sub-graph: Extracts page contents, relevant links, and images from URLs (invoked by verifyLinks node) |
| `upload_post` | Sub-graph: Validates and publishes posts to Twitter/LinkedIn with authentication handling |

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/maisieyang/social-media-agent-from-scratch.git
cd social-media-agent-from-scratch

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your credentials:

```bash
# Required: LLM Configuration
DASHSCOPE_API_KEY=your_api_key
DEFAULT_LLM_MODEL=qwen3-max

# Optional: LangSmith Observability
LANGSMITH_API_KEY=your_langsmith_key
LANGSMITH_TRACING=true

# Social Media Platforms (at least one)
TWITTER_APP_KEY=...
TWITTER_APP_SECRET=...
TWITTER_ACCESS_TOKEN=...
TWITTER_ACCESS_SECRET=...

# Or LinkedIn
LINKEDIN_ACCESS_TOKEN=...
LINKEDIN_PERSON_URN=...
```

### Running

```bash
# Start LangGraph development server
npm run langgraph:dev

# Or run locally without server
npm run run:local -- --graph generate_post --links "https://github.com/user/repo"
```

## Usage

### LangGraph Studio

Start the development server and open [LangGraph Studio](https://github.com/langchain-ai/langgraph-studio):

```bash
npm run langgraph:dev
```

### Command Line

```bash
# Generate post from URL
npm run run:generate -- --links "https://github.com/example/repo"

# Run with dry-run mode (no actual posting)
npm run run:local -- --graph generate_post --links "https://..." --dry-run
```

### Cron Jobs

```bash
# Run via LangGraph API (requires running langgraph:dev first)
npm run cron -- --links "https://github.com/user/repo"

# Crontab example: Run daily at 8 AM
0 8 * * * cd /path/to/project && npm run cron -- --links "https://example.com"
```

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test -- src/tests/unit/date-parser.test.ts

# Watch mode
npm test -- --watch
```

### Test Structure

```
src/tests/
├── setup.ts                    # Test configuration
├── unit/
│   ├── date-parser.test.ts     # Date parsing tests (29)
│   └── url-utils.test.ts       # URL utility tests (40)
├── integration/
│   ├── nodes.test.ts           # Node tests (13)
│   └── graph.test.ts           # Graph tests (12)
└── evaluation/
    └── content-quality.test.ts # Quality metrics (21)
```

## Deployment

### Docker

```bash
# Build and run
docker-compose up langgraph-api

# Development mode
docker-compose --profile dev up langgraph-dev

# With full stack (Redis + PostgreSQL)
docker-compose --profile full up
```

### LangGraph Cloud

1. Push to GitHub
2. Connect repository in [LangGraph Cloud](https://cloud.langchain.com)
3. Deploy with `langgraph.json` configuration

## Project Structure

```
.
├── src/
│   ├── agents/
│   │   ├── generate-post/     # Core: Post generation graph
│   │   │   ├── graph.ts       # Graph definition
│   │   │   ├── state.ts       # State annotations
│   │   │   ├── constants.ts   # Status constants
│   │   │   ├── nodes/         # Graph nodes
│   │   │   │   ├── check-urls.ts        # URL deduplication
│   │   │   │   ├── verify-links.ts      # Content extraction
│   │   │   │   ├── generate-report.ts   # Report generation
│   │   │   │   ├── generate-post.ts     # Post generation
│   │   │   │   ├── condense-post.ts     # Post condensation
│   │   │   │   ├── human-node.ts        # Human review interrupt
│   │   │   │   ├── rewrite-post.ts      # Post rewriting
│   │   │   │   ├── schedule-post.ts     # Publishing/scheduling
│   │   │   │   └── routing.ts           # Conditional routing
│   │   │   └── prompts/       # LLM prompts
│   │   ├── verify-links/      # Sub-graph: URL verification & content extraction
│   │   ├── upload-post/       # Sub-graph: Post validation & publishing
│   │   └── shared/            # Shared utilities
│   ├── clients/               # Platform clients
│   │   ├── twitter/
│   │   └── linkedin/
│   ├── utils/                 # Utilities
│   └── tests/                 # Test suites
├── scripts/
│   ├── cron-runner.ts         # Scheduled task runner
│   └── run-local.ts           # Local execution
├── langgraph.json             # LangGraph configuration
├── Dockerfile                 # Container definition
└── docker-compose.yml         # Service orchestration
```

## Human-in-the-Loop Review

The `generate_post` graph supports human review before publishing:

### humanReview 输入可选项

**简化字符串输入：**
- `accept` / `approve` / `ok` / `yes`：接受当前内容并继续发布流程
- `ignore` / `discard` / `skip` / `no`：放弃该帖子并结束
- 任意其他字符串：作为反馈进入重写流程

**JSON 格式输入：**
- `{"type":"accept"}`：接受当前内容并继续发布流程
- `{"type":"ignore"}`：放弃该帖子并结束
- `{"type":"edit","args":{"feedback":"把语气更正式，压缩到 240 字"}}`：进入重写流程，`feedback` 作为改写指令
- `{"type":"respond","args":{"scheduleDate":"tomorrow 9am"}}`：进入排期更新流程（也支持 `date` 字段）
- `{"type":"respond","args":{"post":"改成这段文案..."}}`：进入重写流程，使用你给的文案作为输入（也支持 `content` / `text` 字段）

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHSCOPE_API_KEY` | Yes | LLM API key |
| `DEFAULT_LLM_MODEL` | No | Model name (default: qwen3-max) |
| `LANGSMITH_API_KEY` | No | LangSmith tracing |
| `TWITTER_*` | No | Twitter OAuth credentials |
| `LINKEDIN_*` | No | LinkedIn OAuth credentials |
| `FIRECRAWL_API_KEY` | No | Web scraping service |
| `GITHUB_TOKEN` | No | GitHub API access |

## License

MIT
