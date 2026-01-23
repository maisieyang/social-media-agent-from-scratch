import { END } from "@langchain/langgraph";
import { GeneratePostState } from "../state.js";
import { TWITTER_MAX_CHAR_LENGTH } from "../constants.js";

/**
 * Maximum number of condense attempts before giving up
 */
const MAX_CONDENSE_ATTEMPTS = 3;

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
  | "unknownResponse"
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
  const { post, condenseCount } = state;

  // If no post, go to end
  if (!post) {
    console.log("No post generated, ending flow");
    return "end";
  }

  // Check if post exceeds Twitter limit
  const exceedsLimit = post.length > TWITTER_MAX_CHAR_LENGTH;
  const canCondense = condenseCount < MAX_CONDENSE_ATTEMPTS;

  if (exceedsLimit && canCondense) {
    console.log(
      `Post exceeds limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), routing to condense`
    );
    return "condensePost";
  }

  if (exceedsLimit && !canCondense) {
    console.warn(
      `Post exceeds limit but max condense attempts (${MAX_CONDENSE_ATTEMPTS}) reached`
    );
  }

  console.log(`Post within limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), routing to human review`);
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
  const { post, condenseCount } = state;

  // If no post, go to end
  if (!post) {
    console.log("No post after condense, ending flow");
    return "end";
  }

  // Check if post is now within limit
  const withinLimit = post.length <= TWITTER_MAX_CHAR_LENGTH;
  const canCondenseMore = condenseCount < MAX_CONDENSE_ATTEMPTS;

  if (withinLimit) {
    console.log(
      `Post now within limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), routing to human review`
    );
    return "humanReview";
  }

  if (canCondenseMore) {
    console.log(
      `Post still exceeds limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), attempting another condense`
    );
    return "condensePost";
  }

  console.warn(
    `Post still exceeds limit after ${MAX_CONDENSE_ATTEMPTS} attempts, routing to human review anyway`
  );
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
  const { post, condenseCount } = state;

  if (!post) {
    console.log("No post after rewrite, routing to human review");
    return "humanReview";
  }

  const exceedsLimit = post.length > TWITTER_MAX_CHAR_LENGTH;
  const canCondense = condenseCount < MAX_CONDENSE_ATTEMPTS;

  if (exceedsLimit && canCondense) {
    console.log(
      `Rewritten post exceeds limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), routing to condense`
    );
    return "condensePost";
  }

  console.log(
    `Rewritten post ready (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), routing to human review`
  );
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
  unknownResponse: "unknownResponse",
  end: END,
} as const;
