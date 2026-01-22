import { Annotation } from "@langchain/langgraph";
import { filterUnwantedImageUrls } from "../utils.js";
import { SKIP_CONTENT_RELEVANCY_CHECK } from "../generate-post/constants.js";

/**
 * Shared links reducer that deduplicates and filters unwanted URLs.
 */
export const sharedLinksReducer = (
  state: string[] | undefined,
  update: string[] | undefined
): string[] | undefined => {
  if (update === undefined) return undefined;
  const resultSet = new Set<string>();
  update.filter((u): u is string => !!u).forEach((link) => resultSet.add(link));
  (state || []).forEach((link) => resultSet.add(link));
  return filterUnwantedImageUrls(Array.from(resultSet));
};

/**
 * Shared input annotation for verify-links graph.
 */
export const VerifyLinksGraphSharedAnnotation = Annotation.Root({
  /** The links to verify */
  links: Annotation<string[]>,
});

/**
 * Result annotation for verify-links operations.
 */
export const VerifyLinksResultAnnotation = Annotation.Root({
  /** Page content used in verification, used for report generation */
  pageContents: Annotation<string[] | undefined>({
    reducer: (state, update) => {
      if (update === undefined) return undefined;
      return (state || []).concat(update);
    },
    default: () => [],
  }),
  /** Relevant links found in the message */
  relevantLinks: Annotation<string[] | undefined>({
    reducer: sharedLinksReducer,
    default: () => [],
  }),
  /** Image options to provide to the user */
  imageOptions: Annotation<string[] | undefined>({
    reducer: sharedLinksReducer,
    default: () => [],
  }),
});

/**
 * Full annotation for verify-links graph.
 */
export const VerifyLinksGraphAnnotation = Annotation.Root({
  /** The links to verify */
  links: VerifyLinksGraphSharedAnnotation.spec.links,
  ...VerifyLinksResultAnnotation.spec,
});

/**
 * Configurable options for verify-links graph.
 */
export const VerifyLinksGraphConfigurableAnnotation = Annotation.Root({
  /** Whether to skip content relevancy check */
  [SKIP_CONTENT_RELEVANCY_CHECK]: Annotation<boolean | undefined>(),
});

export type VerifyLinksGraphState = typeof VerifyLinksGraphAnnotation.State;
