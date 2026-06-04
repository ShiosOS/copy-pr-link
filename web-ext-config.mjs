// Shared configuration for `web-ext lint` and `web-ext build`.
// node_modules and dotfiles are ignored by web-ext automatically; this list
// adds the dev tooling, tests, and generated output so only the runtime files
// (manifest.json, background.js, src/, icons/) are linted and packaged.
const ignoreFiles = [
  "tests",
  "coverage",
  "dist",
  "*.config.js",
  "web-ext-config.mjs",
  "package.json",
  "package-lock.json",
  "*.md",
  "*.xpi",
];

export default {
  ignoreFiles,
  build: {
    overwriteDest: true,
    filename: "copy-pr-link-v{version}.zip",
  },
  lint: {
    selfHosted: true,
  },
};
