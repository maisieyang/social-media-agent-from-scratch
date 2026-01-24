import { RunnableConfig } from "@langchain/core/runnables";
import { END } from "@langchain/langgraph";
import {
  GeneratePostState,
  GeneratePostUpdate,
  GeneratePostConfigurable,
} from "../state.js";
import { GENERATE_POST_STATUS, SKIP_USED_URLS_CHECK } from "../constants.js";
import { checkUrlsUsage } from "./store-operations.js";

/**
 * Check URLs Node
 *
 * Filters out URLs that have already been used for post generation.
 * This prevents duplicate posts for the same content.
 *
 * Behavior:
 * - If SKIP_USED_URLS_CHECK is true, passes all URLs through
 * - Otherwise, checks each URL against the store
 * - If all URLs are duplicates, ends the graph
 * - If some URLs are new, continues with only the new URLs
 */
export async function checkUrls(
  state: GeneratePostState,
  config?: RunnableConfig<GeneratePostConfigurable>
): Promise<GeneratePostUpdate> {
  const { links } = state;

  console.log("=" .repeat(50));
  console.log("CHECKING URL DEDUPLICATION");
  console.log("=".repeat(50));

  // Check if URL check should be skipped
  const skipCheck = config?.configurable?.[SKIP_USED_URLS_CHECK] ?? false;

  if (skipCheck) {
    console.log("URL deduplication check skipped (SKIP_USED_URLS_CHECK=true)");
    return {
      status: GENERATE_POST_STATUS.URL_CHECK_SKIPPED,
    };
  }

  if (!links || links.length === 0) {
    console.log("No URLs provided - skipping deduplication check");
    return {
      status: GENERATE_POST_STATUS.URL_CHECK_SKIPPED_NO_LINKS,
    };
  }

  console.log(`Checking ${links.length} URLs for duplicates...`);
  for (const link of links) {
    console.log(`  - ${link}`);
  }

  // Check URLs against store
  const { newUrls, duplicateUrls } = await checkUrlsUsage(
    config as RunnableConfig,
    links
  );

  if (duplicateUrls.length > 0) {
    console.log(`\nFound ${duplicateUrls.length} duplicate URLs:`);
    for (const url of duplicateUrls) {
      console.log(`  [DUPLICATE] ${url}`);
    }
  }

  if (newUrls.length > 0) {
    console.log(`\nFound ${newUrls.length} new URLs:`);
    for (const url of newUrls) {
      console.log(`  [NEW] ${url}`);
    }
  }

  // If all URLs are duplicates, end the graph
  if (newUrls.length === 0) {
    console.log("\n" + "=".repeat(50));
    console.log("ALL URLs ARE DUPLICATES - SKIPPING POST GENERATION");
    console.log("=".repeat(50));

    return {
      next: END,
      userResponse: "All provided URLs have already been used for post generation",
      status: GENERATE_POST_STATUS.URL_CHECK_ALL_DUPLICATES,
    };
  }

  // If some URLs are new, continue with only new URLs
  if (newUrls.length < links.length) {
    console.log(`\nContinuing with ${newUrls.length} new URLs (${duplicateUrls.length} duplicates filtered out)`);
  } else {
    console.log(`\nAll ${newUrls.length} URLs are new - proceeding with post generation`);
  }

  return {
    links: newUrls,
    condenseCount: 0,
    status:
      newUrls.length < links.length
        ? GENERATE_POST_STATUS.URL_CHECK_FILTERED
        : GENERATE_POST_STATUS.URL_CHECK_ALL_NEW,
  };
}

/**
 * Route after URL check
 *
 * Returns the next node based on whether URLs are valid:
 * - If next is END (all duplicates), end the graph
 * - Otherwise, continue to generateReport
 */
export function routeAfterUrlCheck(
  state: GeneratePostUpdate
): "verifyLinks" | typeof END {
  if (state.next === END) {
    return END;
  }
  return "verifyLinks";
}

/** Route map for URL check conditional edge */
export const URL_CHECK_ROUTE_MAP = {
  verifyLinks: "verifyLinks",
  end: END,
} as const;
