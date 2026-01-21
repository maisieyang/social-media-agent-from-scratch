import * as cheerio from "cheerio";
import { Image } from "./types.js";

/**
 * Blacklisted MIME types that should not be processed as images
 */
export const BLACKLISTED_MIME_TYPES = [
  "image/svg+xml",
  "image/x-icon",
  "image/bmp",
  "text/",
];

/**
 * Blacklisted URLs that should not be processed
 */
export const BLACKLISTED_GENERAL_URLS = ["vimeo.com"];

/**
 * URL type for content categorization
 */
export type UrlType =
  | "github"
  | "youtube"
  | "general"
  | "twitter"
  | "reddit"
  | "luma"
  | undefined;

/**
 * Determines the type of a URL based on its hostname
 */
export function getUrlType(url: string): UrlType {
  let parsedUrl: URL | undefined;
  try {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    parsedUrl = new URL(formattedUrl);
  } catch {
    console.error("Failed to parse URL:", url);
    return undefined;
  }

  if (
    parsedUrl.hostname.includes("github") &&
    !parsedUrl.hostname.includes("github.io")
  ) {
    return "github";
  }

  if (
    parsedUrl.hostname.includes("youtube") ||
    parsedUrl.hostname.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (
    parsedUrl.hostname.includes("twitter") ||
    parsedUrl.hostname.includes("x.com")
  ) {
    return "twitter";
  }

  if (
    parsedUrl.hostname.includes("reddit") ||
    parsedUrl.hostname.includes("np.reddit") ||
    parsedUrl.hostname.includes("redd.it")
  ) {
    return "reddit";
  }

  if (parsedUrl.host === "lu.ma") {
    return "luma";
  }

  return "general";
}

/**
 * Extracts URLs from Slack-style message text
 * Format: <display_text|https://example.com> or <https://example.com>
 */
export function extractUrlsFromSlackText(text: string): string[] {
  const regex = /<(?:([^|>]*)\|)?([^>]+)>/g;
  const matches = [...text.matchAll(regex)];
  return matches.map((match) => match[2]);
}

/**
 * Checks if a string ends with a file extension
 */
export function hasFileExtension(str: string): boolean {
  return /\.[a-zA-Z0-9]+$/.test(str);
}

/**
 * Extracts the tweet ID from a Twitter URL
 */
export function extractTweetId(url: string | URL): string | undefined {
  const pathname = url instanceof URL ? url.pathname : new URL(url).pathname;
  const tweetId = pathname.match(/\/status\/(\d+)/)?.[1];
  return tweetId;
}

/**
 * Extracts all URLs from a string (supports markdown links and plain URLs)
 */
export function extractUrls(text: string): string[] {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const urls = new Set<string>();

  const processedText = text.replace(markdownLinkRegex, (match, _, url) => {
    urls.add(url);
    return " ".repeat(match.length);
  });

  const plainUrlRegex = /https?:\/\/[^\s<\]]+(?:[^<.,:;"'\]\s)]|(?=\s|$))/g;
  const plainUrls = processedText.match(plainUrlRegex) || [];
  plainUrls.forEach((url) => urls.add(url));

  return Array.from(urls);
}

/**
 * Removes all URLs from a string
 */
export function removeUrls(text: string): string {
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
  return text.replace(urlRegex, "").replace(/\s+/g, " ").trim();
}

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  if (!str || typeof str !== "string") {
    return false;
  }

  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches and extracts the main text content from a webpage
 */
export async function getPageText(url: string): Promise<string | undefined> {
  try {
    new URL(url);

    const timeoutMs = Number(process.env.PAGE_FETCH_TIMEOUT_MS ?? 20_000);
    const retries = Number(process.env.PAGE_FETCH_RETRIES ?? 2);

    let response: Response | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (
            attempt < retries &&
            (response.status === 429 || response.status >= 500)
          ) {
            await sleep(250 * Math.pow(2, attempt));
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        break;
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || msg.toLowerCase().includes("aborted"));
        const isFetchFailed =
          e instanceof Error && msg.toLowerCase().includes("fetch failed");

        if (attempt < retries && (isAbort || isFetchFailed)) {
          await sleep(250 * Math.pow(2, attempt));
          continue;
        }

        throw e;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!response) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to fetch ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script").remove();
    $("style").remove();
    $("head").remove();
    $("nav").remove();
    $("footer").remove();
    $("header").remove();

    const images = $("img")
      .map((_, img) => {
        const alt = $(img).attr("alt") || "";
        const src = $(img).attr("src") || "";
        return `[Image: ${alt}](${src})`;
      })
      .get();

    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();

    return `${text}\n\n${images.join("\n")}`;
  } catch (error) {
    console.error("Error fetching page:", error);
    return undefined;
  }
}

/**
 * Fetches an image from a URL and returns buffer with content type
 */
export async function imageUrlToBuffer(imageUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (!isValidUrl(imageUrl)) {
    throw new Error("Invalid image URL provided");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return {
    buffer: imageBuffer,
    contentType,
  };
}

/**
 * Extracts all image URLs from markdown text
 */
export function extractAllImageUrlsFromMarkdown(text: string): string[] {
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlImgRegex = /<img[^>]+src=["']([^"'>]+)["']/g;
  const urls: string[] = [];

  let match;
  while ((match = markdownImageRegex.exec(text)) !== null) {
    urls.push(match[2]);
  }
  while ((match = htmlImgRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

const BLACKLISTED_IMAGE_URL_ENDINGS = [".svg", ".ico", ".bmp"];
const BLACKLISTED_IMAGE_URLS = ["img.shields.io", "contrib.rocks"];

/**
 * Filters out unwanted image URLs
 */
export function filterUnwantedImageUrls(urls: string[]): string[] {
  return urls.filter(
    (url) =>
      !BLACKLISTED_IMAGE_URL_ENDINGS.some((ending) => url?.endsWith(ending)) &&
      !BLACKLISTED_IMAGE_URLS.some((blacklistedUrl) =>
        url.includes(blacklistedUrl)
      ) &&
      isValidUrl(url)
  );
}

/**
 * Gets MIME type from a URL based on file extension
 */
export function getMimeTypeFromUrl(url: string): string | undefined {
  try {
    const decodedUrl = decodeURIComponent(url);
    const extensionMatch = decodedUrl.match(/\.([^./\\?#]+)(?:[?#].*)?$/i);

    if (!extensionMatch) {
      return undefined;
    }

    const extension = extensionMatch[1].toLowerCase();
    const mimeTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      svg: "image/svg+xml",
      ico: "image/x-icon",
      bmp: "image/bmp",
    };

    return mimeTypeMap[extension];
  } catch {
    return undefined;
  }
}

/**
 * Removes query parameters from a URL
 */
export function removeQueryParams(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Splits an array into smaller chunks
 */
export function chunkArray<T>(arr: T[], size: number): T[][] {
  if (!arr.length) return [];
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculates delay times for processing URLs to prevent rate limiting
 */
export function getAfterSecondsFromLinks(
  links: string[],
  options?: { baseDelaySeconds?: number }
): { link: string; afterSeconds: number }[] {
  const baseDelaySeconds = options?.baseDelaySeconds ?? 30;
  return links.map((link, index) => {
    const isTwitterUrl = getUrlType(link) === "twitter";
    const additionalDelay = isTwitterUrl ? baseDelaySeconds : 0;
    const afterSeconds = index * baseDelaySeconds + additionalDelay;
    return { link, afterSeconds };
  });
}

/**
 * Filters URLs for post content (excludes Twitter and Reddit)
 */
export function filterLinksForPostContent(links: string[]): string {
  const blacklistedTypes = ["twitter", "reddit"];
  const filteredLinks = links.filter(
    (l) => !blacklistedTypes.includes(getUrlType(l) ?? "")
  );
  return filteredLinks.join("\n\n");
}

/**
 * Capitalizes the first letter of a string
 */
export function capitalize(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Processes an image input (URL, base64, or "remove")
 */
export async function processImageInput(
  imageInput: string
): Promise<Image | "remove" | undefined> {
  if (imageInput.toLowerCase() === "remove" || !imageInput) {
    return "remove";
  }

  if (isValidUrl(imageInput)) {
    const { contentType } = await imageUrlToBuffer(imageInput);

    if (BLACKLISTED_MIME_TYPES.some((mt) => contentType.startsWith(mt))) {
      return undefined;
    }

    return {
      imageUrl: imageInput,
      mimeType: contentType,
    };
  }

  return undefined;
}

export interface RetryWithTimeoutOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  timeoutMs?: number;
  name?: string;
}

/**
 * Executes a callback with exponential retry backoff and timeout
 */
export async function retryWithTimeout<T>(
  callback: () => Promise<T>,
  options: RetryWithTimeoutOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 3000,
    timeoutMs = 120_000,
    name = "operation",
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const callbackPromise = callback();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs);
      });

      return await Promise.race([callbackPromise, timeoutPromise]);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn("Retry attempt failed", {
        name,
        attempt: attempt + 1,
        maxRetries,
        error: lastError.message,
      });

      if (attempt < maxRetries - 1) {
        const backoffMs = baseDelayMs * Math.pow(2, attempt);
        console.log("Retrying operation", { name, backoffMs });
        await sleep(backoffMs);
      }
    }
  }

  throw lastError ?? new Error("All retries exhausted");
}
