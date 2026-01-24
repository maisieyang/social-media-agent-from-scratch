import { END } from "@langchain/langgraph";
import { GeneratePostState } from "../state.js";

/**
 * Route type for post generation flow
 */
export type PostGenerationRoute = "condensePost" | "humanReview" | "end";

/**
 * Route type for human response flow
 */
export type HumanResponseRoute =
  | "schedulePost"
  | "rewritePost"
  | "updateScheduleDate"
  | "end";

/**
 * Route after post generation
 *
 * Determines whether the generated post needs condensing
 * based on character count and condense attempts.
 *
 * @param state - Current graph state
 * @returns Next node to execute
 */
export function routeAfterPostGeneration(
  state: GeneratePostState
): PostGenerationRoute {
  const { post } = state;

  // If no post, go to end
  if (!post) {
    console.log("No post generated, ending flow");
    return "end";
  }

  console.log("Post generated, routing to human review");
  return "humanReview";
}

/**
 * Route after condense attempt
 *
 * Checks if the condensed post is now within limits
 * or if we need another condense attempt.
 *
 * @param state - Current graph state
 * @returns Next node to execute
 */
export function routeAfterCondense(
  state: GeneratePostState
): PostGenerationRoute {
  const { post } = state;

  // If no post, go to end
  if (!post) {
    console.log("No post after condense, ending flow");
    return "end";
  }

  console.log("Post condensed, routing to human review");
  return "humanReview";
}

/**
 * Route after human response
 *
 * Routes based on the next field set by humanReviewNode.
 *
 * @param state - Current graph state
 * @returns Next node to execute
 */
export function routeAfterHumanResponse(
  state: GeneratePostState
): HumanResponseRoute {
  const { next } = state;

  if (!next) {
    console.log("No next route specified, ending flow");
    return "end";
  }

  // Handle END constant - use string comparison
  if (next === END || String(next) === "__end__") {
    console.log("Human chose to end flow");
    return "end";
  }

  console.log(`Routing to: ${next}`);
  return next as HumanResponseRoute;
}

/**
 * Route after rewrite
 *
 * After rewriting, check if post needs condensing again.
 */
export function routeAfterRewrite(
  state: GeneratePostState
): PostGenerationRoute {
  const { post } = state;

  if (!post) {
    console.log("No post after rewrite, routing to human review");
    return "humanReview";
  }

  console.log("Rewritten post ready, routing to human review");
  return "humanReview";
}

/**
 * Mapping of route strings to actual node names for conditional edges
 */
export const POST_GENERATION_ROUTE_MAP = {
  condensePost: "condensePost",
  humanReview: "humanReview",
  end: END,
} as const;

/**
 * Mapping for human response routing
 */
export const HUMAN_RESPONSE_ROUTE_MAP = {
  schedulePost: "schedulePost",
  rewritePost: "rewritePost",
  updateScheduleDate: "updateScheduleDate",
  end: END,
} as const;
