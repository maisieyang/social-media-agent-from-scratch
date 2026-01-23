/**
 * Unit Tests for URL Utilities
 *
 * Tests URL type detection, extraction, and validation utilities.
 */

import { describe, it, expect } from "@jest/globals";
import {
  getUrlType,
  extractUrls,
  extractUrlsFromSlackText,
  extractTweetId,
  isValidUrl,
  hasFileExtension,
  removeUrls,
  filterUnwantedImageUrls,
  getMimeTypeFromUrl,
  removeQueryParams,
  filterLinksForPostContent,
} from "../../agents/utils";

describe("URL Utilities", () => {
  describe("getUrlType", () => {
    it("should detect GitHub URLs", () => {
      expect(getUrlType("https://github.com/user/repo")).toBe("github");
      expect(getUrlType("https://github.com/user/repo/issues/123")).toBe("github");
      expect(getUrlType("github.com/user/repo")).toBe("github");
    });

    it("should not detect github.io as GitHub", () => {
      expect(getUrlType("https://user.github.io/project")).toBe("general");
    });

    it("should detect YouTube URLs", () => {
      expect(getUrlType("https://www.youtube.com/watch?v=abc123")).toBe("youtube");
      expect(getUrlType("https://youtu.be/abc123")).toBe("youtube");
    });

    it("should detect Twitter/X URLs", () => {
      expect(getUrlType("https://twitter.com/user/status/123")).toBe("twitter");
      expect(getUrlType("https://x.com/user/status/123")).toBe("twitter");
    });

    it("should detect Reddit URLs", () => {
      expect(getUrlType("https://www.reddit.com/r/programming")).toBe("reddit");
      expect(getUrlType("https://np.reddit.com/r/test")).toBe("reddit");
      expect(getUrlType("https://redd.it/abc123")).toBe("reddit");
    });

    it("should detect Luma URLs", () => {
      expect(getUrlType("https://lu.ma/event123")).toBe("luma");
    });

    it('should return "general" for other URLs', () => {
      expect(getUrlType("https://example.com")).toBe("general");
      expect(getUrlType("https://blog.example.org/post")).toBe("general");
    });

    it("should handle invalid URLs gracefully", () => {
      // Empty string returns undefined due to URL parse failure
      expect(getUrlType("")).toBeUndefined();
      // Invalid but parseable strings default to "general" after https:// prefix
      expect(getUrlType("not-a-url")).toBe("general");
    });
  });

  describe("extractUrls", () => {
    it("should extract plain URLs", () => {
      const text = "Check out https://example.com and https://test.org";
      const urls = extractUrls(text);
      expect(urls).toContain("https://example.com");
      expect(urls).toContain("https://test.org");
    });

    it("should extract markdown link URLs", () => {
      const text = "Check out [Example](https://example.com) for more info";
      const urls = extractUrls(text);
      expect(urls).toContain("https://example.com");
    });

    it("should handle mixed formats", () => {
      const text = "Visit [Site](https://site.com) or https://other.com";
      const urls = extractUrls(text);
      expect(urls).toHaveLength(2);
      expect(urls).toContain("https://site.com");
      expect(urls).toContain("https://other.com");
    });

    it("should deduplicate URLs", () => {
      const text = "https://example.com and [link](https://example.com)";
      const urls = extractUrls(text);
      expect(urls).toHaveLength(1);
    });

    it("should return empty array for text without URLs", () => {
      expect(extractUrls("No URLs here")).toEqual([]);
    });
  });

  describe("extractUrlsFromSlackText", () => {
    it("should extract URLs from Slack format with display text", () => {
      const text = "Check <example|https://example.com> out";
      const urls = extractUrlsFromSlackText(text);
      expect(urls).toContain("https://example.com");
    });

    it("should extract URLs from Slack format without display text", () => {
      const text = "Check <https://example.com> out";
      const urls = extractUrlsFromSlackText(text);
      expect(urls).toContain("https://example.com");
    });

    it("should extract multiple Slack URLs", () => {
      const text = "<a|https://a.com> and <b|https://b.com>";
      const urls = extractUrlsFromSlackText(text);
      expect(urls).toHaveLength(2);
    });
  });

  describe("extractTweetId", () => {
    it("should extract tweet ID from Twitter URL", () => {
      expect(extractTweetId("https://twitter.com/user/status/1234567890")).toBe(
        "1234567890"
      );
    });

    it("should extract tweet ID from X.com URL", () => {
      expect(extractTweetId("https://x.com/user/status/1234567890")).toBe(
        "1234567890"
      );
    });

    it("should handle URL object", () => {
      const url = new URL("https://twitter.com/user/status/9876543210");
      expect(extractTweetId(url)).toBe("9876543210");
    });

    it("should return undefined for non-tweet URLs", () => {
      expect(extractTweetId("https://twitter.com/user")).toBeUndefined();
      expect(extractTweetId("https://example.com")).toBeUndefined();
    });
  });

  describe("isValidUrl", () => {
    it("should return true for valid URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("http://localhost:3000")).toBe(true);
      expect(isValidUrl("https://example.com/path?query=value")).toBe(true);
    });

    it("should return false for invalid URLs", () => {
      expect(isValidUrl("not-a-url")).toBe(false);
      expect(isValidUrl("example.com")).toBe(false);
      expect(isValidUrl("")).toBe(false);
      expect(isValidUrl(null as unknown as string)).toBe(false);
    });
  });

  describe("hasFileExtension", () => {
    it("should return true for strings with extensions", () => {
      expect(hasFileExtension("file.txt")).toBe(true);
      expect(hasFileExtension("image.png")).toBe(true);
      expect(hasFileExtension("archive.tar.gz")).toBe(true);
    });

    it("should return false for strings without extensions", () => {
      expect(hasFileExtension("filename")).toBe(false);
      expect(hasFileExtension("")).toBe(false);
    });
  });

  describe("removeUrls", () => {
    it("should remove URLs from text", () => {
      const text = "Check out https://example.com for more info";
      const result = removeUrls(text);
      expect(result).toBe("Check out for more info");
    });

    it("should handle multiple URLs", () => {
      const text = "Visit https://a.com and https://b.com";
      const result = removeUrls(text);
      expect(result).toBe("Visit and");
    });

    it("should normalize whitespace", () => {
      const text = "Before   https://example.com   After";
      const result = removeUrls(text);
      expect(result).toBe("Before After");
    });
  });

  describe("filterUnwantedImageUrls", () => {
    it("should filter out SVG images", () => {
      const urls = [
        "https://example.com/image.png",
        "https://example.com/icon.svg",
      ];
      const filtered = filterUnwantedImageUrls(urls);
      expect(filtered).not.toContain("https://example.com/icon.svg");
      expect(filtered).toContain("https://example.com/image.png");
    });

    it("should filter out shields.io URLs", () => {
      const urls = [
        "https://example.com/image.png",
        "https://img.shields.io/badge/test",
      ];
      const filtered = filterUnwantedImageUrls(urls);
      expect(filtered).not.toContain("https://img.shields.io/badge/test");
    });

    it("should filter out invalid URLs", () => {
      const urls = ["https://example.com/image.png", "not-a-url"];
      const filtered = filterUnwantedImageUrls(urls);
      expect(filtered).toHaveLength(1);
    });
  });

  describe("getMimeTypeFromUrl", () => {
    it("should detect JPEG images", () => {
      expect(getMimeTypeFromUrl("https://example.com/image.jpg")).toBe(
        "image/jpeg"
      );
      expect(getMimeTypeFromUrl("https://example.com/image.jpeg")).toBe(
        "image/jpeg"
      );
    });

    it("should detect PNG images", () => {
      expect(getMimeTypeFromUrl("https://example.com/image.png")).toBe(
        "image/png"
      );
    });

    it("should detect GIF images", () => {
      expect(getMimeTypeFromUrl("https://example.com/image.gif")).toBe(
        "image/gif"
      );
    });

    it("should handle URLs with query parameters", () => {
      expect(getMimeTypeFromUrl("https://example.com/image.png?v=1")).toBe(
        "image/png"
      );
    });

    it("should return undefined for unknown extensions", () => {
      expect(getMimeTypeFromUrl("https://example.com/file.xyz")).toBeUndefined();
      expect(getMimeTypeFromUrl("https://example.com/noextension")).toBeUndefined();
    });
  });

  describe("removeQueryParams", () => {
    it("should remove query parameters", () => {
      expect(removeQueryParams("https://example.com/path?foo=bar")).toBe(
        "https://example.com/path"
      );
    });

    it("should handle URLs without query parameters", () => {
      expect(removeQueryParams("https://example.com/path")).toBe(
        "https://example.com/path"
      );
    });

    it("should handle invalid URLs gracefully", () => {
      expect(removeQueryParams("not-a-url")).toBe("not-a-url");
    });
  });

  describe("filterLinksForPostContent", () => {
    it("should filter out Twitter and Reddit links", () => {
      const links = [
        "https://twitter.com/user/status/123",
        "https://github.com/user/repo",
        "https://reddit.com/r/test",
        "https://example.com",
      ];
      const result = filterLinksForPostContent(links);
      expect(result).not.toContain("twitter.com");
      expect(result).not.toContain("reddit.com");
      expect(result).toContain("github.com");
      expect(result).toContain("example.com");
    });

    it("should join links with double newlines", () => {
      const links = ["https://a.com", "https://b.com"];
      const result = filterLinksForPostContent(links);
      expect(result).toBe("https://a.com\n\nhttps://b.com");
    });
  });
});
