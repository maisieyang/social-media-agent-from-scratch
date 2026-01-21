import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Supervisor Graph State
 * Orchestrates batch processing of multiple posts
 */
export const SupervisorAnnotation = Annotation.Root({
  /** Links to process in batch */
  links: Annotation<string[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  /** Generated posts */
  posts: Annotation<Array<{ link: string; post: string }>>({
    reducer: (state, update) => (state || []).concat(update),
    default: () => [],
  }),
  /** Processing status */
  status: Annotation<"pending" | "processing" | "completed">({
    reducer: (_state, update) => update,
    default: () => "pending",
  }),
});

type SupervisorState = typeof SupervisorAnnotation.State;

/**
 * Placeholder node - will be implemented in Phase 10
 */
async function placeholderSupervisor(
  _state: SupervisorState
): Promise<Partial<SupervisorState>> {
  console.log("Supervisor Graph - Placeholder");
  return {
    status: "completed",
    posts: [],
  };
}

const supervisorBuilder = new StateGraph(SupervisorAnnotation)
  .addNode("placeholder", placeholderSupervisor)
  .addEdge(START, "placeholder")
  .addEdge("placeholder", END);

export const supervisorGraph = supervisorBuilder.compile();

supervisorGraph.name = "Supervisor Graph";
