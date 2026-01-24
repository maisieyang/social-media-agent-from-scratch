/**
 * Generate Post Graph Nodes
 *
 * Export all node implementations and routing utilities.
 */

// Core generation nodes
export { generateReport } from "./generate-report.js";
export { generatePost } from "./generate-post.js";
export { condensePost, shouldCondensePost } from "./condense-post.js";

// Human interaction nodes
export { humanReviewNode } from "./human-node.js";
export { rewritePost } from "./rewrite-post.js";
export { updateScheduleDate } from "./update-schedule-date.js";
export { schedulePost, type PublishResult } from "./schedule-post.js";

// Authentication
export {
  checkAuthStatus,
  requireAuth,
  waitForArcadeAuth,
  type AuthStatus,
} from "./auth-interrupt.js";

// Date parsing utilities
export {
  parseScheduleDate,
  formatDateType,
  validateScheduleDate,
  parseTime,
  parseRelativeDate,
  parseAbsoluteDate,
  type ParsedDateResult,
} from "./date-parser.js";

// Routing
export {
  routeAfterPostGeneration,
  routeAfterCondense,
  routeAfterHumanResponse,
  routeAfterRewrite,
  POST_GENERATION_ROUTE_MAP,
  HUMAN_RESPONSE_ROUTE_MAP,
  type PostGenerationRoute,
  type HumanResponseRoute,
} from "./routing.js";

// URL Deduplication
export {
  checkUrls,
  routeAfterUrlCheck,
  URL_CHECK_ROUTE_MAP,
} from "./check-urls.js";

export {
  getSavedUrls,
  saveUsedUrls,
  checkUrlsUsage,
  clearSavedUrls,
} from "./store-operations.js";
