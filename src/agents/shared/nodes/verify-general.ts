import { z } from "zod";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { getPrompts } from "../../generate-post/prompts/index.js";
import { VerifyContentAnnotation } from "../shared-state.js";
import { getPageText } from "../../utils.js";
import { scrapeWithFirecrawl } from "../../../utils/firecrawl.js";
import { verifyContentIsRelevant } from "./verify-content.js";
import { VerifyLinksResultAnnotation } from "../../generate-post/state.js";
import { SKIP_CONTENT_RELEVANCY_CHECK } from "../../generate-post/constants.js";

const RELEVANCY_SCHEMA = z
  .object({
    reasoning: z
      .string()
      .describe(
        "Reasoning for why the webpage is or isn't relevant to your company's products."
      ),
    relevant: z
      .boolean()
      .describe(
        "Whether or not the webpage is relevant to your company's products."
      ),
  })
  .describe("The relevancy of the content to your company's products.");

const VERIFY_COMPANY_RELEVANT_CONTENT_PROMPT = `You are a highly regarded marketing employee.
You're provided with a webpage containing content a third party submitted to you claiming it's relevant to your business context.
Your task is to carefully read over the entire page, and determine whether or not the content is actually relevant to your context.

${getPrompts().businessContext}

${getPrompts().contentValidationPrompt}

Given this context, examine the webpage content closely, and determine if the content is relevant to your context.
You should provide reasoning as to why or why not the content is relevant to your context, then a simple true or false for whether or not it is relevant.`;

type UrlContents = {
  content: string;
  imageUrls?: string[];
};

/**
 * Gets the contents of a URL using FireCrawl (if available) or basic HTML fetch.
 */
async function getUrlContents(url: string): Promise<UrlContents> {
  // Try FireCrawl first if configured
  const firecrawlResult = await scrapeWithFirecrawl(url);
  if (firecrawlResult && firecrawlResult.content) {
    return firecrawlResult;
  }

  // Fall back to basic HTML fetch
  const text = await getPageText(url);
  if (text) {
    return { content: text };
  }

  throw new Error(`Failed to fetch content from ${url}.`);
}

/**
 * Checks if content relevancy check should be skipped.
 */
function skipContentRelevancyCheck(
  configurable?: Record<string, unknown>
): boolean {
  const skipRelevancyCheck = configurable?.[SKIP_CONTENT_RELEVANCY_CHECK];
  return !!(
    skipRelevancyCheck ?? process.env.SKIP_CONTENT_RELEVANCY_CHECK === "true"
  );
}

type VerifyGeneralContentReturn = Partial<
  typeof VerifyLinksResultAnnotation.State
>;

/**
 * Verifies if the general content from a provided URL is relevant.
 *
 * @param state - The current state containing the link to verify
 * @param config - Configuration for the LangGraph runtime
 * @returns Object containing relevant links and page contents if relevant
 */
export async function verifyGeneralContent(
  state: typeof VerifyContentAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<VerifyGeneralContentReturn> {
  console.log("Verifying general content for:", state.link);

  try {
    const urlContents = await getUrlContents(state.link);

    const returnValue: VerifyGeneralContentReturn = {
      relevantLinks: [state.link],
      pageContents: [urlContents.content],
      ...(urlContents.imageUrls?.length
        ? { imageOptions: urlContents.imageUrls }
        : {}),
    };

    // Skip relevancy check if configured
    if (skipContentRelevancyCheck(config.configurable)) {
      console.log("Skipping content relevancy check for:", state.link);
      return returnValue;
    }

    // Verify content is relevant
    const isRelevant = await verifyContentIsRelevant(urlContents.content, {
      systemPrompt: VERIFY_COMPANY_RELEVANT_CONTENT_PROMPT,
      schema: RELEVANCY_SCHEMA,
    });

    if (isRelevant) {
      console.log("Content is relevant:", state.link);
      return returnValue;
    }

    // Not relevant, return empty arrays
    console.log("Content is not relevant:", state.link);
    return {
      relevantLinks: [],
      pageContents: [],
    };
  } catch (error) {
    console.error("Error verifying general content:", error);
    return {
      relevantLinks: [],
      pageContents: [],
    };
  }
}
