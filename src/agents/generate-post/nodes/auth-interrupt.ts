import { interrupt } from "@langchain/langgraph";
import { HumanInterrupt } from "../../types.js";
import { createTwitterClient } from "../../../clients/twitter/index.js";
import { createLinkedInClient } from "../../../clients/linkedin/index.js";

/**
 * Authentication status for a platform
 */
export interface AuthStatus {
  platform: "twitter" | "linkedin";
  authorized: boolean;
  username?: string;
  authUrl?: string;
  error?: string;
}

/**
 * Check authentication status for all platforms
 */
export async function checkAuthStatus(platforms: ("twitter" | "linkedin")[]): Promise<AuthStatus[]> {
  const results: AuthStatus[] = [];

  for (const platform of platforms) {
    if (platform === "twitter") {
      const client = createTwitterClient();
      if (client) {
        const status = await client.verifyCredentials();
        let authUrl: string | undefined;

        // Get auth URL if using Arcade and not authorized
        if (!status.authorized && client.getAuthMode() === "arcade") {
          const urlResult = await client.getArcadeAuthUrl();
          authUrl = urlResult.url;
        }

        results.push({
          platform: "twitter",
          authorized: status.authorized,
          username: status.username,
          authUrl,
          error: status.error,
        });
      } else {
        results.push({
          platform: "twitter",
          authorized: false,
          error: "Twitter client not configured",
        });
      }
    } else if (platform === "linkedin") {
      const client = createLinkedInClient();
      if (client) {
        const status = await client.verifyCredentials();
        let authUrl: string | undefined;

        if (!status.authorized && client.getAuthMode() === "arcade") {
          const urlResult = await client.getArcadeAuthUrl();
          authUrl = urlResult.url;
        }

        results.push({
          platform: "linkedin",
          authorized: status.authorized,
          username: status.name,
          authUrl,
          error: status.error,
        });
      } else {
        results.push({
          platform: "linkedin",
          authorized: false,
          error: "LinkedIn client not configured",
        });
      }
    }
  }

  return results;
}

/**
 * Create authentication interrupt payload
 */
function createAuthInterruptPayload(authStatuses: AuthStatus[]): HumanInterrupt {
  const unauthorizedPlatforms = authStatuses.filter((s) => !s.authorized);

  const authUrls = unauthorizedPlatforms
    .filter((s) => s.authUrl)
    .map((s) => ({
      platform: s.platform,
      url: s.authUrl,
    }));

  return {
    action_request: {
      action: "Authenticate Social Media Accounts",
      args: {
        message: "Authentication required for the following platforms:",
        platforms: unauthorizedPlatforms.map((s) => ({
          platform: s.platform,
          error: s.error || "Not authenticated",
          authUrl: s.authUrl,
        })),
        instructions: `
Please authenticate the required platforms:

${authUrls.map((a) => `${a.platform.toUpperCase()}: ${a.url}`).join("\n")}

After completing authentication, respond with:
- { "type": "accept" } to continue
- { "type": "ignore" } to skip posting
        `.trim(),
      },
    },
    config: {
      allow_accept: true,
      allow_edit: false,
      allow_ignore: true,
      allow_respond: true,
    },
  };
}

/**
 * Require authentication for platforms
 *
 * Checks if all required platforms are authenticated.
 * If not, interrupts for user to authenticate.
 *
 * @param platforms - Platforms that need to be authenticated
 * @returns Auth statuses after verification
 */
export async function requireAuth(
  platforms: ("twitter" | "linkedin")[]
): Promise<{ authorized: boolean; statuses: AuthStatus[] }> {
  // Check current auth status
  let authStatuses = await checkAuthStatus(platforms);

  // Check if all platforms are authorized
  const allAuthorized = authStatuses.every((s) => s.authorized);

  if (allAuthorized) {
    console.log("All platforms authorized");
    return { authorized: true, statuses: authStatuses };
  }

  // Create interrupt for authentication
  const unauthorizedPlatforms = authStatuses.filter((s) => !s.authorized);
  console.log(
    "Authentication required for:",
    unauthorizedPlatforms.map((s) => s.platform).join(", ")
  );

  const interruptPayload = createAuthInterruptPayload(authStatuses);

  // Interrupt for user to authenticate
  const response = interrupt(interruptPayload);

  // Handle response
  if (response && typeof response === "object") {
    const resp = response as { type?: string };

    if (resp.type === "ignore") {
      console.log("User chose to skip authentication");
      return { authorized: false, statuses: authStatuses };
    }

    if (resp.type === "accept") {
      // Re-check auth status after user claims to have authenticated
      authStatuses = await checkAuthStatus(platforms);
      const nowAuthorized = authStatuses.every((s) => s.authorized);

      if (nowAuthorized) {
        console.log("Authentication completed successfully");
        return { authorized: true, statuses: authStatuses };
      } else {
        console.warn("Still not fully authorized after user response");
        return { authorized: false, statuses: authStatuses };
      }
    }
  }

  return { authorized: false, statuses: authStatuses };
}

/**
 * Wait for Arcade authentication to complete
 */
export async function waitForArcadeAuth(
  platform: "twitter" | "linkedin",
  timeoutMs: number = 300000
): Promise<{ authorized: boolean; error?: string }> {
  if (platform === "twitter") {
    const client = createTwitterClient();
    if (client && client.getAuthMode() === "arcade") {
      return client.waitForArcadeAuth(timeoutMs);
    }
    return { authorized: false, error: "Twitter client not in Arcade mode" };
  } else {
    const client = createLinkedInClient();
    if (client && client.getAuthMode() === "arcade") {
      return client.waitForArcadeAuth(timeoutMs);
    }
    return { authorized: false, error: "LinkedIn client not in Arcade mode" };
  }
}
