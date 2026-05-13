import { config } from "@repo/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "turbo/no-undeclared-env-vars": "off",
      "@typescript-eslint/no-namespace": "off",
    },
  },
];
