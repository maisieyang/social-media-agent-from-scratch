import type { BrowserContextOptions, PageScreenshotOptions } from "playwright";

export const ALLOWED_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const ALLOWED_TIMES = [
  "8:00 AM",
  "8:10 AM",
  "8:20 AM",
  "8:30 AM",
  "8:40 AM",
  "8:50 AM",
  "9:00 AM",
  "9:10 AM",
  "9:20 AM",
  "9:30 AM",
  "9:40 AM",
  "9:50 AM",
  "10:00 AM",
  "10:10 AM",
  "10:20 AM",
  "10:30 AM",
  "10:40 AM",
  "10:50 AM",
  "11:00 AM",
  "11:10 AM",
  "11:20 AM",
  "11:30 AM",
  "11:40 AM",
  "11:50 AM",
  "12:00 PM",
  "12:10 PM",
  "12:20 PM",
  "12:30 PM",
  "12:40 PM",
  "12:50 PM",
  "1:00 PM",
  "1:10 PM",
  "1:20 PM",
  "1:30 PM",
  "1:40 PM",
  "1:50 PM",
  "2:00 PM",
  "2:10 PM",
  "2:20 PM",
  "2:30 PM",
  "2:40 PM",
  "2:50 PM",
  "3:00 PM",
  "3:10 PM",
  "3:20 PM",
  "3:30 PM",
  "3:40 PM",
  "3:50 PM",
  "4:00 PM",
  "4:10 PM",
  "4:20 PM",
  "4:30 PM",
  "4:40 PM",
  "4:50 PM",
  "5:00 PM",
];

export const GITHUB_SCREENSHOT_OPTIONS: PageScreenshotOptions = {
  clip: {
    width: 1200,
    height: 1500,
    x: 525,
    y: 350,
  },
};

export const GITHUB_BROWSER_CONTEXT_OPTIONS: BrowserContextOptions = {
  viewport: {
    width: 1920,
    height: 1500,
  },
};

// Configurable keys
// LinkedIn
export const LINKEDIN_PERSON_URN = "linkedInPersonUrn";
export const LINKEDIN_ORGANIZATION_ID = "linkedInOrganizationId";
export const LINKEDIN_ACCESS_TOKEN = "linkedInAccessToken";
export const POST_TO_LINKEDIN_ORGANIZATION = "postToLinkedInOrganization";
export const LINKEDIN_USER_ID = "linkedInUserId";

// Twitter
export const TWITTER_USER_ID = "twitterUserId";
export const TWITTER_TOKEN = "twitterToken";
export const TWITTER_TOKEN_SECRET = "twitterTokenSecret";
export const INGEST_TWITTER_USERNAME = "ingestTwitterUsername";

// Mode flags
export const TEXT_ONLY_MODE = "textOnlyMode";
export const SKIP_CONTENT_RELEVANCY_CHECK = "skipContentRelevancyCheck";
export const SKIP_USED_URLS_CHECK = "skipUsedUrlsCheck";

export const GENERATE_POST_STATUS = {
  URL_CHECK_SKIPPED: "url_check_skipped",
  URL_CHECK_SKIPPED_NO_LINKS: "url_check_skipped_no_links",
  URL_CHECK_ALL_DUPLICATES: "url_check_all_duplicates",
  URL_CHECK_FILTERED: "url_check_filtered",
  URL_CHECK_ALL_NEW: "url_check_all_new",
  VERIFY_LINKS_SKIPPED_NO_LINKS: "verify_links_skipped_no_links",
  VERIFY_LINKS_COMPLETED: "verify_links_completed",
  REPORT_SKIPPED_NO_CONTENT: "report_skipped_no_content",
  REPORT_GENERATED: "report_generated",
  REPORT_FAILED: "report_failed",
  POST_GENERATED_NO_REPORT: "post_generated_no_report",
  POST_GENERATED: "post_generated",
  POST_GENERATED_FROM_FEEDBACK: "post_generated_from_feedback",
  POST_GENERATION_FAILED: "post_generation_failed",
  CONDENSE_MAX_ATTEMPTS: "condense_max_attempts",
  CONDENSE_SUCCESS: "condense_success",
  CONDENSE_FAILED: "condense_failed",
  NO_POST_FOR_REVIEW: "no_post_for_review",
  REVIEW_ACCEPTED: "review_accepted",
  REVIEW_EDIT_REQUESTED: "review_edit_requested",
  REVIEW_IGNORED: "review_ignored",
  REVIEW_SCHEDULE_UPDATE_REQUESTED: "review_schedule_update_requested",
  REVIEW_UNKNOWN_RESPONSE: "review_unknown_response",
  AUTH_REQUIRED: "auth_required",
  PUBLISHED: "published",
  PUBLISH_FAILED: "publish_failed",
  SCHEDULED: "scheduled",
  REWRITE_SKIPPED_NO_FEEDBACK: "rewrite_skipped_no_feedback",
  REWRITE_COMPLETED: "rewrite_completed",
  REWRITE_FAILED: "rewrite_failed",
} as const;

export type GeneratePostStatus =
  (typeof GENERATE_POST_STATUS)[keyof typeof GENERATE_POST_STATUS];
