#!/usr/bin/env npx ts-node

/**
 * Cron Runner Script for Social Media Agent
 *
 * This script is designed to be run by a cron job or scheduler.
 * It triggers the supervisor graph to curate content and generate posts.
 *
 * Usage:
 *   npx ts-node scripts/cron-runner.ts [--dry-run] [--graph <graph-name>]
 *
 * Options:
 *   --dry-run       Run without posting to social media
 *   --graph <name>  Specify which graph to run (default: supervisor)
 *
 * Cron Examples:
 *   # Run every day at 8 AM
 *   0 8 * * * cd /path/to/project && npx ts-node scripts/cron-runner.ts
 *
 *   # Run every Monday, Wednesday, Friday at 9 AM
 *   0 9 * * 1,3,5 cd /path/to/project && npx ts-node scripts/cron-runner.ts
 *
 * Environment Variables:
 *   - LANGSMITH_TRACING=true (recommended for observability)
 *   - LANGCHAIN_PROJECT=social-media-agent-from-scratch
 */

import { Client } from "@langchain/langgraph-sdk";
import { logTracingStatus } from "../src/utils/tracing.js";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const graphIndex = args.indexOf("--graph");
const graphName = graphIndex !== -1 ? args[graphIndex + 1] : "supervisor";

// Configuration
const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || "http://localhost:2024";

interface CronRunResult {
  success: boolean;
  threadId?: string;
  runId?: string;
  error?: string;
  duration?: number;
}

/**
 * Run the specified graph
 */
async function runGraph(
  client: Client,
  assistantId: string,
  input: Record<string, unknown>
): Promise<CronRunResult> {
  const startTime = Date.now();

  try {
    // Create a new thread
    const thread = await client.threads.create();
    console.log(`Created thread: ${thread.thread_id}`);

    // Start the run
    const run = await client.runs.create(thread.thread_id, assistantId, {
      input,
      config: {
        configurable: {
          skipUsedUrlsCheck: false,
          textOnlyMode: isDryRun,
        },
      },
    });

    console.log(`Started run: ${run.run_id}`);

    // Wait for completion
    let finalRun = run;
    while (finalRun.status === "pending" || finalRun.status === "running") {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      finalRun = await client.runs.get(thread.thread_id, run.run_id);
      console.log(`Run status: ${finalRun.status}`);
    }

    const duration = Date.now() - startTime;

    if (finalRun.status === "success") {
      return {
        success: true,
        threadId: thread.thread_id,
        runId: run.run_id,
        duration,
      };
    } else {
      return {
        success: false,
        threadId: thread.thread_id,
        runId: run.run_id,
        error: `Run ended with status: ${finalRun.status}`,
        duration,
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      duration,
    };
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("SOCIAL MEDIA AGENT - CRON RUNNER");
  console.log("=".repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Graph: ${graphName}`);
  console.log(`Dry Run: ${isDryRun}`);
  console.log(`API URL: ${LANGGRAPH_API_URL}`);
  console.log("=".repeat(60));

  // Log tracing status
  logTracingStatus();

  // Initialize client
  const client = new Client({
    apiUrl: LANGGRAPH_API_URL,
  });

  // Define input based on graph type
  let input: Record<string, unknown> = {};

  switch (graphName) {
    case "supervisor":
      // Supervisor graph orchestrates the full workflow
      input = {
        // The supervisor will curate data and generate posts
      };
      break;

    case "curate_data":
      // Curate data graph collects content from sources
      input = {
        sources: ["twitter", "github"],
      };
      break;

    case "generate_post":
      // Generate post requires links input
      console.error("Error: generate_post graph requires --links argument");
      process.exit(1);
      break;

    default:
      console.error(`Error: Unknown graph "${graphName}"`);
      console.error("Available graphs: supervisor, curate_data, generate_post");
      process.exit(1);
  }

  // Run the graph
  console.log("\nStarting graph execution...\n");
  const result = await runGraph(client, graphName, input);

  // Report results
  console.log("\n" + "=".repeat(60));
  console.log("EXECUTION RESULT");
  console.log("=".repeat(60));

  if (result.success) {
    console.log("Status: SUCCESS ✓");
    console.log(`Thread ID: ${result.threadId}`);
    console.log(`Run ID: ${result.runId}`);
    console.log(`Duration: ${(result.duration! / 1000).toFixed(2)}s`);
  } else {
    console.log("Status: FAILED ✗");
    console.log(`Error: ${result.error}`);
    if (result.threadId) console.log(`Thread ID: ${result.threadId}`);
    if (result.runId) console.log(`Run ID: ${result.runId}`);
    if (result.duration) console.log(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
  }

  console.log("=".repeat(60));

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}

// Run main
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
