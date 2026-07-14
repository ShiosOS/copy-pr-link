# Copy PR Link

[![CI](https://github.com/ShiosOS/copy-pr-link/actions/workflows/ci.yml/badge.svg)](https://github.com/ShiosOS/copy-pr-link/actions/workflows/ci.yml)
[![CodeQL](https://github.com/ShiosOS/copy-pr-link/actions/workflows/codeql.yml/badge.svg)](https://github.com/ShiosOS/copy-pr-link/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Browser extension (Chrome 102+ and Firefox 112+) that copies a GitHub pull request as a rich-text hyperlink. Pasting in Slack, email, or any rich-text editor renders as `Pull Request 1234: Title` with only the identifier portion as a clickable link — matching Azure DevOps's "Copy" button on PR pages.

## Install from a release

### Chrome

1. Download the `copy-pr-link-vX.Y.Z.zip` asset from the [latest release](https://github.com/ShiosOS/copy-pr-link/releases/latest).
2. Unzip it somewhere permanent — Chrome loads the folder by path, so deleting or moving it breaks the extension.
3. Open `chrome://extensions/`, toggle **Developer mode** on, click **Load unpacked**, and select the unzipped folder.
4. Pin the extension to your toolbar.

New releases require redownloading the zip and reloading the extension — Chrome does not auto-update unpacked extensions.

### Firefox

If the release includes a Mozilla-signed `.xpi` asset, use that — it installs
permanently:

1. Download the `.xpi` asset from the [latest release](https://github.com/ShiosOS/copy-pr-link/releases/latest).
2. Open `about:addons`, click the gear icon → **Install Add-on From File…**, and select the `.xpi` (or drag it onto the Add-ons page).

Otherwise, load the zip temporarily:

1. Download the `copy-pr-link-vX.Y.Z.zip` asset.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and select the zip file (or `manifest.json` inside the unzipped folder).

> **Note:** Temporarily loaded add-ons are removed when Firefox restarts. For a persistent install, the extension must be signed by Mozilla or Firefox must be configured to allow unsigned extensions (see [Firefox Developer Edition / Nightly](https://extensionworkshop.com/documentation/develop/temporary-installation-in-firefox/)).

## Install (development)

### Chrome

1. Open `chrome://extensions/`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this directory.
4. Pin the extension to your toolbar.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and select `manifest.json` in this directory.
3. Pin the extension to your toolbar.

## Usage

- Navigate to any `https://github.com/<owner>/<repo>/pull/<number>` page.
- Click the toolbar icon — or press `Alt+Shift+C` — to copy.
- The icon flashes a green ✓ when the copy succeeds, or a red ! if it fails
  (e.g. the clipboard was blocked).
- On non-PR pages the icon is grayed out.
- Paste in Slack / Gmail / Notion / docs → renders as `Pull Request 1234: Title` with `Pull Request 1234` as the hyperlink.

## Customizing the keyboard shortcut

- **Chrome:** Visit `chrome://extensions/shortcuts` and rebind **Copy current PR as a rich-text link**.
- **Firefox:** Visit `about:addons`, click the gear icon → **Manage Extension Shortcuts**, and rebind the command.

## Development

Requires Node.js 22+ (see `.nvmrc`).

```bash
npm install        # install dev tooling (Vitest, ESLint, Prettier, web-ext)
npm test           # run the unit tests
npm run coverage   # run tests with coverage (100% enforced on all shipped code)
npm run lint       # ESLint
npm run lint:ext   # web-ext lint (validates the manifest for Firefox)
npm run format     # auto-format with Prettier
npm run build      # package a clean .zip into dist/
npm run check      # everything CI runs: format check + lint + web-ext lint + tests
```

`npm run build` produces `dist/copy-pr-link-v<version>.zip` containing only the
runtime files (`manifest.json`, `background.js`, `src/`, `icons/`). Load that
unpacked, or upload it to a release.

## Cutting a release

Releases are fully automated. Make sure the changelog's `[Unreleased]` section
describes what's shipping, then run the **Prepare Release** workflow
(Actions → Prepare Release → Run workflow) and pick a bump level
(patch / minor / major). The workflow will:

1. Bump `package.json`, `package-lock.json`, and `manifest.json` in lockstep
   (`scripts/prepare-release.mjs`).
2. Promote the changelog's `[Unreleased]` notes to a dated `[X.Y.Z]` section
   and update the link references.
3. Run the full check suite against the bumped tree, then commit
   `chore(release): vX.Y.Z`, tag `vX.Y.Z`, and push both atomically.
4. Trigger the **Release** workflow, which verifies the tag matches the
   manifests, rebuilds, and publishes a GitHub Release with the zip.

The workflow refuses to run from branches other than `main` and fails before
touching anything if `[Unreleased]` is empty. Pushing a `v*` tag by hand still
works — the Release workflow picks it up and its version guard rejects
mismatched tags.

## Publishing to the browser stores

Store publishing is built into the Release workflow but **off by default**:
each publish step runs only when its credentials exist as repository Actions
secrets (GitHub → Settings → Secrets and variables → Actions). Without them,
releases are GitHub-only. One-time setup:

### Firefox (free)

1. Create a [Firefox Add-ons developer account](https://addons.mozilla.org/developers/).
2. Generate API credentials at
   [Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/).
3. Add the repository secrets `AMO_JWT_ISSUER` (the "JWT issuer") and
   `AMO_JWT_SECRET` (the "JWT secret").

From the next release on, the workflow submits the build to Mozilla for
signing and attaches the signed `.xpi` to the GitHub release — installable
permanently in regular Firefox. This uses the **unlisted** (self-hosted)
channel; to publish on addons.mozilla.org instead, create the listing once and
switch the workflow's `web-ext sign` step to `--channel listed`.

### Chrome (one-time $5 registration)

1. Register as a [Chrome Web Store developer](https://chrome.google.com/webstore/devconsole/)
   (one-time $5 fee).
2. Create the listing **manually once**: upload the zip from any release in
   the developer console, fill in the listing and privacy disclosures, and
   submit for review. Note the extension ID it assigns.
3. Create OAuth credentials for the Web Store API — follow the
   [Chrome Web Store API guide](https://developer.chrome.com/docs/webstore/using-api)
   to get a client ID, client secret, and refresh token.
4. Add the repository secrets `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`,
   `CHROME_CLIENT_SECRET`, and `CHROME_REFRESH_TOKEN`.

From the next release on, the workflow uploads the new version and submits it
for Web Store review automatically. Published store versions auto-update for
users, unlike the load-unpacked zip.

## Architecture

The code is split so the logic is unit-testable in Node, separate from the
browser-only wiring:

- `src/pr.js` — **pure logic**, no browser APIs: `parsePrUrl` (URL → PR parts),
  `parsePrTitle` (document title → PR title), `formatPrLink` (PR + title → the
  link parts). Exercised by `tests/pr.test.js`.
- `src/clipboard.js` — the **in-page clipboard writer**
  (`writeRichLinkInPage`): a self-contained function that background.js
  injects into the page via `chrome.scripting.executeScript`, so it must not
  reference imports or module state. Tested under jsdom in
  `tests/clipboard.test.js`.
- `background.js` — the **extension layer**: wires up the toolbar action,
  keyboard command, and tab listeners, and injects the clipboard write into
  the page. Tested against a mocked `chrome` API in
  `tests/background.test.js`. It's loaded as an ES module
  (`"background": { "type": "module" }`), which is why the manifest requires
  Firefox 112+.

Coverage is enforced at 100% (statements, branches, functions, lines) across
all shipped code, and `tests/manifest.test.js` guards the manifest against
drifting out of sync with the package version, shipped icons, and the command
wiring.

## Files

- `manifest.json` — MV3 manifest
- `background.js` — extension entry point / service worker (action, command, and tab listeners)
- `src/pr.js` — pure, testable PR-parsing and link-formatting helpers
- `src/clipboard.js` — the self-contained clipboard writer injected into the page
- `tests/pr.test.js` — Vitest unit tests for `src/pr.js`
- `tests/clipboard.test.js` — Vitest unit tests for the clipboard writer (jsdom)
- `tests/background.test.js` — Vitest unit tests for the extension wiring, run against a mocked `chrome` API
- `tests/manifest.test.js` — manifest/package consistency checks
- `icons/icon-{16,48,128}.png` — toolbar icons
- `icons/icon.svg` — source for regenerating the PNGs (Octicons `git-pull-request`, MIT)
- `icons/LICENSE-octicons.txt` — MIT license attribution

## Permissions

- `activeTab` — read the active tab's title and URL when you click.
- `scripting` — inject the clipboard write into the page's context.
- `clipboardWrite` — write the formatted link to the clipboard.
- `https://github.com/*` — so the icon can be enabled / disabled as you navigate.

## Notes

- The clipboard write prefers `navigator.clipboard.write()` for rich HTML copy and falls back to `document.execCommand('copy')` when needed for browser compatibility.
- Slack's "Check this link" anti-phishing warning fires for rich-text anchors whose visible text contains `#`. The display format `Pull Request N` (no `#`) sidesteps the warning.
- Icon credit: GitHub Octicons (`git-pull-request`), MIT licensed. See `icons/LICENSE-octicons.txt`.

## License

[MIT](LICENSE).
