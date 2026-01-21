import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Verify Links Graph State
 */
export const VerifyLinksAnnotation = Annotation.Root({
  links: Annotation<string[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  pageContents: Annotation<string[]>({
    reducer: (state, update) => (state || []).concat(update),
    default: () => [],
  }),
  relevantLinks: Annotation<string[]>({
    reducer: (state, update) => [...new Set([...(state || []), ...update])],
    default: () => [],
  }),
});

type VerifyLinksState = typeof VerifyLinksAnnotation.State;

/**
 * Placeholder node - will be implemented in Phase 3
 */
async function placeholderVerify(
  state: VerifyLinksState
): Promise<Partial<VerifyLinksState>> {
  console.log("Verify Links Graph - Placeholder");
  return {
    relevantLinks: state.links,
    pageContents: ["Placeholder content"],
  };
}

const verifyLinksBuilder = new StateGraph(VerifyLinksAnnotation)
  .addNode("placeholder", placeholderVerify)
  .addEdge(START, "placeholder")
  .addEdge("placeholder", END);

export const verifyLinksGraph = verifyLinksBuilder.compile();

verifyLinksGraph.name = "Verify Links Graph";
