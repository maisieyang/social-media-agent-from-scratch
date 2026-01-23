import { END, START, StateGraph } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import {
  UploadPostAnnotation,
  UploadPostConfigurableAnnotation,
  UploadPostState,
  UploadPostUpdate,
  UploadPostConfigurable,
  UploadResult,
} from "./state.js";
import {
  createTwitterClient,
  createLinkedInClient,
} from "../../clients/index.js";
import { requireAuth } from "../generate-post/nodes/auth-interrupt.js";

/**
 * Validate Post Node
 *
 * Validates that the post content is valid for the target platforms.
 */
async function validatePost(state: UploadPostState): Promise<UploadPostUpdate> {
  const { content, platforms } = state;

  if (!content || content.trim() === "") {
    return {
      success: false,
      error: "Post content is empty",
    };
  }

  // Check Twitter character limit
  if (platforms.includes("twitter") && content.length > 280) {
    return {
      success: false,
      error: `Post exceeds Twitter's 280 character limit (${content.length} characters)`,
    };
  }

  console.log("Post validation passed");
  console.log(`Content length: ${content.length} characters`);
  console.log(`Target platforms: ${platforms.join(", ")}`);

  return {};
}

/**
 * Check Auth Node
 *
 * Verifies that all required platforms are authenticated.
 */
async function checkAuth(state: UploadPostState): Promise<UploadPostUpdate> {
  const { platforms } = state;

  console.log("Checking authentication for platforms:", platforms);

  const authResult = await requireAuth(platforms);

  if (!authResult.authorized) {
    const failedPlatforms = authResult.statuses
      .filter((s) => !s.authorized)
      .map((s) => s.platform);

    return {
      success: false,
      error: `Authentication failed for: ${failedPlatforms.join(", ")}`,
    };
  }

  console.log("All platforms authenticated");
  return {};
}

/**
 * Upload Post Node
 *
 * Uploads the post to all target platforms.
 */
async function uploadPost(
  state: UploadPostState,
  config?: RunnableConfig<UploadPostConfigurable>
): Promise<UploadPostUpdate> {
  const { content, platforms, image, error: previousError } = state;

  // Skip if there was a previous error
  if (previousError) {
    return {};
  }

  const postToOrganization = config?.configurable?.postToLinkedInOrganization ?? false;
  const results: UploadResult[] = [];
  let hasSuccess = false;

  console.log("Uploading post to platforms:", platforms);

  for (const platform of platforms) {
    try {
      if (platform === "twitter") {
        const client = createTwitterClient();
        if (client) {
          console.log("Posting to Twitter...");
          const result = await client.postTweet(content, image);
          results.push({
            platform: "twitter",
            success: result.success,
            postId: result.tweetId,
            postUrl: result.tweetUrl,
            error: result.error,
          });
          if (result.success) {
            hasSuccess = true;
            console.log(`Twitter post successful: ${result.tweetUrl}`);
          } else {
            console.error(`Twitter post failed: ${result.error}`);
          }
        } else {
          results.push({
            platform: "twitter",
            success: false,
            error: "Twitter client not available",
          });
        }
      } else if (platform === "linkedin") {
        const client = createLinkedInClient(postToOrganization);
        if (client) {
          console.log("Posting to LinkedIn...");
          const result = await client.postToLinkedIn(content, image);
          results.push({
            platform: "linkedin",
            success: result.success,
            postId: result.postId,
            postUrl: result.postUrl,
            error: result.error,
          });
          if (result.success) {
            hasSuccess = true;
            console.log(`LinkedIn post successful: ${result.postUrl}`);
          } else {
            console.error(`LinkedIn post failed: ${result.error}`);
          }
        } else {
          results.push({
            platform: "linkedin",
            success: false,
            error: "LinkedIn client not available",
          });
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`Error posting to ${platform}:`, errorMsg);
      results.push({
        platform,
        success: false,
        error: errorMsg,
      });
    }
  }

  return {
    results,
    success: hasSuccess,
    error: hasSuccess ? undefined : "All platforms failed",
  };
}

/**
 * Finalize Node
 *
 * Logs the final results.
 */
async function finalize(state: UploadPostState): Promise<UploadPostUpdate> {
  const { success, results, error } = state;

  console.log("\n" + "=".repeat(50));
  if (success) {
    console.log("UPLOAD COMPLETED SUCCESSFULLY");
  } else {
    console.log("UPLOAD FAILED");
  }
  console.log("=".repeat(50));

  if (error) {
    console.log(`\nError: ${error}`);
  }

  for (const result of results) {
    console.log(`\n${result.platform.toUpperCase()}:`);
    console.log(`  Success: ${result.success}`);
    if (result.success) {
      console.log(`  Post ID: ${result.postId}`);
      console.log(`  URL: ${result.postUrl}`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log("=".repeat(50));

  return {};
}

/**
 * Route based on validation result
 */
function routeAfterValidation(
  state: UploadPostState
): "checkAuth" | "finalize" {
  if (state.error) {
    return "finalize";
  }
  return "checkAuth";
}

/**
 * Route based on auth check result
 */
function routeAfterAuth(state: UploadPostState): "uploadPost" | "finalize" {
  if (state.error) {
    return "finalize";
  }
  return "uploadPost";
}

/**
 * Upload Post Graph Builder
 *
 * Simple graph for directly uploading content to social media:
 * START -> validatePost -> checkAuth -> uploadPost -> finalize -> END
 */
const uploadPostBuilder = new StateGraph(
  UploadPostAnnotation,
  UploadPostConfigurableAnnotation
)
  .addNode("validatePost", validatePost)
  .addNode("checkAuth", checkAuth)
  .addNode("uploadPost", uploadPost)
  .addNode("finalize", finalize)
  .addEdge(START, "validatePost")
  .addConditionalEdges("validatePost", routeAfterValidation, {
    checkAuth: "checkAuth",
    finalize: "finalize",
  })
  .addConditionalEdges("checkAuth", routeAfterAuth, {
    uploadPost: "uploadPost",
    finalize: "finalize",
  })
  .addEdge("uploadPost", "finalize")
  .addEdge("finalize", END);

export const uploadPostGraph = uploadPostBuilder.compile();

uploadPostGraph.name = "Upload Post Graph";
