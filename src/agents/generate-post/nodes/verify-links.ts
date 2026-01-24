import { RunnableConfig } from "@langchain/core/runnables";
import { verifyLinksGraph } from "../../verify-links/graph.js";
import {
  GeneratePostConfigurable,
  GeneratePostState,
  GeneratePostUpdate,
} from "../state.js";
import { GENERATE_POST_STATUS } from "../constants.js";

/**
 * Verify Links Node
 *
 * Runs the verify-links graph to populate page contents, relevant links,
 * and image options before report generation.
 */
export async function verifyLinksNode(
  state: GeneratePostState,
  config?: RunnableConfig<GeneratePostConfigurable>
): Promise<GeneratePostUpdate> {
  const { links } = state;

  if (!links || links.length === 0) {
    return {
      status: GENERATE_POST_STATUS.VERIFY_LINKS_SKIPPED_NO_LINKS,
    };
  }

  const result = await verifyLinksGraph.invoke(
    { links },
    { configurable: config?.configurable }
  );

  const relevantLinks =
    result.relevantLinks && result.relevantLinks.length > 0
      ? result.relevantLinks
      : links;

  return {
    pageContents: result.pageContents,
    relevantLinks,
    imageOptions: result.imageOptions,
    status: GENERATE_POST_STATUS.VERIFY_LINKS_COMPLETED,
  };
}
