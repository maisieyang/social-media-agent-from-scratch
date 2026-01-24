import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getCreativeModel } from "../../llm.js";
import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import { GENERATE_POST_STATUS } from "../constants.js";
import {
  BUSINESS_CONTEXT,
  POST_CONTENT_RULES,
  POST_GENERATION_SYSTEM_PROMPT,
  POST_STRUCTURE_INSTRUCTIONS,
  TWEET_EXAMPLES,
} from "../prompts/index.js";

/**
 * Generate Post Node
 *
 * Generates a social media post based on the marketing report
 * and source content.
 */
export async function generatePost(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { report, relevantLinks, links, userResponse } = state;

  // Get the link to include in the post
  const linksToUse = relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;
  const primaryLink = linksToUse[0] || "";

  if (!report || report.trim() === "") {
    console.warn("No report available for post generation");
    return {
      post: `Check out this interesting content!\n\n${primaryLink}`,
      status: GENERATE_POST_STATUS.POST_GENERATED_NO_REPORT,
    };
  }

  // Build system prompt with all components
  const systemPrompt = POST_GENERATION_SYSTEM_PROMPT
    .replace("{businessContext}", BUSINESS_CONTEXT)
    .replace("{postStructureInstructions}", POST_STRUCTURE_INSTRUCTIONS)
    .replace("{postContentRules}", POST_CONTENT_RULES)
    .replace("{tweetExamples}", TWEET_EXAMPLES);

  // Build user prompt
  let userPrompt = `Please generate an engaging social media post based on the following marketing report:

<marketing-report>
${report}
</marketing-report>

<source-link>
${primaryLink}
</source-link>`;

  // If there's user feedback for rewriting
  if (userResponse) {
    userPrompt += `

<user-feedback>
The user has requested the following changes to the post:
${userResponse}

Please rewrite the post according to this feedback while maintaining the post structure and rules.
</user-feedback>`;
  }

  userPrompt += `

Remember:
- Include the source link in your call to action
- Keep the post concise and engaging
- Follow the three-section structure (hook, body, CTA)
- No hashtags
- Limited emoji usage`;

  const model = getCreativeModel();

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const post =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    console.log("Post generated successfully");
    console.log(`Post length: ${post.length} characters`);

    return {
      post,
      // Clear user response after processing
      userResponse: undefined,
      condenseCount: 0,
      status: userResponse
        ? GENERATE_POST_STATUS.POST_GENERATED_FROM_FEEDBACK
        : GENERATE_POST_STATUS.POST_GENERATED,
    };
  } catch (error) {
    console.error("Error generating post:", error);
    return {
      post: `Exciting new content to explore!\n\n${primaryLink}`,
      status: GENERATE_POST_STATUS.POST_GENERATION_FAILED,
    };
  }
}
