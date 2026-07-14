import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      // src/ is pure logic and held at 100%. background.js is the
      // extension-wiring layer: its listeners are tested against a mocked
      // chrome API (tests/background.test.js), but writeRichLinkInPage runs
      // only in a real page context (injected via chrome.scripting), so no
      // blanket threshold is enforced for it — it's validated by
      // `web-ext lint` and manual testing.
      include: ["src/**/*.js", "background.js"],
      reporter: ["text", "html"],
      thresholds: {
        "src/**/*.js": {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
});
