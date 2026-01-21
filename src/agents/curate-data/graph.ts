import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Curate Data Graph State
 */
export const CurateDataAnnotation = Annotation.Root({
  /** Data sources to curate from */
  sources: Annotation<string[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  /** Curated links from all sources */
  curatedLinks: Annotation<string[]>({
    reducer: (state, update) => [...new Set([...(state || []), ...update])],
    default: () => [],
  }),
  /** Reports generated for each link */
  reports: Annotation<Array<{ link: string; report: string }>>({
    reducer: (state, update) => (state || []).concat(update),
    default: () => [],
  }),
});

type CurateDataState = typeof CurateDataAnnotation.State;

/**
 * Placeholder node - will be implemented in Phase 9
 */
async function placeholderCurate(
  _state: CurateDataState
): Promise<Partial<CurateDataState>> {
  console.log("Curate Data Graph - Placeholder");
  return {
    curatedLinks: [],
    reports: [],
  };
}

const curateDataBuilder = new StateGraph(CurateDataAnnotation)
  .addNode("placeholder", placeholderCurate)
  .addEdge(START, "placeholder")
  .addEdge("placeholder", END);

export const curateDataGraph = curateDataBuilder.compile();

curateDataGraph.name = "Curate Data Graph";
