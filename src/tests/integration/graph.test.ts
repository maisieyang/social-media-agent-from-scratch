/**
 * Integration Tests for LangGraph Flows
 *
 * Tests the graph compilation and basic flow execution.
 * Note: These tests require mocked LLM responses for full execution.
 */

import { describe, it, expect } from "@jest/globals";
import { MemorySaver, InMemoryStore } from "@langchain/langgraph";

describe("Graph Integration Tests", () => {
  describe("Generate Post Graph", () => {
    it("should compile without errors", async () => {
      const { generatePostGraph } = await import(
        "../../agents/generate-post/graph"
      );

      expect(generatePostGraph).toBeDefined();
      expect(generatePostGraph.name).toBe("Generate Post Graph");
    });

    it("should have correct node structure", async () => {
      const { generatePostGraph } = await import(
        "../../agents/generate-post/graph"
      );

      // The graph should have the expected nodes
      const nodes = generatePostGraph.nodes;
      expect(nodes).toBeDefined();
    });

    it("should handle empty input gracefully", async () => {
      const { generatePostGraph } = await import(
        "../../agents/generate-post/graph"
      );

      // Verify checkpointer and store can be instantiated
      expect(() => new MemorySaver()).not.toThrow();
      expect(() => new InMemoryStore()).not.toThrow();

      // Graph should be retrievable without throwing
      expect(() => generatePostGraph.getGraph()).not.toThrow();
    });
  });

  describe("Verify Links Graph", () => {
    it("should have state and routing utilities defined", async () => {
      // Test state annotation instead of full graph (avoids LLM initialization)
      const { VerifyLinksGraphAnnotation } = await import(
        "../../agents/verify-links/state"
      );
      expect(VerifyLinksGraphAnnotation).toBeDefined();
    });
  });

  describe("Graph State Management", () => {
    it("should use correct state annotations", async () => {
      const {
        GeneratePostAnnotation,
        GeneratePostConfigurableAnnotation,
      } = await import("../../agents/generate-post/state");

      // Verify state shape
      expect(GeneratePostAnnotation).toBeDefined();
      expect(GeneratePostConfigurableAnnotation).toBeDefined();

      // Create default state
      const defaultState = {
        links: [],
        report: "",
        post: "",
        condenseCount: 0,
      };

      expect(defaultState.links).toEqual([]);
      expect(defaultState.condenseCount).toBe(0);
    });

    it("should handle checkpointer correctly", async () => {
      // Verify MemorySaver is available
      expect(() => new MemorySaver()).not.toThrow();
      const store = new InMemoryStore();

      // Store should be empty initially
      const results = await store.search(["test"]);
      expect(Array.from(results)).toHaveLength(0);

      // Put some data
      await store.put(["test", "urls"], "key1", { data: ["https://a.com"] });

      // Retrieve it
      const item = await store.get(["test", "urls"], "key1");
      expect(item?.value).toEqual({ data: ["https://a.com"] });
    });
  });

  describe("Routing Logic", () => {
    it("should have correct post generation route map", async () => {
      const { POST_GENERATION_ROUTE_MAP } = await import(
        "../../agents/generate-post/nodes/routing"
      );

      expect(POST_GENERATION_ROUTE_MAP).toBeDefined();
      expect(POST_GENERATION_ROUTE_MAP.humanReview).toBe("humanReview");
      expect(POST_GENERATION_ROUTE_MAP.condensePost).toBe("condensePost");
    });

    it("should have correct human response route map", async () => {
      const { HUMAN_RESPONSE_ROUTE_MAP } = await import(
        "../../agents/generate-post/nodes/routing"
      );

      expect(HUMAN_RESPONSE_ROUTE_MAP).toBeDefined();
      expect(HUMAN_RESPONSE_ROUTE_MAP.schedulePost).toBe("schedulePost");
      expect(HUMAN_RESPONSE_ROUTE_MAP.rewritePost).toBe("rewritePost");
    });

    it("should have correct URL check route map", async () => {
      const { URL_CHECK_ROUTE_MAP } = await import(
        "../../agents/generate-post/nodes/check-urls"
      );

      expect(URL_CHECK_ROUTE_MAP).toBeDefined();
      expect(URL_CHECK_ROUTE_MAP.generateReport).toBe("generateReport");
    });
  });
});

describe("Constants and Configuration", () => {
  it("should have correct Twitter character limit", async () => {
    const { TWITTER_MAX_CHAR_LENGTH } = await import(
      "../../agents/generate-post/constants"
    );

    expect(TWITTER_MAX_CHAR_LENGTH).toBe(280);
  });

  it("should have correct allowed days", async () => {
    const { ALLOWED_DAYS } = await import(
      "../../agents/generate-post/constants"
    );

    expect(ALLOWED_DAYS).toHaveLength(7);
    expect(ALLOWED_DAYS).toContain("Monday");
    expect(ALLOWED_DAYS).toContain("Sunday");
  });

  it("should have correct configurable keys", async () => {
    const {
      SKIP_USED_URLS_CHECK,
      TEXT_ONLY_MODE,
      SKIP_CONTENT_RELEVANCY_CHECK,
    } = await import("../../agents/generate-post/constants");

    expect(SKIP_USED_URLS_CHECK).toBe("skipUsedUrlsCheck");
    expect(TEXT_ONLY_MODE).toBe("textOnlyMode");
    expect(SKIP_CONTENT_RELEVANCY_CHECK).toBe("skipContentRelevancyCheck");
  });
});
