# Social Media Agent

AI-driven social media content automation system built with LangGraph.

## Features

- **Content Curation**: Automatically collect and filter content from multiple sources (GitHub, Twitter, Reddit, Slack)
- **AI Post Generation**: Generate engaging social media posts using LLM with human-in-the-loop review
- **Multi-Platform Publishing**: Publish to Twitter and LinkedIn simultaneously
- **URL Deduplication**: Prevent duplicate posts using LangGraph Store
- **Flexible Scheduling**: Schedule posts with natural language date parsing (e.g., "tomorrow at 2pm")
- **Content Quality Control**: Automatic post condensation to meet platform character limits
- **Full Observability**: LangSmith integration for tracing and debugging

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Supervisor Graph                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │ Curate Data │───▶│Verify Links │───▶│   Generate Post     │  │
│  │   Graph     │    │   Graph     │    │      Graph          │  │
│  └─────────────┘    └─────────────┘    └─────────────────────┘  │
│                                                │                 │
│                                         ┌──────┴──────┐         │
│                                         ▼             ▼         │
│                                    [Human Review] [Schedule]    │
│                                         │             │         │
│                                         └──────┬──────┘         │
│                                                ▼                │
│                                         [Publish Post]          │
└─────────────────────────────────────────────────────────────────┘
```

### Graph Components

| Graph | Description |
|-------|-------------|
| `supervisor` | Orchestrates the full workflow |
| `curate_data` | Collects content from configured sources |
| `verify_links` | Validates URLs and extracts content |
| `generate_post` | Creates posts with human-in-the-loop review |
| `upload_post` | Handles multi-platform publishing |
| `find_images` | Extracts and processes images from content |

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

# Run supervisor workflow
npm run run:local -- --graph supervisor
```

### Cron Jobs

```bash
# Run via LangGraph API
npm run cron -- --graph supervisor

# Crontab example: Run daily at 8 AM
0 8 * * * cd /path/to/project && npm run cron
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
│   │   ├── generate-post/     # Post generation graph
│   │   │   ├── graph.ts       # Graph definition
│   │   │   ├── state.ts       # State annotations
│   │   │   ├── nodes/         # Graph nodes
│   │   │   └── prompts/       # LLM prompts
│   │   ├── curate-data/       # Content curation
│   │   ├── verify-links/      # URL verification
│   │   ├── upload-post/       # Publishing
│   │   ├── find-images/       # Image extraction
│   │   ├── supervisor/        # Workflow orchestration
│   │   └── shared/            # Shared utilities
│   ├── clients/               # Platform clients
│   │   ├── twitter/
│   │   ├── linkedin/
│   │   ├── reddit/
│   │   └── slack/
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

在 `humanReview` 中，你可以用 JSON 形式回复。下面是可选输入及含义：

- `{"type":"accept"}`：接受当前内容并继续发布流程
- `{"type":"ignore"}`：放弃该帖子并结束
- `{"type":"edit","args":{"feedback":"把语气更正式，压缩到 240 字"}}`：进入重写流程，`feedback` 作为改写指令
- `{"type":"respond","args":{"scheduleDate":"tomorrow 9am"}}`：进入排期更新流程
- `{"type":"respond","args":{"post":"改成这段文案..."}}`：进入重写流程，使用你给的文案作为输入

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
