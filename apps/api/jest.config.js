/** @type {import('ts-jest').JestConfigWithTsJest} */
// Two projects:
//   unit         — Prisma is mocked, no database needed
//   integration  — real Postgres (TEST_DATABASE_URL), migrated once per run
// Run one with:  pnpm test --selectProjects unit
const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/env.setup.ts'],
  clearMocks: true,
};

// eslint-disable-next-line no-undef
module.exports = {
  // Integration suites share one database, so files must not run in parallel.
  maxWorkers: 1,
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['<rootDir>/src/__tests__/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      globalSetup: '<rootDir>/src/__tests__/integration/globalSetup.ts',
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration/afterEnv.ts'],
    },
  ],
};
