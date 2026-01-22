import Firecrawl from "@mendable/firecrawl-js";

/**
 * Extracts image URLs from FireCrawl metadata by combining both regular image and OpenGraph image fields.
 */
export function getImagesFromFireCrawlMetadata(
  metadata: Record<string, unknown>
): string[] | undefined {
  const image = (metadata.image as string[]) || [];
  const ogImage = metadata.ogImage ? [metadata.ogImage as string] : [];
  if (image?.length || ogImage?.length) {
    return [...ogImage, ...image];
  }
  return undefined;
}

/**
 * Gets a FireCrawl client instance.
 * Requires FIRECRAWL_API_KEY environment variable.
 */
export function getFirecrawlClient(): Firecrawl | undefined {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    return undefined;
  }
  return new Firecrawl({ apiKey });
}

/**
 * Scrapes content from a URL using FireCrawl.
 */
export async function scrapeWithFirecrawl(
  url: string
): Promise<{ content: string; imageUrls?: string[] } | undefined> {
  const client = getFirecrawlClient();
  if (!client) {
    return undefined;
  }

  try {
    const result = await client.scrape(url, {
      formats: ["markdown"],
    });

    const content = result.markdown || "";
    if (!content) {
      return undefined;
    }

    const imageUrls = result.metadata
      ? getImagesFromFireCrawlMetadata(
          result.metadata as Record<string, unknown>
        )
      : undefined;

    return {
      content,
      imageUrls,
    };
  } catch (error) {
    console.warn("FireCrawl scrape failed", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return undefined;
  }
}
