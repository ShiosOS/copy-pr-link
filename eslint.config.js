import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: ["dist/**", "coverage/**", "node_modules/**"],
  },
  js.configs.recommended,
  {
    // Stricter correctness rules on top of eslint:recommended.
    rules: {
      eqeqeq: ["error", "smart"],
      "no-var": "error",
      "prefer-const": "error",
      "no-console": "error",
      "object-shorthand": ["error", "always"],
      "no-implicit-coercion": "error",
      "prefer-promise-reject-errors": "error",
    },
  },
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
  {
    // Maintenance scripts are Node CLIs and may write to stdout/stderr.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    // The clipboard tests run under jsdom (see @vitest-environment docblock).
    files: ["tests/clipboard.test.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  // Turn off stylistic rules that Prettier owns. Keep last.
  prettier,
];
