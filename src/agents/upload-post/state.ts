import { Annotation } from "@langchain/langgraph";
import { Image, SocialPlatform } from "../types.js";

/**
 * Upload Post State Annotation
 * Defines the state shape for the upload-post graph
 */
export const UploadPostAnnotation = Annotation.Root({
  /** The post content to upload */
  content: Annotation<string>({
    reducer: (_state, update) => update,
    default: () => "",
  }),
  /** Target platforms for posting */
  platforms: Annotation<SocialPlatform[]>({
    reducer: (_state, update) => update,
    default: () => ["twitter"],
  }),
  /** Image to attach to the post */
  image: Annotation<Image | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
  /** Results of the upload attempts */
  results: Annotation<UploadResult[]>({
    reducer: (_state, update) => update,
    default: () => [],
  }),
  /** Overall success status */
  success: Annotation<boolean>({
    reducer: (_state, update) => update,
    default: () => false,
  }),
  /** Error message if failed */
  error: Annotation<string | undefined>({
    reducer: (_state, update) => update,
    default: () => undefined,
  }),
});

/**
 * Result of uploading to a single platform
 */
export interface UploadResult {
  platform: SocialPlatform;
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

export type UploadPostState = typeof UploadPostAnnotation.State;
export type UploadPostUpdate = typeof UploadPostAnnotation.Update;

/**
 * Configurable options for upload-post graph
 */
export const UploadPostConfigurableAnnotation = Annotation.Root({
  /** Whether to post to LinkedIn organization */
  postToLinkedInOrganization: Annotation<boolean | undefined>({
    reducer: (_state, update) => update,
    default: () => false,
  }),
});

export type UploadPostConfigurable = typeof UploadPostConfigurableAnnotation.State;
