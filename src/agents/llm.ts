import { ChatOpenAI } from "@langchain/openai";

/**
 * LLM factory for Social Media Agent.
 *
 * Routes chat completions through DashScope's OpenAI-compatible endpoint
 * using Qwen as the default model.
 *
 * Required env:
 * - DASHSCOPE_API_KEY
 *
 * Optional env:
 * - DASHSCOPE_BASE_URL (defaults to DashScope compatible-mode)
 * - DEFAULT_LLM_MODEL (defaults to "qwen3-max")
 */

const DEFAULT_DASHSCOPE_BASE_URL =
  process.env.DASHSCOPE_BASE_URL ??
  "https://dashscope.aliyuncs.com/compatible-mode/v1";

const DEFAULT_LLM_MODEL = process.env.DEFAULT_LLM_MODEL ?? "qwen3-max";

function requireDashScopeApiKey(): string {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) {
    throw new Error(
      "Missing DASHSCOPE_API_KEY. Set it in your environment (.env) to use Qwen via DashScope compatible-mode."
    );
  }
  return key;
}

export interface LLMOverrides {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  streaming?: boolean;
  [key: string]: unknown;
}

/**
 * Create a ChatOpenAI model configured for DashScope (Qwen).
 *
 * @param overrides - Optional ChatOpenAI constructor fields (temperature, streaming, etc.)
 * @returns Configured ChatOpenAI instance
 */
export function getDefaultChatModel(overrides: LLMOverrides = {}): ChatOpenAI {
  return new ChatOpenAI({
    ...overrides,
    model: overrides.model ?? DEFAULT_LLM_MODEL,
    apiKey: requireDashScopeApiKey(),
    configuration: {
      baseURL: DEFAULT_DASHSCOPE_BASE_URL,
    },
  });
}

/**
 * Create a ChatOpenAI model with lower temperature for more deterministic outputs.
 */
export function getDeterministicModel(overrides: LLMOverrides = {}): ChatOpenAI {
  return getDefaultChatModel({
    temperature: 0,
    ...overrides,
  });
}

/**
 * Create a ChatOpenAI model with higher temperature for creative outputs.
 */
export function getCreativeModel(overrides: LLMOverrides = {}): ChatOpenAI {
  return getDefaultChatModel({
    temperature: 0.7,
    ...overrides,
  });
}
