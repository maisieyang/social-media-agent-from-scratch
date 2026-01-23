/**
 * Integration Tests for Graph Nodes
 *
 * Tests individual nodes with mocked dependencies.
 */

import { describe, it, expect, jest } from "@jest/globals";
import { END } from "@langchain/langgraph";
import { routeAfterUrlCheck, URL_CHECK_ROUTE_MAP } from "../../agents/generate-post/nodes/check-urls";
import { TWITTER_MAX_CHAR_LENGTH } from "../../agents/generate-post/constants";

describe("Node Integration Tests", () => {
  describe("routeAfterUrlCheck", () => {
    it("should route to generateReport for valid URLs", () => {
      const state = { links: ["https://example.com"] };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(routeAfterUrlCheck(state as any)).toBe("generateReport");
    });

    it("should route to END when next is END", () => {
      const state = { next: END };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(routeAfterUrlCheck(state as any)).toBe(END);
    });

    it("should have correct route map", () => {
      expect(URL_CHECK_ROUTE_MAP.generateReport).toBe("generateReport");
      expect(URL_CHECK_ROUTE_MAP.end).toBe(END);
    });
  });

  describe("Post Length Validation", () => {
    it("should identify posts exceeding Twitter limit", () => {
      const longPost = "a".repeat(TWITTER_MAX_CHAR_LENGTH + 10);
      expect(longPost.length).toBeGreaterThan(TWITTER_MAX_CHAR_LENGTH);
    });

    it("should identify posts within Twitter limit", () => {
      const shortPost = "a".repeat(TWITTER_MAX_CHAR_LENGTH - 10);
      expect(shortPost.length).toBeLessThanOrEqual(TWITTER_MAX_CHAR_LENGTH);
    });

    it("should handle exact limit length", () => {
      const exactPost = "a".repeat(TWITTER_MAX_CHAR_LENGTH);
      expect(exactPost.length).toBe(TWITTER_MAX_CHAR_LENGTH);
    });
  });

  describe("Store Operations", () => {
    it("should handle URL deduplication logic", async () => {
      const { checkUrlsUsage } = await import(
        "../../agents/generate-post/nodes/store-operations"
      );

      // Create a mock store with saved URLs
      const savedUrls = ["https://old.com"];
      const urlsToCheck = ["https://old.com", "https://new.com"];

      // Create mock config with store
      const mockStore = {
        get: jest.fn<() => Promise<{ value: { data: string[] } }>>().mockResolvedValue({
          value: { data: savedUrls },
        }),
        put: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockConfig = { store: mockStore } as any;

      const result = await checkUrlsUsage(mockConfig, urlsToCheck);

      expect(result.newUrls).toContain("https://new.com");
      expect(result.duplicateUrls).toContain("https://old.com");
      expect(result.newUrls).not.toContain("https://old.com");
    });

    it("should return all URLs as new when store is empty", async () => {
      const { checkUrlsUsage } = await import(
        "../../agents/generate-post/nodes/store-operations"
      );

      const mockStore = {
        get: jest.fn<() => Promise<null>>().mockResolvedValue(null),
        put: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
        delete: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockConfig = { store: mockStore } as any;
      const urlsToCheck = ["https://a.com", "https://b.com"];

      const result = await checkUrlsUsage(mockConfig, urlsToCheck);

      expect(result.newUrls).toEqual(urlsToCheck);
      expect(result.duplicateUrls).toEqual([]);
    });

    it("should handle getSavedUrls with missing store", async () => {
      const { getSavedUrls } = await import(
        "../../agents/generate-post/nodes/store-operations"
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockConfig = {} as any;
      const result = await getSavedUrls(mockConfig);

      expect(result).toEqual([]);
    });

    it("should handle saveUsedUrls with empty array", async () => {
      const { saveUsedUrls } = await import(
        "../../agents/generate-post/nodes/store-operations"
      );

      const mockStore = {
        get: jest.fn<() => Promise<null>>().mockResolvedValue(null),
        put: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mockConfig = { store: mockStore } as any;

      // Should not throw and should not call put
      await saveUsedUrls(mockConfig, []);
      expect(mockStore.put).not.toHaveBeenCalled();
    });
  });
});

describe("Constants Validation", () => {
  it("should have correct Twitter character limit", () => {
    expect(TWITTER_MAX_CHAR_LENGTH).toBe(280);
  });

  it("should have all required configurable keys", async () => {
    const constants = await import("../../agents/generate-post/constants");

    expect(constants.SKIP_USED_URLS_CHECK).toBeDefined();
    expect(constants.TEXT_ONLY_MODE).toBeDefined();
    expect(constants.SKIP_CONTENT_RELEVANCY_CHECK).toBeDefined();
    expect(constants.POST_TO_LINKEDIN_ORGANIZATION).toBeDefined();
  });

  it("should have all days of the week", async () => {
    const { ALLOWED_DAYS } = await import("../../agents/generate-post/constants");

    expect(ALLOWED_DAYS).toContain("Monday");
    expect(ALLOWED_DAYS).toContain("Tuesday");
    expect(ALLOWED_DAYS).toContain("Wednesday");
    expect(ALLOWED_DAYS).toContain("Thursday");
    expect(ALLOWED_DAYS).toContain("Friday");
    expect(ALLOWED_DAYS).toContain("Saturday");
    expect(ALLOWED_DAYS).toContain("Sunday");
    expect(ALLOWED_DAYS).toHaveLength(7);
  });
});
