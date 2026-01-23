import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getDeterministicModel } from "../../llm.js";
import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import { POST_CONDENSE_SYSTEM_PROMPT, POST_CONTENT_RULES } from "../prompts/index.js";
import { GENERATE_POST_STATUS, TWITTER_MAX_CHAR_LENGTH } from "../constants.js";

/**
 * Maximum number of condense attempts to prevent infinite loops
 */
const MAX_CONDENSE_ATTEMPTS = 3;

/**
 * Condense Post Node
 *
 * Shortens posts that exceed the Twitter character limit (280 characters)
 * while preserving the core message and engagement value.
 */
export async function condensePost(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { post, condenseCount, relevantLinks, links } = state;

  // Check if we've exceeded max attempts
  if (condenseCount >= MAX_CONDENSE_ATTEMPTS) {
    console.warn(
      `Max condense attempts (${MAX_CONDENSE_ATTEMPTS}) reached. Returning current post.`
    );
    return {
      condenseCount: condenseCount + 1,
      status: GENERATE_POST_STATUS.CONDENSE_MAX_ATTEMPTS,
    };
  }

  // Get the primary link to ensure it's preserved
  const linksToUse = relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  // Build system prompt
  const systemPrompt = POST_CONDENSE_SYSTEM_PROMPT
    .replace(/{maxLength}/g, String(TWITTER_MAX_CHAR_LENGTH))
    .replace("{postContentRules}", POST_CONTENT_RULES);

  const userPrompt = `Please condense the following post to fit within ${TWITTER_MAX_CHAR_LENGTH} characters:

<current-post>
${post}
</current-post>

<required-link>
${primaryLink}
</required-link>

Current length: ${post.length} characters
Target: ${TWITTER_MAX_CHAR_LENGTH} characters or less

Important:
- The link MUST be included in the final post
- Count the entire post including the link
- Preserve the core message and call to action
- Keep it engaging`;

  const model = getDeterministicModel();

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const condensedPost =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    console.log(
      `Post condensed: ${post.length} -> ${condensedPost.length} characters (attempt ${condenseCount + 1})`
    );

    return {
      post: condensedPost,
      condenseCount: condenseCount + 1,
      status: GENERATE_POST_STATUS.CONDENSE_SUCCESS,
    };
  } catch (error) {
    console.error("Error condensing post:", error);
    return {
      condenseCount: condenseCount + 1,
      status: GENERATE_POST_STATUS.CONDENSE_FAILED,
    };
  }
}

/**
 * Check if post needs condensing
 *
 * Returns true if post exceeds Twitter character limit
 * and we haven't exceeded max condense attempts.
 */
export function shouldCondensePost(state: GeneratePostState): boolean {
  const { post, condenseCount } = state;

  if (!post) {
    return false;
  }

  const needsCondensing = post.length > TWITTER_MAX_CHAR_LENGTH;
  const canCondense = condenseCount < MAX_CONDENSE_ATTEMPTS;

  if (needsCondensing && !canCondense) {
    console.warn(
      `Post exceeds limit (${post.length}/${TWITTER_MAX_CHAR_LENGTH}) but max condense attempts reached`
    );
  }

  return needsCondensing && canCondense;
}
