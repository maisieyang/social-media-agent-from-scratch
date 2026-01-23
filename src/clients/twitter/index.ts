/**
 * Twitter Client Module
 *
 * Provides Twitter API integration with dual authentication support:
 * - OAuth: Direct API access with user tokens
 * - Arcade: Delegated auth for multi-user scenarios
 */

export {
  TwitterClient,
  createTwitterClient,
  type TwitterAuthMode,
  type TwitterOAuthConfig,
  type TwitterArcadeConfig,
  type TwitterClientConfig,
  type TweetResult,
} from "./client.js";
