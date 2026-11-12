import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    // Playwright scripts run in Node (page.evaluate callbacks run in the browser)
    files: ["e2e/**", "playwright.config.ts"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", document: "readonly", window: "readonly", localStorage: "readonly" },
    },
    rules: { "turbo/no-undeclared-env-vars": "off" },
  },
];
