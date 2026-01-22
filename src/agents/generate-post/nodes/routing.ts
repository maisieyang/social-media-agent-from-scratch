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
export type PostGenerationRoute = "condensePost" | "end";

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

  console.log(`Post within limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), ending flow`);
  return "end";
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
      `Post now within limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), ending flow`
    );
    return "end";
  }

  if (canCondenseMore) {
    console.log(
      `Post still exceeds limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}), attempting another condense`
    );
    return "condensePost";
  }

  console.warn(
    `Post still exceeds limit after ${MAX_CONDENSE_ATTEMPTS} attempts, ending flow`
  );
  return "end";
}

/**
 * Mapping of route strings to actual node names for conditional edges
 */
export const POST_GENERATION_ROUTE_MAP = {
  condensePost: "condensePost",
  end: END,
} as const;
