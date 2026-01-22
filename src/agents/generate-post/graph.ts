import { START, StateGraph } from "@langchain/langgraph";
import {
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation,
} from "./state.js";
import {
  generateReport,
  generatePost,
  condensePost,
  routeAfterPostGeneration,
  routeAfterCondense,
  POST_GENERATION_ROUTE_MAP,
} from "./nodes/index.js";

/**
 * Generate Post Graph Builder
 *
 * This graph handles the full post generation workflow:
 * 1. Generate a marketing report from page content
 * 2. Generate a social media post based on the report
 * 3. Condense the post if it exceeds Twitter's 280 character limit
 *
 * Flow:
 * START -> generateReport -> generatePost -> [conditional: condensePost or END]
 *       condensePost -> [conditional: condensePost (retry) or END]
 */
const generatePostBuilder = new StateGraph(
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation
)
  // Add nodes
  .addNode("generateReport", generateReport)
  .addNode("generatePost", generatePost)
  .addNode("condensePost", condensePost)

  // Define edges
  // START -> generateReport
  .addEdge(START, "generateReport")

  // generateReport -> generatePost
  .addEdge("generateReport", "generatePost")

  // generatePost -> [conditional edge based on post length]
  .addConditionalEdges(
    "generatePost",
    routeAfterPostGeneration,
    POST_GENERATION_ROUTE_MAP
  )

  // condensePost -> [conditional edge: retry or END]
  .addConditionalEdges(
    "condensePost",
    routeAfterCondense,
    POST_GENERATION_ROUTE_MAP
  );

export const generatePostGraph = generatePostBuilder.compile();

generatePostGraph.name = "Generate Post Graph";
