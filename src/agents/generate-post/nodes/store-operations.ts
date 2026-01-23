import { LangGraphRunnableConfig } from "@langchain/langgraph";

/**
 * Store Operations for URL Deduplication
 *
 * Uses LangGraph Store to persist used URLs across sessions.
 * This prevents duplicate post generation for the same URLs.
 *
 * Key Pattern:
 * - Namespace: ["saved_data", "used_urls"]
 * - Key: "urls"
 * - Value: { data: string[] }
 */

/** Namespace for storing used URLs */
const USED_URLS_NAMESPACE = ["saved_data", "used_urls"];

/** Key for the URLs array */
const URLS_KEY = "urls";

/**
 * Store item type for used URLs
 */
interface UsedUrlsData {
  data: string[];
}

/**
 * Get saved URLs from the store
 *
 * @param config - LangGraph runnable config containing the store
 * @returns Array of previously used URLs, or empty array if none found
 */
export async function getSavedUrls(
  config: LangGraphRunnableConfig
): Promise<string[]> {
  const store = config?.store;

  if (!store) {
    console.warn("Store not available - cannot retrieve saved URLs");
    return [];
  }

  try {
    const item = await store.get(USED_URLS_NAMESPACE, URLS_KEY);

    if (item?.value) {
      const data = item.value as UsedUrlsData;
      return data.data || [];
    }

    return [];
  } catch (error) {
    console.error("Error retrieving saved URLs from store:", error);
    return [];
  }
}

/**
 * Save used URLs to the store
 *
 * @param config - LangGraph runnable config containing the store
 * @param urls - Array of URLs to save (will be merged with existing)
 */
export async function saveUsedUrls(
  config: LangGraphRunnableConfig,
  urls: string[]
): Promise<void> {
  const store = config?.store;

  if (!store) {
    console.warn("Store not available - cannot save URLs");
    return;
  }

  if (!urls || urls.length === 0) {
    console.log("No URLs to save");
    return;
  }

  try {
    // Get existing URLs
    const existingUrls = await getSavedUrls(config);

    // Merge and deduplicate
    const allUrls = [...new Set([...existingUrls, ...urls])];

    // Save to store
    await store.put(USED_URLS_NAMESPACE, URLS_KEY, { data: allUrls });

    console.log(`Saved ${urls.length} new URLs to store (total: ${allUrls.length})`);
  } catch (error) {
    console.error("Error saving URLs to store:", error);
    throw error;
  }
}

/**
 * Check if any URLs have been used before
 *
 * @param config - LangGraph runnable config containing the store
 * @param urls - Array of URLs to check
 * @returns Object with arrays of new and duplicate URLs
 */
export async function checkUrlsUsage(
  config: LangGraphRunnableConfig,
  urls: string[]
): Promise<{
  newUrls: string[];
  duplicateUrls: string[];
}> {
  const savedUrls = await getSavedUrls(config);
  const savedUrlSet = new Set(savedUrls);

  const newUrls: string[] = [];
  const duplicateUrls: string[] = [];

  for (const url of urls) {
    if (savedUrlSet.has(url)) {
      duplicateUrls.push(url);
    } else {
      newUrls.push(url);
    }
  }

  return { newUrls, duplicateUrls };
}

/**
 * Clear all saved URLs from the store
 *
 * @param config - LangGraph runnable config containing the store
 */
export async function clearSavedUrls(
  config: LangGraphRunnableConfig
): Promise<void> {
  const store = config?.store;

  if (!store) {
    console.warn("Store not available - cannot clear URLs");
    return;
  }

  try {
    await store.delete(USED_URLS_NAMESPACE, URLS_KEY);
    console.log("Cleared all saved URLs from store");
  } catch (error) {
    console.error("Error clearing URLs from store:", error);
    throw error;
  }
}
