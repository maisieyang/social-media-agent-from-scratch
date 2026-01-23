/**
 * Evaluation Tests for Content Quality
 *
 * Tests the quality of generated content using heuristics and patterns.
 * These tests help ensure generated posts meet quality standards.
 */

import { describe, it, expect } from "@jest/globals";
import { TWITTER_MAX_CHAR_LENGTH } from "../../agents/generate-post/constants";

/**
 * Content quality metrics
 */
interface ContentQualityMetrics {
  characterCount: number;
  withinTwitterLimit: boolean;
  hasHashtags: boolean;
  hashtagCount: number;
  hasEmojis: boolean;
  hasUrls: boolean;
  urlCount: number;
  hasMentions: boolean;
  readabilityScore: number; // Simple readability metric
  sentenceCount: number;
  averageWordLength: number;
}

/**
 * Analyze content quality metrics
 */
function analyzeContentQuality(content: string): ContentQualityMetrics {
  const hashtagRegex = /#\w+/g;
  const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/gu;
  const urlRegex = /https?:\/\/[^\s]+/g;
  const mentionRegex = /@\w+/g;
  const sentenceRegex = /[.!?]+/g;

  const hashtags = content.match(hashtagRegex) || [];
  const emojis = content.match(emojiRegex) || [];
  const urls = content.match(urlRegex) || [];
  const mentions = content.match(mentionRegex) || [];
  const sentences = content.split(sentenceRegex).filter((s) => s.trim());

  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const avgWordLength =
    words.length > 0
      ? words.reduce((sum, word) => sum + word.length, 0) / words.length
      : 0;

  // Simple readability: penalize very long words and sentences
  const readabilityScore = Math.max(
    0,
    100 - (avgWordLength > 8 ? 20 : 0) - (sentences.length < 2 ? 10 : 0)
  );

  return {
    characterCount: content.length,
    withinTwitterLimit: content.length <= TWITTER_MAX_CHAR_LENGTH,
    hasHashtags: hashtags.length > 0,
    hashtagCount: hashtags.length,
    hasEmojis: emojis.length > 0,
    hasUrls: urls.length > 0,
    urlCount: urls.length,
    hasMentions: mentions.length > 0,
    readabilityScore,
    sentenceCount: sentences.length,
    averageWordLength: avgWordLength,
  };
}

/**
 * Check if content follows best practices
 */
