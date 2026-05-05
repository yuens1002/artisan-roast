import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: "./",
});

// Add any custom config to be passed to Jest
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@components/(.*)$": "<rootDir>/components/$1",
  },
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  collectCoverageFrom: [
    "lib/**/*.{js,jsx,ts,tsx}",
    "hooks/**/*.{js,jsx,ts,tsx}",
    "app/api/**/*.{js,ts}",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
  ],
  transformIgnorePatterns: ["node_modules/(?!(next-auth|@auth/core)/)"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "/e2e/",
    "/docs/internal/", // Archived/reference code (not active)
    "/app/api/(?!.*__tests__/)", // Ignore API route files but allow co-located route tests
    "/lib/__tests__/data", // Skip data tests (require live database)
    "/__tests__/fixtures([/\\\\]|\\.ts$)", // Fixture files and directories are not test suites
    "/__tests__/integration/", // Integration tests require a live dev server — run with test:integration
  ],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
