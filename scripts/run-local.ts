#!/usr/bin/env npx ts-node

/**
 * Local Runner Script for Social Media Agent
 *
 * Runs the graph directly without requiring LangGraph API server.
 * Useful for local testing and development.
 *
 * Usage:
 *   npx ts-node scripts/run-local.ts --graph generate_post --links "https://example.com"
 *   npx ts-node scripts/run-local.ts --graph supervisor
 *
 * Options:
 *   --graph <name>   Graph to run (generate_post, supervisor, etc.)
 *   --links <urls>   Comma-separated URLs (for generate_post)
 *   --dry-run        Skip actual posting
 */

import { MemorySaver, InMemoryStore } from "@langchain/langgraph";
import { logTracingStatus } from "../src/utils/tracing.js";

// Parse arguments
const args = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  return index !== -1 ? args[index + 1] : undefined;
}

const graphName = getArg("graph") || "generate_post";
const linksArg = getArg("links");
const isDryRun = args.includes("--dry-run");

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("SOCIAL MEDIA AGENT - LOCAL RUNNER");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Graph: ${graphName}`);
  console.log(`Dry Run: ${isDryRun}`);
  console.log("=".repeat(60));

  // Log tracing status
  logTracingStatus();

  // Initialize memory and store
  const checkpointer = new MemorySaver();
  const store = new InMemoryStore();

  // Dynamic import based on graph name
  let graph;
  let input: Record<string, unknown> = {};

  switch (graphName) {
    case "generate_post": {
      const { generatePostGraph } = await import(
        "../src/agents/generate-post/graph.js"
      );
      graph = generatePostGraph;

      if (!linksArg) {
        console.error("Error: --links argument required for generate_post");
        console.error('Example: --links "https://github.com/user/repo"');
        process.exit(1);
      }

      input = {
        links: linksArg.split(",").map((l) => l.trim()),
      };
      break;
    }

    case "supervisor": {
      const { supervisorGraph } = await import(
        "../src/agents/supervisor/graph.js"
      );
      graph = supervisorGraph;
      input = {};
      break;
    }

    case "verify_links": {
      const { verifyLinksGraph } = await import(
        "../src/agents/verify-links/graph.js"
      );
      graph = verifyLinksGraph;

      if (!linksArg) {
        console.error("Error: --links argument required for verify_links");
        process.exit(1);
      }

      input = {
        links: linksArg.split(",").map((l) => l.trim()),
      };
      break;
    }

    default:
      console.error(`Unknown graph: ${graphName}`);
      console.error(
        "Available: generate_post, supervisor, verify_links"
      );
      process.exit(1);
  }

  // Compile with checkpointer and store
  const compiledGraph = graph.compile
    ? graph
    : graph;

  // Create thread ID
  const threadId = `local-${Date.now()}`;

  console.log(`\nThread ID: ${threadId}`);
  console.log(`Input: ${JSON.stringify(input, null, 2)}`);
  console.log("\nStarting execution...\n");

  const startTime = Date.now();

  try {
    // Stream the graph execution
    const stream = await compiledGraph.stream(input, {
      configurable: {
        thread_id: threadId,
        skipUsedUrlsCheck: isDryRun,
        textOnlyMode: isDryRun,
      },
      checkpointer,
      store,
    });

    // Process stream events
    for await (const event of stream) {
      const nodeName = Object.keys(event)[0];
      console.log(`[${nodeName}] Completed`);

      // Log key outputs
      const nodeOutput = event[nodeName];
      if (nodeOutput?.post) {
        console.log("\n--- Generated Post ---");
        console.log(nodeOutput.post);
        console.log("---\n");
      }
    }

    const duration = Date.now() - startTime;

    console.log("\n" + "=".repeat(60));
    console.log("EXECUTION COMPLETED");
    console.log("=".repeat(60));
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log("=".repeat(60));
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error("\n" + "=".repeat(60));
    console.error("EXECUTION FAILED");
    console.error("=".repeat(60));
    console.error(`Error: ${error instanceof Error ? error.message : error}`);
    console.error(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.error("=".repeat(60));

    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
