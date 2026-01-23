/**
 * Jest Test Setup
 *
 * This file runs before all tests to configure the test environment.
 */

import { jest, beforeAll, afterAll } from "@jest/globals";

// Set test environment variables
process.env.NODE_ENV = "test";

// Disable LangSmith tracing in tests unless explicitly enabled
if (!process.env.LANGSMITH_TRACING) {
  process.env.LANGSMITH_TRACING = "false";
  process.env.LANGCHAIN_TRACING_V2 = "false";
}

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Optionally suppress console output during tests
  if (process.env.SUPPRESS_CONSOLE !== "false") {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    // Keep error output for debugging
    // jest.spyOn(console, "error").mockImplementation(() => {});
  }
});

afterAll(() => {
  // Restore console
  Object.assign(console, originalConsole);
});

// Global test utilities
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      testUtils: {
        delay: (ms: number) => Promise<void>;
      };
    }
  }
}

// Export test utilities
export const testUtils = {
  delay: (ms: number) => new Promise((resolve) => setTimeout(resolve, ms)),
};
