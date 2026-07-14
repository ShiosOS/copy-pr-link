# AGENTS.md

## Cursor Cloud specific instructions

`copy-pr-link` is a single, self-contained Chrome/Firefox WebExtension (Manifest V3) — there is
no backend, database, or long-running dev server. Node.js is used only for dev tooling
(Vitest, ESLint, Prettier, TypeScript type-check, `web-ext`). Standard commands and
architecture are documented in `README.md` and `CONTRIBUTING.md`; the npm scripts live in
`package.json`. `npm run check` runs the full CI gate (format check + lint + typecheck +
`web-ext lint` + tests) and `npm run build` packages the extension into `dist/`.

Non-obvious notes for developing/testing here:

- There is no `npm run dev` / watch server for the extension itself. To exercise it live you
  must load it into a browser. `npm run test:watch` only watches the unit tests.
- `npm run lint:ext` (`web-ext lint`) emits one benign warning:
  `MANIFEST_FIELD_UNSUPPORTED "/background/service_worker"`. That is Firefox validation
  flagging the Chrome MV3 field; it is expected and not a failure (0 errors).
- Manual end-to-end testing needs a real `github.com` PR page (the toolbar action is only
  enabled on `https://github.com/<owner>/<repo>/pull/<number>` URLs) plus network access.
  Launch Chrome with the extension loaded, e.g.:
  `google-chrome --user-data-dir=/tmp/chrome-ext-profile --load-extension=/workspace "https://github.com/<owner>/<repo>/pull/<n>"`.
  Note: the `--load-extension` flag sometimes does not register the keyboard command
  (`Alt+Shift+C`); if the shortcut appears dead, load the extension via
  `chrome://extensions` → "Load unpacked" (or just trigger the copy by clicking the
  extension entry in the puzzle-piece menu — it has no popup, so clicking it fires the copy).
- The extension writes a rich-text clipboard item (`text/html` + `text/plain`). To verify a
  copy, paste into a `contenteditable` surface; only the `Pull Request N` portion is an
  `<a>` anchor and the `: Title` remainder is plain text.
