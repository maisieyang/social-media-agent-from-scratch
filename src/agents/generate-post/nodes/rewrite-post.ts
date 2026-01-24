import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getCreativeModel } from "../../llm.js";
import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import {
  BUSINESS_CONTEXT,
  POST_CONTENT_RULES,
  POST_STRUCTURE_INSTRUCTIONS,
} from "../prompts/index.js";
import { GENERATE_POST_STATUS } from "../constants.js";

/**
 * Rewrite Post Node
 *
 * Rewrites the generated post based on user feedback.
 * Maintains the same structure and rules but incorporates the user's suggestions.
 */
export async function rewritePost(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { post, report, userResponse, relevantLinks, links } = state;

  // Get the primary link
  const linksToUse =
    relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  // If no feedback provided, return unchanged
  if (!userResponse) {
    console.warn("No user feedback provided for rewrite");
    return {
      userResponse: undefined,
      next: undefined,
      status: GENERATE_POST_STATUS.REWRITE_SKIPPED_NO_FEEDBACK,
    };
  }

  const systemPrompt = `You are an expert social media content editor. Your task is to rewrite a post based on user feedback while maintaining quality standards.

${BUSINESS_CONTEXT}

<post-structure>
${POST_STRUCTURE_INSTRUCTIONS}
</post-structure>

<content-rules>
${POST_CONTENT_RULES}
</content-rules>

Important guidelines:
- Incorporate the user's feedback while maintaining post quality
- ALWAYS include the source link
- Maintain the three-section structure (hook, body, CTA)
- No hashtags, limited emoji usage`;

  const userPrompt = `Please rewrite the following post based on user feedback:

<current-post>
${post}
</current-post>

<user-feedback>
${userResponse}
</user-feedback>

<source-link>
${primaryLink}
</source-link>

${report ? `<context-report>\n${report.slice(0, 2000)}\n</context-report>` : ""}

Please provide the rewritten post that incorporates the feedback while following all the rules.
Keep it concise while including the source link.`;

  const model = getCreativeModel();

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const rewrittenPost =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    console.log("Post rewritten successfully");
    console.log(`New post length: ${rewrittenPost.length} characters`);

    return {
      post: rewrittenPost,
      userResponse: undefined,
      next: undefined,
      status: GENERATE_POST_STATUS.REWRITE_COMPLETED,
      // Reset condense count for potential re-condensing
      condenseCount: 0,
    };
  } catch (error) {
    console.error("Error rewriting post:", error);
    return {
      userResponse: undefined,
      next: undefined,
      status: GENERATE_POST_STATUS.REWRITE_FAILED,
    };
  }
}
