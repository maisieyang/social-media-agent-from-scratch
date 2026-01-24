import { START, StateGraph } from "@langchain/langgraph";
import {
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation,
} from "./state.js";
import {
  // Core generation nodes
  generateReport,
  generatePost,
  condensePost,
  // Human interaction nodes
  humanReviewNode,
  rewritePost,
  updateScheduleDate,
  schedulePost,
  // URL Deduplication
  checkUrls,
  routeAfterUrlCheck,
  URL_CHECK_ROUTE_MAP,
  // Routing
  routeAfterPostGeneration,
  routeAfterCondense,
  routeAfterHumanResponse,
  routeAfterRewrite,
  POST_GENERATION_ROUTE_MAP,
  HUMAN_RESPONSE_ROUTE_MAP,
} from "./nodes/index.js";

/**
 * Generate Post Graph Builder
 *
 * This graph handles the full post generation workflow with human-in-the-loop:
 *
 * Phase 0: URL Deduplication
 *   START -> checkUrls -> [conditional: generateReport or END (if all duplicates)]
 *
 * Phase 1: Content Generation
 *   generateReport -> generatePost -> [conditional: condensePost or humanReview]
 *   condensePost -> [conditional: condensePost (retry) or humanReview]
 *
 * Phase 2: Human Review (Interrupt)
 *   humanReview -> [interrupt for human input] -> [conditional routing based on response]
 *     - accept -> schedulePost -> END (saves used URLs)
 *     - edit -> rewritePost -> [conditional: condensePost or humanReview]
 *     - ignore -> END
 *     - respond (schedule) -> updateScheduleDate -> humanReview
 *     - unknown -> END
 *
 * Flow Diagram:
 * ```
 *                    START
 *                      │
 *                      ▼
 *                 checkUrls ────────► END (all duplicates)
 *                      │
 *                      ▼
 *               generateReport
 *                      │
 *                      ▼
 *                generatePost
 *                      │
 *           ┌─────────┴─────────┐
 *           ▼                   ▼
 *     condensePost ──────► humanReview ◄───────┐
 *           │                   │              │
 *           └───────────────────┤              │
 *                      ┌────────┼────────┐     │
 *                      ▼        ▼        ▼     │
 *               schedulePost  rewrite  update  │
 *                      │        │        │     │
 *                      ▼        └────────┴─────┘
 *                     END
 * ```
 */
const generatePostBuilder = new StateGraph(
  GeneratePostAnnotation,
  GeneratePostConfigurableAnnotation
)
  // ============================================
  // Phase 0: URL Deduplication
  // ============================================
  .addNode("checkUrls", checkUrls)

  // ============================================
  // Phase 1: Content Generation Nodes
  // ============================================
  .addNode("generateReport", generateReport)
  .addNode("generatePost", generatePost)
  .addNode("condensePost", condensePost)

  // ============================================
  // Phase 2: Human Interaction Nodes
  // ============================================
  .addNode("humanReview", humanReviewNode)
  .addNode("rewritePost", rewritePost)
  .addNode("updateScheduleDate", updateScheduleDate)
  .addNode("schedulePost", schedulePost)

  // ============================================
  // Phase 0: URL Deduplication Edges
  // ============================================

  // START -> checkUrls
  .addEdge(START, "checkUrls")

  // checkUrls -> [conditional: generateReport or END]
  .addConditionalEdges("checkUrls", routeAfterUrlCheck, URL_CHECK_ROUTE_MAP)

  // ============================================
  // Phase 1: Content Generation Edges
  // ============================================

  // generateReport -> generatePost
  .addEdge("generateReport", "generatePost")

  // generatePost -> [conditional: condensePost or humanReview]
  .addConditionalEdges(
    "generatePost",
    routeAfterPostGeneration,
    POST_GENERATION_ROUTE_MAP
  )

  // condensePost -> [conditional: condensePost (retry) or humanReview]
  .addConditionalEdges(
    "condensePost",
    routeAfterCondense,
    POST_GENERATION_ROUTE_MAP
  )

  // ============================================
  // Phase 2: Human Interaction Edges
  // ============================================

  // humanReview -> [conditional based on human response]
  .addConditionalEdges(
    "humanReview",
    routeAfterHumanResponse,
    HUMAN_RESPONSE_ROUTE_MAP
  )

  // rewritePost -> [conditional: condensePost or humanReview]
  .addConditionalEdges(
    "rewritePost",
    routeAfterRewrite,
    POST_GENERATION_ROUTE_MAP
  )

  // updateScheduleDate -> humanReview (loop back for confirmation)
  .addEdge("updateScheduleDate", "humanReview")

  // unknown responses end the graph

// Note: schedulePost has no outgoing edges - it ends the graph

export const generatePostGraph = generatePostBuilder.compile();

generatePostGraph.name = "Generate Post Graph";
