import { END, Send, START, StateGraph } from "@langchain/langgraph";
import { VerifyContentAnnotation } from "../shared/shared-state.js";
import { verifyGeneralContent } from "../shared/nodes/verify-general.js";
import { verifyGitHubContent } from "../shared/nodes/verify-github.js";
import {
  VerifyLinksGraphAnnotation,
  VerifyLinksGraphConfigurableAnnotation,
  VerifyLinksGraphState,
} from "./state.js";
import { getUrlType } from "../utils.js";

/**
 * Routes links to appropriate verification nodes based on URL type.
 * Uses Send for parallel processing of multiple links.
 */
function routeLinkTypes(state: VerifyLinksGraphState): Send[] {
  return state.links.map((link) => {
    const type = getUrlType(link);

    if (type === "github") {
      return new Send("verifyGitHubContent", { link });
    }

    // YouTube, Twitter, Reddit, Luma - placeholder for future implementation
    // For now, route to general content verification
    if (type === "youtube") {
      return new Send("verifyGeneralContent", { link });
    }

    if (type === "twitter") {
      return new Send("verifyGeneralContent", { link });
    }

    if (type === "reddit") {
      return new Send("verifyGeneralContent", { link });
    }

    if (type === "luma") {
      return new Send("verifyGeneralContent", { link });
    }

    // Default: general content verification
    return new Send("verifyGeneralContent", { link });
  });
}

/**
 * Verify Links Graph
 *
 * Processes multiple links in parallel using the Send pattern.
 * Each link is routed to the appropriate verification node based on its URL type.
 */
const verifyLinksWorkflow = new StateGraph(
  VerifyLinksGraphAnnotation,
  VerifyLinksGraphConfigurableAnnotation
)
  // Add verification nodes with input annotation
  .addNode("verifyGeneralContent", verifyGeneralContent, {
    input: VerifyContentAnnotation,
  })
  .addNode("verifyGitHubContent", verifyGitHubContent, {
    input: VerifyContentAnnotation,
  })

  // Route from START using conditional edges with Send
  .addConditionalEdges(START, routeLinkTypes, [
    "verifyGeneralContent",
    "verifyGitHubContent",
  ])

  // All verification nodes end the graph
  .addEdge("verifyGeneralContent", END)
  .addEdge("verifyGitHubContent", END);

export const verifyLinksGraph = verifyLinksWorkflow.compile();

verifyLinksGraph.name = "Verify Links Graph";
