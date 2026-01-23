import { Annotation, END } from "@langchain/langgraph";
import { DateType, Image } from "../types.js";
import {
  POST_TO_LINKEDIN_ORGANIZATION,
  SKIP_CONTENT_RELEVANCY_CHECK,
  SKIP_USED_URLS_CHECK,
  TEXT_ONLY_MODE,
  type GeneratePostStatus,
} from "./constants.js";
import { filterUnwantedImageUrls } from "../utils.js";

/**
 * Complex post structure when URL is split from the main body
 */
export type ComplexPost = {
  /** Main text content */
  body: string;
  /** URL to include */
  url?: string;
};

/**
 * Shared reducer for deduplicating link arrays
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
 * Verify Links Result Annotation
 * Contains the results from link verification
 */
export const VerifyLinksResultAnnotation = Annotation.Root({
  /** Page content used in verification nodes, used for report generation */
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
 * Main Generate Post State Annotation
 * Defines the state shape for the generate-post graph
 */
export const GeneratePostAnnotation = Annotation.Root({
  /** The links to use to generate a post */
  links: Annotation<string[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  /** The report generated on content, used as context for generating the post */
  report: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /** Verification results spread into main state */
  ...VerifyLinksResultAnnotation.spec,
  /** The generated post for LinkedIn/Twitter */
  post: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /** Complex post when URL is split from main body */
  complexPost: Annotation<ComplexPost | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** The date to schedule the post for */
  scheduleDate: Annotation<DateType>({
    reducer: (_state, update) => update,
  }),
  /** User response for requesting changes to the post */
  userResponse: Annotation<string | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** The node to execute next */
  next: Annotation<
    | "schedulePost"
    | "rewritePost"
    | "updateScheduleDate"
    | "unknownResponse"
    | "rewriteWithSplitUrl"
    | typeof END
    | undefined
  >({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** Status marker for the current step */
  status: Annotation<GeneratePostStatus | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** The image to attach to the post */
  image: Annotation<Image | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** Condense count to prevent infinite loops (max 3) */
  condenseCount: Annotation<number>({
    reducer: (_state, update) => update,
    default: () => 0,
  }),
});

export type GeneratePostState = typeof GeneratePostAnnotation.State;
export type GeneratePostUpdate = typeof GeneratePostAnnotation.Update;

/**
 * Configurable options for the generate-post graph
 */
export const GeneratePostConfigurableAnnotation = Annotation.Root({
  /** Whether to post to LinkedIn organization or user's profile */
  [POST_TO_LINKEDIN_ORGANIZATION]: Annotation<boolean | undefined>,
  /** Text only mode - no image extraction/validation */
  [TEXT_ONLY_MODE]: Annotation<boolean | undefined>({
    reducer: (_state, update) => update,
    default: () => false,
  }),
  /** The original graph that started this run */
  origin: Annotation<string | undefined>,
  /** Whether to skip content relevancy check */
  [SKIP_CONTENT_RELEVANCY_CHECK]: Annotation<boolean | undefined>(),
  /** Whether to skip used URLs check */
  [SKIP_USED_URLS_CHECK]: Annotation<boolean | undefined>(),
});

export type GeneratePostConfigurable =
  typeof GeneratePostConfigurableAnnotation.State;

/**
 * Base configuration for the generate-post graph
 */
export const BASE_GENERATE_POST_CONFIG: GeneratePostConfigurable = {
  [POST_TO_LINKEDIN_ORGANIZATION]: undefined,
  [TEXT_ONLY_MODE]: false,
  origin: undefined,
  [SKIP_CONTENT_RELEVANCY_CHECK]: undefined,
  [SKIP_USED_URLS_CHECK]: undefined,
};
