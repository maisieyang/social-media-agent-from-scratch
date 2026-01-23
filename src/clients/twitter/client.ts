import { TwitterApi, TwitterApiReadWrite, EUploadMimeType } from "twitter-api-v2";
import Arcade from "@arcadeai/arcadejs";
import { Image } from "../../agents/types.js";
import { imageUrlToBuffer } from "../../agents/utils.js";

/**
 * Twitter authentication modes
 */
export type TwitterAuthMode = "oauth" | "arcade";

/**
 * Twitter client configuration for OAuth mode
 */
export interface TwitterOAuthConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

/**
 * Twitter client configuration for Arcade AI mode
 */
export interface TwitterArcadeConfig {
  arcadeApiKey: string;
  arcadeUserId: string;
}

/**
 * Twitter client configuration
 */
export interface TwitterClientConfig {
  mode: TwitterAuthMode;
  oauth?: TwitterOAuthConfig;
  arcade?: TwitterArcadeConfig;
}

/**
 * Result of posting a tweet
 */
export interface TweetResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

/**
 * Twitter Client
 *
 * Supports two authentication modes:
 * 1. OAuth - Direct Twitter API access with user tokens
 * 2. Arcade - Delegated auth through Arcade AI for multi-user scenarios
 */
export class TwitterClient {
  private mode: TwitterAuthMode;
  private oauthClient?: TwitterApiReadWrite;
  private arcadeClient?: Arcade;
  private arcadeUserId?: string;

  constructor(config: TwitterClientConfig) {
    this.mode = config.mode;

    if (config.mode === "oauth" && config.oauth) {
      this.oauthClient = new TwitterApi({
        appKey: config.oauth.appKey,
        appSecret: config.oauth.appSecret,
        accessToken: config.oauth.accessToken,
        accessSecret: config.oauth.accessSecret,
      }).readWrite;
    } else if (config.mode === "arcade" && config.arcade) {
      this.arcadeClient = new Arcade({
        apiKey: config.arcade.arcadeApiKey,
      });
      this.arcadeUserId = config.arcade.arcadeUserId;
    } else {
      throw new Error(
        `Invalid configuration for mode: ${config.mode}. Please provide the required config.`
      );
    }
  }

  /**
   * Create a Twitter client from environment variables
   */
  static fromEnv(): TwitterClient {
    // Check for OAuth credentials first
    const oauthAppKey = process.env.TWITTER_APP_KEY;
    const oauthAppSecret = process.env.TWITTER_APP_SECRET;
    const oauthAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const oauthAccessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (oauthAppKey && oauthAppSecret && oauthAccessToken && oauthAccessSecret) {
      return new TwitterClient({
        mode: "oauth",
        oauth: {
          appKey: oauthAppKey,
          appSecret: oauthAppSecret,
          accessToken: oauthAccessToken,
          accessSecret: oauthAccessSecret,
        },
      });
    }

    // Check for Arcade credentials
    const arcadeApiKey = process.env.ARCADE_API_KEY;
    const arcadeUserId = process.env.ARCADE_USER_ID;

    if (arcadeApiKey && arcadeUserId) {
      return new TwitterClient({
        mode: "arcade",
        arcade: {
          arcadeApiKey,
          arcadeUserId,
        },
      });
    }

    throw new Error(
      "Missing Twitter credentials. Set either TWITTER_APP_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET or ARCADE_API_KEY/USER_ID"
    );
  }

  /**
   * Post a tweet with optional media
   */
  async postTweet(text: string, image?: Image): Promise<TweetResult> {
    if (this.mode === "oauth") {
      return this.postTweetOAuth(text, image);
    } else {
      return this.postTweetArcade(text, image);
    }
  }

