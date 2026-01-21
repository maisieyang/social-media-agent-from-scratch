import { Annotation, END, START, StateGraph } from "@langchain/langgraph";

/**
 * Find Images Graph State
 */
export const FindImagesAnnotation = Annotation.Root({
  pageContents: Annotation<string[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  imageOptions: Annotation<string[]>({
    reducer: (state, update) => [...new Set([...(state || []), ...update])],
    default: () => [],
  }),
  selectedImage: Annotation<{ imageUrl: string; mimeType: string } | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
});

type FindImagesState = typeof FindImagesAnnotation.State;

/**
 * Placeholder node - will be implemented in Phase 7
 */
async function placeholderFindImages(
  _state: FindImagesState
): Promise<Partial<FindImagesState>> {
  console.log("Find Images Graph - Placeholder");
  return {
    imageOptions: [],
  };
}

const findImagesBuilder = new StateGraph(FindImagesAnnotation)
  .addNode("placeholder", placeholderFindImages)
  .addEdge(START, "placeholder")
  .addEdge("placeholder", END);

export const findImagesGraph = findImagesBuilder.compile();

findImagesGraph.name = "Find Images Graph";
