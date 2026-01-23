/**
 * Social Media Clients
 *
 * Unified exports for all social media platform clients.
 */

// Twitter
export {
  TwitterClient,
  createTwitterClient,
  type TwitterAuthMode,
  type TwitterOAuthConfig,
  type TwitterArcadeConfig,
  type TwitterClientConfig,
  type TweetResult,
} from "./twitter/index.js";

// LinkedIn
export {
  LinkedInClient,
  createLinkedInClient,
  type LinkedInAuthMode,
  type LinkedInOAuthConfig,
  type LinkedInArcadeConfig,
  type LinkedInClientConfig,
  type LinkedInPostResult,
} from "./linkedin/index.js";

// Import for internal use
import { createTwitterClient as getTwitterClient } from "./twitter/index.js";
import { createLinkedInClient as getLinkedInClient } from "./linkedin/index.js";

/**
 * Social media post result (unified type)
 */
export interface SocialPostResult {
  platform: "twitter" | "linkedin";
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

/**
 * Post to multiple platforms
 */
export async function postToSocialMedia(
  text: string,
  platforms: ("twitter" | "linkedin")[],
  options?: {
    image?: { imageUrl: string; mimeType: string };
    postToLinkedInOrganization?: boolean;
  }
): Promise<SocialPostResult[]> {
  const results: SocialPostResult[] = [];

  for (const platform of platforms) {
    if (platform === "twitter") {
      const twitterClient = getTwitterClient();
      if (twitterClient) {
        const result = await twitterClient.postTweet(text, options?.image);
        results.push({
          platform: "twitter",
          ...result,
        });
      } else {
        results.push({
          platform: "twitter",
          success: false,
          error: "Twitter client not available",
        });
      }
    } else if (platform === "linkedin") {
      const linkedInClient = getLinkedInClient(
        options?.postToLinkedInOrganization
      );
      if (linkedInClient) {
        const result = await linkedInClient.postToLinkedIn(text, options?.image);
        results.push({
          platform: "linkedin",
          ...result,
        });
      } else {
        results.push({
          platform: "linkedin",
          success: false,
          error: "LinkedIn client not available",
        });
      }
    }
  }

  return results;
}
