import { END, START, StateGraph } from "@langchain/langgraph";
import {
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation,
  GeneratePostState,
} from "./state.js";

/**
 * Placeholder node - will be replaced with actual implementation in later phases
 */
async function placeholderNode(
  state: GeneratePostState
): Promise<Partial<GeneratePostState>> {
  console.log("Generate Post Graph - Placeholder Node");
  console.log("Input links:", state.links);
  return {
    report: "Placeholder report - to be implemented",
    post: "Placeholder post - to be implemented",
  };
}

/**
 * Generate Post Graph Builder
 * This is a minimal implementation that will be extended in later phases
 */
const generatePostBuilder = new StateGraph(
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation
)
  .addNode("placeholder", placeholderNode)
  .addEdge(START, "placeholder")
  .addEdge("placeholder", END);

export const generatePostGraph = generatePostBuilder.compile();

generatePostGraph.name = "Generate Post Graph";