  /**
   * Post tweet using OAuth (direct API)
   */
  private async postTweetOAuth(text: string, image?: Image): Promise<TweetResult> {
    if (!this.oauthClient) {
      return { success: false, error: "OAuth client not initialized" };
    }

    try {
      let mediaId: string | undefined;

      // Upload media if provided
      if (image) {
        mediaId = await this.uploadMediaOAuth(image);
      }

      // Post tweet
      let result;
      if (mediaId) {
        result = await this.oauthClient.v2.tweet({
          text,
          media: { media_ids: [mediaId] as [string] },
        });
      } else {
        result = await this.oauthClient.v2.tweet(text);
      }

      console.log("Tweet posted successfully:", result.data.id);

      return {
        success: true,
        tweetId: result.data.id,
        tweetUrl: `https://twitter.com/i/status/${result.data.id}`,
      };
    } catch (error) {
      console.error("Error posting tweet (OAuth):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Upload media using OAuth
   */
  private async uploadMediaOAuth(image: Image): Promise<string | undefined> {
    if (!this.oauthClient) {
      return undefined;
    }

    try {
      const { buffer, contentType } = await imageUrlToBuffer(image.imageUrl);

      // Determine MIME type
      let mimeType: EUploadMimeType;
      if (contentType.includes("png")) {
        mimeType = EUploadMimeType.Png;
      } else if (contentType.includes("gif")) {
        mimeType = EUploadMimeType.Gif;
      } else if (contentType.includes("webp")) {
        mimeType = EUploadMimeType.Webp;
      } else {
        mimeType = EUploadMimeType.Jpeg;
      }

      const mediaId = await this.oauthClient.v1.uploadMedia(buffer, {
        mimeType,
      });

      console.log("Media uploaded successfully:", mediaId);
      return mediaId;
    } catch (error) {
      console.error("Error uploading media:", error);
      return undefined;
    }
  }

  /**
   * Post tweet using Arcade AI
   */
  private async postTweetArcade(text: string, _image?: Image): Promise<TweetResult> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { success: false, error: "Arcade client not initialized" };
    }

    try {
      // Use Arcade's X (Twitter) tool
      const result = await this.arcadeClient.tools.execute({
        tool_name: "X.PostTweet",
        input: {
          tweet_text: text,
        },
      } as Parameters<typeof this.arcadeClient.tools.execute>[0]);

      const output = result.output as Record<string, unknown> | undefined;

      if (output?.success) {
        const tweetId = output.tweet_id as string | undefined;
        console.log("Tweet posted via Arcade:", tweetId);

        return {
          success: true,
          tweetId,
          tweetUrl: tweetId ? `https://twitter.com/i/status/${tweetId}` : undefined,
        };
      }

      return {
        success: false,
        error: (output?.error as string) || "Unknown Arcade error",
      };
    } catch (error) {
      console.error("Error posting tweet (Arcade):", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Check if the client is authorized
   */
  async verifyCredentials(): Promise<{ authorized: boolean; username?: string; error?: string }> {
    if (this.mode === "oauth") {
      return this.verifyCredentialsOAuth();
    } else {
      return this.verifyCredentialsArcade();
    }
  }

  /**
   * Verify OAuth credentials
   */
  private async verifyCredentialsOAuth(): Promise<{
    authorized: boolean;
    username?: string;
    error?: string;
  }> {
    if (!this.oauthClient) {
      return { authorized: false, error: "OAuth client not initialized" };
    }

    try {
      const user = await this.oauthClient.v2.me();
      return {
        authorized: true,
        username: user.data.username,
      };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Verify Arcade credentials
   *
   * Note: Arcade requires starting auth flow first to get an auth ID.
   * This method attempts to start auth and check if it's already completed.
   */
  private async verifyCredentialsArcade(): Promise<{
    authorized: boolean;
    username?: string;
    error?: string;
  }> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { authorized: false, error: "Arcade client not initialized" };
    }

    try {
      // Start auth to get current status
      const authResponse = await this.arcadeClient.auth.start(
        this.arcadeUserId,
        "x",
        { scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
      );

      const isCompleted = authResponse.status === "completed";

      return {
        authorized: isCompleted,
        username: undefined, // Arcade doesn't provide username in auth response
        error: !isCompleted ? `Auth required: ${authResponse.url}` : undefined,
      };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get authorization URL for Arcade mode (for OAuth flow)
   */
  async getArcadeAuthUrl(): Promise<{ url?: string; error?: string }> {
    if (this.mode !== "arcade" || !this.arcadeClient || !this.arcadeUserId) {
      return { error: "Arcade mode not enabled or client not initialized" };
    }

    try {
      const authResponse = await this.arcadeClient.auth.start(
        this.arcadeUserId,
        "x",
        { scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
      );

      return { url: authResponse.url };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Wait for Arcade authorization to complete
   */
  async waitForArcadeAuth(_timeoutMs: number = 300000): Promise<{
    authorized: boolean;
    error?: string;
  }> {
    if (this.mode !== "arcade" || !this.arcadeClient || !this.arcadeUserId) {
      return { authorized: false, error: "Arcade mode not enabled" };
    }

    try {
      // Start auth to get auth response
      const authResponse = await this.arcadeClient.auth.start(
        this.arcadeUserId,
        "x",
        { scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
      );

      // Wait for completion using the auth response
      const result = await this.arcadeClient.auth.waitForCompletion(authResponse);

      return { authorized: result.status === "completed" };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get the authentication mode
   */
  getAuthMode(): TwitterAuthMode {
    return this.mode;
  }
}

/**
 * Create a Twitter client, returning undefined if credentials are missing
 */
export function createTwitterClient(): TwitterClient | undefined {
  try {
    return TwitterClient.fromEnv();
  } catch {
    console.warn("Twitter client not available - missing credentials");
    return undefined;
  }
}
