import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      // Everything shipped is covered: src/pr.js and src/clipboard.js are
      // tested directly (the latter under jsdom), and background.js is tested
      // against a mocked chrome API. 100% is enforced so any new branch must
      // arrive with a test.
      include: ["src/**/*.js", "background.js"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
