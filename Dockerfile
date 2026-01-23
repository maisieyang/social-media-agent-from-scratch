# Dockerfile for Social Media Agent
# Includes Playwright dependencies for screenshot capabilities

# ============================================
# Stage 1: Base image with Playwright
# ============================================
FROM mcr.microsoft.com/playwright:v1.48.0-noble AS base

# Set working directory
WORKDIR /app

# Install Node.js 20 (Playwright image comes with Node.js)
# The playwright image already has Node.js installed

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS deps

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production

# ============================================
# Stage 3: Builder
# ============================================
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# ============================================
# Stage 4: Production
# ============================================
FROM base AS production

WORKDIR /app

# Set environment
ENV NODE_ENV=production

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/langgraph.json ./

# Copy scripts for cron jobs
COPY --from=builder /app/scripts ./scripts

# Install Playwright browsers (if not already installed in base)
RUN npx playwright install chromium

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser appuser
RUN chown -R appuser:appuser /app
USER appuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command (for LangGraph API server)
CMD ["npx", "@langchain/langgraph-cli", "up", "--host", "0.0.0.0", "--port", "8000"]

# Expose port
EXPOSE 8000
