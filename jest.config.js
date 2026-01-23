/**
 * Jest Configuration for Social Media Agent
 *
 * Configured for ESM (ECMAScript Modules) support with TypeScript.
 *
 * Run tests with:
 *   npm test
 *   npm test -- --watch
 *   npm test -- --coverage
 */

/** @type {import('jest').Config} */
const config = {
  // Use ts-jest for TypeScript transformation
  preset: "ts-jest/presets/default-esm",

  // Test environment
  testEnvironment: "node",

  // ESM support settings
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          module: "ESNext",
          moduleResolution: "Node",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // Test file patterns
  testMatch: [
    "**/src/tests/**/*.test.ts",
    "**/src/**/*.spec.ts",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/tests/**",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Test timeout (longer for integration tests)
  testTimeout: 30000,

  // Setup files
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],

  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
  ],
  modulePathIgnorePatterns: [
    "/dist/",
  ],

  // Global timeout for hooks
  globalSetup: undefined,
  globalTeardown: undefined,
};

export default config;
