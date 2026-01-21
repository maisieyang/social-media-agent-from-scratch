/**
 * Shared types for Social Media Agent
 */

/**
 * Priority scheduling types:
 * - p1, p2, p3: Priority levels (highest to lowest)
 * - r1, r2, r3: Regular schedule slots
 * - Date: Specific scheduled time
 */
export type DateType = Date | "p1" | "p2" | "p3" | "r1" | "r2" | "r3";

/**
 * Image with URL and MIME type for media uploads
 */
export type Image = {
  imageUrl: string;
  mimeType: string;
};

/**
 * Additional context extracted from links
 */
export type AdditionalContext = {
  /** The string content from the link */
  content: string;
  /** The link from which the content was extracted */
  link: string;
};

/**
 * A post in a repurposed series
 */
export type RepurposedPost = {
  /** The content of the specific post */
  content: string;
  /** The index of the post in the series */
  index: number;
};

/**
 * Page content extracted from URL scraping
 */
export type PageContent = {
  /** The original URL */
  url: string;
  /** Extracted text content */
  content: string;
  /** Page title if available */
  title?: string;
  /** Extracted images */
  images?: Image[];
};

/**
 * Verification result for a link
 */
export type LinkVerificationResult = {
  /** The original link */
  link: string;
  /** Whether the link is relevant */
  isRelevant: boolean;
  /** Extracted page content if relevant */
  pageContent?: PageContent;
  /** Reason for rejection if not relevant */
  rejectionReason?: string;
};

/**
 * Human response types for interrupt handling
 */
export type HumanResponseType = "accept" | "edit" | "ignore" | "respond";

/**
 * Human interrupt response
 */
export type HumanResponse = {
  type: HumanResponseType;
  args?: Record<string, unknown>;
};

/**
 * Human interrupt request configuration
 */
export type HumanInterruptConfig = {
  allow_accept: boolean;
  allow_edit: boolean;
  allow_ignore: boolean;
  allow_respond: boolean;
};

/**
 * Human interrupt request
 */
export type HumanInterrupt = {
  action_request: {
    action: string;
    args: Record<string, unknown>;
  };
  config: HumanInterruptConfig;
};

/**
 * Social media platform types
 */
export type SocialPlatform = "twitter" | "linkedin";

/**
 * Post status in the workflow
 */
export type PostStatus =
  | "pending"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

/**
 * Generated post with metadata
 */
export type GeneratedPost = {
  /** Post content text */
  content: string;
  /** Target platform */
  platform: SocialPlatform;
  /** Post status */
  status: PostStatus;
  /** Scheduled date/time */
  scheduledDate?: DateType;
  /** Attached images */
  images?: Image[];
  /** Source URLs used to generate this post */
  sourceUrls: string[];
};
