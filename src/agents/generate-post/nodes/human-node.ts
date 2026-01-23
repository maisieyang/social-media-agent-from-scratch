import { interrupt } from "@langchain/langgraph";
import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import { HumanInterrupt, HumanResponse } from "../../types.js";
import { formatDateType } from "./date-parser.js";
import { TWITTER_MAX_CHAR_LENGTH } from "../constants.js";

/**
 * Create the human interrupt request payload
 */
function createInterruptPayload(state: GeneratePostState): HumanInterrupt {
  const { post, relevantLinks, links, image, scheduleDate } = state;

  const linksToUse =
    relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  // Build display info
  const postInfo = {
    content: post,
    characterCount: post?.length || 0,
    withinLimit: (post?.length || 0) <= TWITTER_MAX_CHAR_LENGTH,
    sourceLink: primaryLink,
    hasImage: !!image,
    imageUrl: image?.imageUrl,
    scheduledFor: scheduleDate ? formatDateType(scheduleDate) : "Not scheduled",
  };

  return {
    action_request: {
      action: "Review Generated Post",
      args: {
        post: postInfo,
        instructions: `
Please review the generated post and choose an action:

POST CONTENT:
${post}

CHARACTER COUNT: ${postInfo.characterCount}/${TWITTER_MAX_CHAR_LENGTH} ${postInfo.withinLimit ? "✓" : "✗ (exceeds limit)"}
SOURCE: ${primaryLink}
IMAGE: ${postInfo.hasImage ? postInfo.imageUrl : "None"}
SCHEDULED FOR: ${postInfo.scheduledFor}

Available actions:
- accept: Approve the post as-is and schedule it
- edit: Provide feedback to rewrite the post
- ignore: Discard this post
- respond: Provide custom response/instruction
        `.trim(),
      },
    },
    config: {
      allow_accept: true,
      allow_edit: true,
      allow_ignore: true,
      allow_respond: true,
    },
  };
}

/**
 * Parse the human response from interrupt
 */
function parseHumanResponse(response: unknown): HumanResponse {
  // Handle direct HumanResponse object
  if (
    response &&
    typeof response === "object" &&
    "type" in response &&
    typeof (response as HumanResponse).type === "string"
  ) {
    const humanResponse = response as HumanResponse;
    if (
      ["accept", "edit", "ignore", "respond"].includes(humanResponse.type)
    ) {
      return humanResponse;
    }
  }

  // Handle string response - try to parse as JSON
  if (typeof response === "string") {
    const trimmed = response.trim().toLowerCase();

    // Direct action keywords
    if (trimmed === "accept" || trimmed === "approve" || trimmed === "ok" || trimmed === "yes") {
      return { type: "accept" };
    }
    if (trimmed === "ignore" || trimmed === "discard" || trimmed === "skip" || trimmed === "no") {
      return { type: "ignore" };
    }

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response);
      if (parsed.type && ["accept", "edit", "ignore", "respond"].includes(parsed.type)) {
        return parsed as HumanResponse;
      }
    } catch {
      // Not JSON, treat as edit feedback
    }

    // Treat non-empty string as edit request with feedback
    if (trimmed.length > 0) {
      return {
        type: "edit",
        args: { feedback: response },
      };
    }
  }

  // Handle object with feedback
  if (response && typeof response === "object") {
    const obj = response as Record<string, unknown>;
    if (obj.feedback || obj.message || obj.text) {
      return {
        type: "edit",
        args: {
          feedback: String(obj.feedback || obj.message || obj.text),
        },
      };
    }
  }

  // Default to unknown response
  return { type: "respond", args: { raw: response } };
}

/**
 * Human Review Node
 *
 * Interrupts the graph execution to allow human review of the generated post.
 * Uses LangGraph's interrupt() to pause execution and wait for human input.
 *
 * The human can:
 * - accept: Approve the post and proceed to scheduling
 * - edit: Provide feedback to rewrite the post
 * - ignore: Discard the post and end
 * - respond: Provide custom instructions
 */
export async function humanReviewNode(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { post } = state;

  // Skip if no post generated
  if (!post) {
    console.warn("No post to review, skipping human review");
    return {
      next: "__end__",
    };
  }

  // Create interrupt payload
  const interruptPayload = createInterruptPayload(state);

  console.log("Waiting for human review...");
  console.log("Post preview:", post.slice(0, 100) + (post.length > 100 ? "..." : ""));

  // Interrupt and wait for human response
  const response = interrupt(interruptPayload);

  // Parse the human response
  const humanResponse = parseHumanResponse(response);

  console.log("Human response received:", humanResponse.type);

  // Route based on response type
  switch (humanResponse.type) {
    case "accept":
      return {
        next: "schedulePost",
      };

    case "edit":
      return {
        userResponse: humanResponse.args?.feedback as string | undefined,
        next: "rewritePost",
      };

    case "ignore":
      return {
        next: "__end__",
      };

    case "respond":
      // Check if response contains schedule date update
      const args = humanResponse.args || {};
      if (args.scheduleDate || args.date) {
        return {
          userResponse: String(args.scheduleDate || args.date),
          next: "updateScheduleDate",
        };
      }
      // Check if it contains post edit
      if (args.post || args.content || args.text) {
        return {
          userResponse: String(args.post || args.content || args.text),
          next: "rewritePost",
        };
      }
      // Unknown response type
      return {
        userResponse: JSON.stringify(args),
        next: "unknownResponse",
      };

    default:
      return {
        next: "unknownResponse",
      };
  }
}

/**
 * Unknown Response Handler
 *
 * Handles cases where the human response couldn't be parsed.
 * Loops back to human review.
 */
export async function unknownResponseNode(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  console.warn("Unknown response received:", state.userResponse);
  console.log("Returning to human review...");

  return {
    userResponse: undefined,
    next: undefined,
  };
}
