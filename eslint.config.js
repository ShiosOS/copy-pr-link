import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    // Extension code: runs in the browser / WebExtensions background context.
    files: ["background.js", "src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // Tooling and tests run under Node.
    files: [
      "tests/**/*.js",
      "*.config.js",
      "*.config.mjs",
      "web-ext-config.mjs",
    ],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  // Turn off stylistic rules that Prettier owns. Keep last.
  prettier,
];
