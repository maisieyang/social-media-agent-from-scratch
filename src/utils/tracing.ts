import { traceable } from "langsmith/traceable";

/**
 * LangSmith Tracing Utilities
 *
 * Provides wrappers for tracing custom functions in LangSmith.
 *
 * Required env variables:
 * - LANGSMITH_API_KEY: Your LangSmith API key
 * - LANGSMITH_TRACING=true: Enable tracing
 * - LANGCHAIN_TRACING_V2=true: Enable v2 tracing
 * - LANGCHAIN_PROJECT: Project name in LangSmith (defaults to "default")
 *
 * Usage:
 * ```typescript
 * const tracedFunction = traceFunction(myFunction, "my-operation", "chain");
 * ```
 */

/**
 * Check if LangSmith tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return (
    process.env.LANGSMITH_TRACING === "true" ||
    process.env.LANGCHAIN_TRACING_V2 === "true"
  );
}

/**
 * Get the current LangSmith project name
 */
export function getProjectName(): string {
  return process.env.LANGCHAIN_PROJECT || "social-media-agent-from-scratch";
}

/**
 * Run type for traceable functions
 */
export type RunType = "llm" | "chain" | "tool" | "retriever" | "embedding" | "prompt";

/**
 * Wrap a function with LangSmith tracing
 *
 * @param fn - The function to wrap
 * @param name - Name for the trace (shown in LangSmith UI)
 * @param runType - Type of run (llm, chain, tool, retriever, embedding, prompt)
 * @param metadata - Optional metadata to attach to traces
 * @returns Traced function
 */
export function traceFunction<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string,
  runType: RunType = "chain",
  metadata?: Record<string, unknown>
): T {
  return traceable(fn, {
    name,
    run_type: runType,
    metadata,
  }) as T;
}

/**
 * Create a traced wrapper for async functions
 *
 * @param name - Name for the trace
 * @param runType - Type of run
 * @param metadata - Optional metadata
 * @returns A function that wraps the provided async function with tracing
 */
export function createTraceWrapper(
  name: string,
  runType: RunType = "chain",
  metadata?: Record<string, unknown>
) {
  return <T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T => {
    return traceable(fn, {
      name,
      run_type: runType,
      metadata,
    }) as T;
  };
}

/**
 * Decorator-style traceable for methods
 *
 * Usage:
 * ```typescript
 * const traced = traceMethod("processData", "tool");
 * class MyClass {
 *   processData = traced(async (data: string) => {
 *     return data.toUpperCase();
 *   });
 * }
 * ```
 */
export function traceMethod(
  name: string,
  runType: RunType = "chain",
  metadata?: Record<string, unknown>
) {
  return <T extends (...args: unknown[]) => unknown>(fn: T): T => {
    return traceable(fn, {
      name,
      run_type: runType,
      metadata,
    }) as T;
  };
}

/**
 * Log tracing status on startup
 */
export function logTracingStatus(): void {
  if (isTracingEnabled()) {
    console.log("=".repeat(50));
    console.log("LANGSMITH TRACING ENABLED");
    console.log("=".repeat(50));
    console.log(`Project: ${getProjectName()}`);
    console.log(`API Key: ${process.env.LANGSMITH_API_KEY ? "****" + process.env.LANGSMITH_API_KEY.slice(-4) : "NOT SET"}`);
    console.log("=".repeat(50));
  } else {
    console.log("LangSmith tracing is disabled. Set LANGSMITH_TRACING=true to enable.");
  }
}

// Re-export traceable for direct use
export { traceable };
