import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Pure logic lives in src/. background.js is the extension-wiring layer:
    // it touches chrome.* / DOM at import time, so it can't be unit-tested in
    // Node — it's validated by `web-ext lint` and manual testing instead.
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
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
