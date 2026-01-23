import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import { formatDateType } from "./date-parser.js";
import { requireAuth } from "./auth-interrupt.js";
import { saveUsedUrls } from "./store-operations.js";
import {
  createTwitterClient,
  createLinkedInClient,
  SocialPostResult,
} from "../../../clients/index.js";
import { POST_TO_LINKEDIN_ORGANIZATION } from "../constants.js";
import { RunnableConfig } from "@langchain/core/runnables";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { GeneratePostConfigurable } from "../state.js";

/**
 * Publishing result
 */
export interface PublishResult {
  published: boolean;
  results: SocialPostResult[];
  error?: string;
}

/**
 * Schedule Post Node
 *
 * Handles the actual posting to social media platforms.
 * Can post immediately or schedule for later (scheduling requires external scheduler).
 */
export async function schedulePost(
  state: GeneratePostState,
  config?: RunnableConfig<GeneratePostConfigurable>
): Promise<GeneratePostUpdate> {
  const { post, scheduleDate, image, relevantLinks, links } = state;

  const linksToUse =
    relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  // Get configuration
  const postToOrganization = config?.configurable?.[POST_TO_LINKEDIN_ORGANIZATION] ?? false;

  console.log("=".repeat(50));
  console.log("SCHEDULING POST");
  console.log("=".repeat(50));
  console.log("\nPost content:");
  console.log("-".repeat(40));
  console.log(post);
  console.log("-".repeat(40));
  console.log(`\nCharacter count: ${post?.length || 0}`);
  console.log(`Source link: ${primaryLink}`);
  console.log(`Image: ${image ? image.imageUrl : "None"}`);
  console.log(
    `Scheduled for: ${scheduleDate ? formatDateType(scheduleDate) : "Immediate"}`
  );
  console.log(`Post to LinkedIn Org: ${postToOrganization}`);

  // Determine which platforms to post to
  // For now, default to Twitter. In a real implementation,
  // this would be configurable.
  const platforms: ("twitter" | "linkedin")[] = ["twitter"];

  // Check authentication
  const authResult = await requireAuth(platforms);

  if (!authResult.authorized) {
    console.warn("Authentication not completed");
    return {
      next: undefined,
      userResponse: "Authentication required but not completed",
    };
  }

  // Check if this is a scheduled post or immediate
  const isImmediate =
    !scheduleDate ||
    (typeof scheduleDate !== "string" && scheduleDate <= new Date());

  if (isImmediate) {
    // Post immediately
    console.log("\nPosting immediately...");
    const publishResult = await publishPost(
      post || "",
      platforms,
      image,
      postToOrganization
    );

    if (publishResult.published) {
      console.log("\n" + "=".repeat(50));
      console.log("POST PUBLISHED SUCCESSFULLY!");
      console.log("=".repeat(50));

      for (const result of publishResult.results) {
        if (result.success) {
          console.log(`\n${result.platform.toUpperCase()}:`);
          console.log(`  Post ID: ${result.postId}`);
          console.log(`  URL: ${result.postUrl}`);
        } else {
          console.log(`\n${result.platform.toUpperCase()}: FAILED`);
          console.log(`  Error: ${result.error}`);
        }
      }

      // Save used URLs to prevent duplicate posts
      if (linksToUse && linksToUse.length > 0) {
        await saveUsedUrls(config as LangGraphRunnableConfig, linksToUse);
        console.log(`\nSaved ${linksToUse.length} URLs to prevent future duplicates`);
      }

      return {
        next: undefined,
        userResponse: undefined,
      };
    } else {
      console.error("Failed to publish post:", publishResult.error);
      return {
        userResponse: `Failed to publish: ${publishResult.error}`,
      };
    }
  } else {
    // Schedule for later
    console.log("\nScheduling for later...");
    console.log(`Scheduled time: ${formatDateType(scheduleDate)}`);

    // In a real implementation, this would:
    // 1. Store the post in a database with the scheduled time
    // 2. A separate scheduler service would pick it up and post at the right time

    console.log("\n" + "=".repeat(50));
    console.log("POST SCHEDULED SUCCESSFULLY!");
    console.log("=".repeat(50));
    console.log(`\nThe post will be published on: ${formatDateType(scheduleDate)}`);
    console.log("(Note: External scheduler required for actual scheduled posting)");

    // Save used URLs to prevent duplicate posts
    if (linksToUse && linksToUse.length > 0) {
      await saveUsedUrls(config as LangGraphRunnableConfig, linksToUse);
      console.log(`\nSaved ${linksToUse.length} URLs to prevent future duplicates`);
    }

    return {
      next: undefined,
      userResponse: undefined,
    };
  }
}

/**
 * Publish post to social media platforms
 */
async function publishPost(
  text: string,
  platforms: ("twitter" | "linkedin")[],
  image?: { imageUrl: string; mimeType: string },
  postToLinkedInOrganization?: boolean
): Promise<PublishResult> {
  const results: SocialPostResult[] = [];
  let hasSuccess = false;

  for (const platform of platforms) {
    try {
      if (platform === "twitter") {
        const client = createTwitterClient();
        if (client) {
          const result = await client.postTweet(text, image);
          results.push({ platform: "twitter", ...result });
          if (result.success) hasSuccess = true;
        } else {
          results.push({
            platform: "twitter",
            success: false,
            error: "Client not available",
          });
        }
      } else if (platform === "linkedin") {
        const client = createLinkedInClient(postToLinkedInOrganization);
        if (client) {
          const result = await client.postToLinkedIn(text, image);
          results.push({ platform: "linkedin", ...result });
          if (result.success) hasSuccess = true;
        } else {
          results.push({
            platform: "linkedin",
            success: false,
            error: "Client not available",
          });
        }
      }
    } catch (error) {
      results.push({
        platform,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    published: hasSuccess,
    results,
    error: hasSuccess ? undefined : "All platforms failed",
  };
}
