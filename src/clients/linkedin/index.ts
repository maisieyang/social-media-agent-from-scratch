/**
 * LinkedIn Client Module
 *
 * Provides LinkedIn API integration with dual authentication support:
 * - OAuth: Direct API access with access token
 * - Arcade: Delegated auth for multi-user scenarios
 */

export {
  LinkedInClient,
  createLinkedInClient,
  type LinkedInAuthMode,
  type LinkedInOAuthConfig,
  type LinkedInArcadeConfig,
  type LinkedInClientConfig,
  type LinkedInPostResult,
} from "./client.js";