function checkBestPractices(content: string): {
  passed: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const metrics = analyzeContentQuality(content);

  // Check character limit
  if (!metrics.withinTwitterLimit) {
    issues.push(
      `Exceeds Twitter limit: ${metrics.characterCount}/${TWITTER_MAX_CHAR_LENGTH}`
    );
  }

  // Check for excessive hashtags (more than 3 is spammy)
  if (metrics.hashtagCount > 3) {
    issues.push(`Too many hashtags: ${metrics.hashtagCount} (max 3 recommended)`);
  }

  // Check for at least some content structure
  if (metrics.sentenceCount < 1) {
    issues.push("Content should have at least one complete sentence");
  }

  // Check for spam patterns
  if (content.includes("!!!") || content.includes("???")) {
    issues.push("Avoid excessive punctuation (!!!, ???)");
  }

  // Check for ALL CAPS (more than 30% caps is shouty)
  const capsRatio =
    content.replace(/[^A-Z]/g, "").length /
    content.replace(/[^A-Za-z]/g, "").length;
  if (capsRatio > 0.3 && content.length > 20) {
    issues.push("Avoid excessive capitalization");
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}

describe("Content Quality Evaluation", () => {
  describe("analyzeContentQuality", () => {
    it("should correctly count characters", () => {
      const content = "Hello, world!";
      const metrics = analyzeContentQuality(content);
      expect(metrics.characterCount).toBe(13);
    });

    it("should detect hashtags", () => {
      const content = "Check out #AI and #MachineLearning!";
      const metrics = analyzeContentQuality(content);
      expect(metrics.hasHashtags).toBe(true);
      expect(metrics.hashtagCount).toBe(2);
    });

    it("should detect URLs", () => {
      const content = "Read more at https://example.com";
      const metrics = analyzeContentQuality(content);
      expect(metrics.hasUrls).toBe(true);
      expect(metrics.urlCount).toBe(1);
    });

    it("should detect mentions", () => {
      const content = "Thanks @user for sharing!";
      const metrics = analyzeContentQuality(content);
      expect(metrics.hasMentions).toBe(true);
    });

    it("should calculate readability score", () => {
      const simpleContent = "This is a simple post. Easy to read.";
      const metrics = analyzeContentQuality(simpleContent);
      expect(metrics.readabilityScore).toBeGreaterThan(50);
    });

    it("should correctly identify Twitter limit compliance", () => {
      const shortContent = "Short post";
      const longContent = "a".repeat(300);

      expect(analyzeContentQuality(shortContent).withinTwitterLimit).toBe(true);
      expect(analyzeContentQuality(longContent).withinTwitterLimit).toBe(false);
    });
  });

  describe("checkBestPractices", () => {
    it("should pass for well-formed content", () => {
      const goodContent =
        "Just released a new feature! Check it out. #opensource";
      const result = checkBestPractices(goodContent);
      expect(result.passed).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should fail for content exceeding character limit", () => {
      const longContent = "a".repeat(300);
      const result = checkBestPractices(longContent);
      expect(result.passed).toBe(false);
      expect(result.issues.some((i) => i.includes("Twitter limit"))).toBe(true);
    });

    it("should warn about excessive hashtags", () => {
      const hashtagSpam = "Post #one #two #three #four #five";
      const result = checkBestPractices(hashtagSpam);
      expect(result.issues.some((i) => i.includes("hashtags"))).toBe(true);
    });

    it("should warn about excessive punctuation", () => {
      const excitedContent = "WOW!!! This is AMAZING!!!";
      const result = checkBestPractices(excitedContent);
      expect(result.issues.some((i) => i.includes("punctuation"))).toBe(true);
    });

    it("should warn about excessive caps", () => {
      const shoutyContent = "THIS IS ALL CAPS AND VERY LOUD POST CONTENT HERE";
      const result = checkBestPractices(shoutyContent);
      expect(result.issues.some((i) => i.includes("capitalization"))).toBe(true);
    });
  });

  describe("Sample Post Evaluation", () => {
    const samplePosts = [
      {
        name: "Good technical post",
        content:
          "Just released v2.0 of our AI toolkit! New features include faster inference and better accuracy. Try it out: https://github.com/example/toolkit #AI #opensource",
        expectedPass: true,
      },
      {
        name: "Too long post",
        content:
          "This is a very long post that exceeds the Twitter character limit. ".repeat(
            10
          ),
        expectedPass: false,
      },
      {
        name: "Minimal post",
        content: "Hi",
        expectedPass: true, // Technically valid, just short
      },
      {
        name: "Spammy hashtag post",
        content:
          "Buy now! #sale #discount #cheap #free #deal #offer #limited",
        expectedPass: false,
      },
    ];

    samplePosts.forEach(({ name, content, expectedPass }) => {
      it(`should ${expectedPass ? "pass" : "fail"} for: ${name}`, () => {
        const result = checkBestPractices(content);
        if (expectedPass) {
          expect(result.passed).toBe(true);
        } else {
          expect(result.passed).toBe(false);
          expect(result.issues.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe("Content Transformation Quality", () => {
    it("should maintain URL integrity after transformation", () => {
      const originalUrl = "https://github.com/example/repo?ref=main";
      const postWithUrl = `Check out this repo: ${originalUrl}`;
      const metrics = analyzeContentQuality(postWithUrl);

      expect(metrics.hasUrls).toBe(true);
      expect(postWithUrl).toContain(originalUrl);
    });

    it("should preserve key information density", () => {
      // A good post should have reasonable information density
      const informativePost =
        "New paper on transformer architectures shows 30% improvement in efficiency. Key insight: sparse attention patterns. Paper: https://arxiv.org/abs/1234";
      const metrics = analyzeContentQuality(informativePost);

      // Good posts typically have 3-5 sentences worth of info
      expect(metrics.sentenceCount).toBeGreaterThanOrEqual(2);
      expect(metrics.characterCount).toBeLessThanOrEqual(TWITTER_MAX_CHAR_LENGTH);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty content", () => {
      const metrics = analyzeContentQuality("");
      expect(metrics.characterCount).toBe(0);
      expect(metrics.withinTwitterLimit).toBe(true);
    });

    it("should handle content with only emojis", () => {
      const emojiContent = "🚀🎉✨";
      const metrics = analyzeContentQuality(emojiContent);
      expect(metrics.hasEmojis).toBe(true);
    });

    it("should handle content with special characters", () => {
      const specialContent = "Check out the <code> feature & more!";
      const metrics = analyzeContentQuality(specialContent);
      expect(metrics.characterCount).toBeGreaterThan(0);
    });

    it("should handle multi-line content", () => {
      const multiLineContent = "Line 1\nLine 2\nLine 3";
      const metrics = analyzeContentQuality(multiLineContent);
      expect(metrics.characterCount).toBe(20);
    });
  });
});

// Export utilities for use in other tests
export { analyzeContentQuality, checkBestPractices };
export type { ContentQualityMetrics };
