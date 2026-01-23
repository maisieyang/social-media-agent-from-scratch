import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { getDefaultChatModel } from "../../llm.js";
import { GeneratePostState, GeneratePostUpdate } from "../state.js";
import {
  BUSINESS_CONTEXT,
  REPORT_GENERATION_PROMPT,
} from "../prompts/index.js";
import { GENERATE_POST_STATUS } from "../constants.js";

/**
 * Generate Report Node
 *
 * Analyzes page content and generates a marketing report
 * that will be used as context for post generation.
 */
export async function generateReport(
  state: GeneratePostState
): Promise<GeneratePostUpdate> {
  const { pageContents, relevantLinks, links } = state;
  const linksToUse =
    relevantLinks && relevantLinks.length > 0 ? relevantLinks : links;

  if (!linksToUse || linksToUse.length === 0) {
    console.warn("No links available for report generation");
    return {
      report: "Unable to generate report: No source links available.",
      status: GENERATE_POST_STATUS.REPORT_SKIPPED_NO_CONTENT,
    };
  }

  // Use page contents if available, otherwise use links directly
  const contentToAnalyze =
    pageContents && pageContents.length > 0
      ? pageContents.join("\n\n---\n\n")
      : `Source links: ${linksToUse.join(", ")}`;

  if (!contentToAnalyze || contentToAnalyze.trim() === "") {
    console.warn("No content available for report generation");
    return {
      report: "Unable to generate report: No content available.",
      status: GENERATE_POST_STATUS.REPORT_SKIPPED_NO_CONTENT,
    };
  }

  const model = getDefaultChatModel({ temperature: 0.3 });

  const systemPrompt = `${REPORT_GENERATION_PROMPT}\n\n${BUSINESS_CONTEXT}`;

  const userPrompt = `Please analyze the following content and generate a marketing report:

<content>
${contentToAnalyze.slice(0, 15000)}
</content>

<source-links>
${linksToUse.join("\n")}
</source-links>`;

  try {
    const response = await model.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userPrompt),
    ]);

    const report =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    console.log("Report generated successfully");

    return {
      report,
      status: GENERATE_POST_STATUS.REPORT_GENERATED,
    };
  } catch (error) {
    console.error("Error generating report:", error);
    return {
      report: `Error generating report: ${error instanceof Error ? error.message : "Unknown error"}`,
      status: GENERATE_POST_STATUS.REPORT_FAILED,
    };
  }
}
