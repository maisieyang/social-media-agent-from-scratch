import { Annotation } from "@langchain/langgraph";

/**
 * Annotation for content verification nodes.
 * Each verification node receives a single link to verify.
 */
export const VerifyContentAnnotation = Annotation.Root({
  /** The link to the content to verify */
  link: Annotation<string>,
});

export type VerifyContentState = typeof VerifyContentAnnotation.State;
