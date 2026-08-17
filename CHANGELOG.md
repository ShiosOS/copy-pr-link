# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Extracted PR URL/title parsing and link formatting into a unit-tested
  `src/pr.js` module; `background.js` now loads as an ES module.
- Extracted the injected clipboard writer into `src/clipboard.js` so it can be
  unit-tested under jsdom, and hardened it to report failure instead of
  throwing when `document.execCommand` throws.
- Bumped the Firefox minimum to 112 (required for ES-module background
  scripts) and declared `minimum_chrome_version` 102.
- Development toolchain now targets Node.js 22 (Node 20 reached end of life
  in April 2026); upgraded `web-ext` to v10.
- Releases now publish to the public addons.mozilla.org listing
  (`web-ext sign --channel listed`) instead of producing a self-hosted
  unlisted `.xpi`. The GitHub Release is published before the store
  submission, so a store outage can no longer leave a tagged version with
  nothing to download.

### Removed

- Dropped the Chrome Web Store upload from the release workflow, along with
  the `chrome-webstore-upload-cli` dev dependency. The Web Store API requires
  a Google Cloud OAuth client and a refresh token that Google revokes on its
  own schedule; maintaining that costs more than the two-minute manual upload
  it replaces. `RELEASING.md` documents the manual process.

### Fixed

- The toolbar badge now reports the real outcome: a green ✓ only when the
  in-page clipboard write succeeded, and a red ! when it failed (previously a
  failed copy either showed ✓ or nothing at all).
- Copies in quick succession no longer clear a fresh badge early — the clear
  countdown is tracked per tab and restarted on each copy.
- The action's enabled/disabled state is now synced for all open tabs on
  install and browser startup, not just after the next navigation.
- The keyboard-command handler no longer surfaces an unhandled rejection when
  the active tab cannot be queried.
- Dropped a dangling `": "` suffix when a PR has no parseable title.
- Added null-safety guards around `window.getSelection()` in the clipboard
  fallback path.

### Added

- Unit tests (Vitest) with 100% coverage enforced across all shipped code:
  `src/` logic, the jsdom-tested clipboard writer, and the `background.js`
  extension wiring against a mocked `chrome` API.
- Manifest consistency tests (version sync with `package.json`, declared
  permissions, shipped icons, command wiring).
- Tooling: ESLint (recommended + stricter correctness rules), Prettier,
  EditorConfig, static type-checking via `tsc --checkJs`, and `web-ext` for
  manifest linting and packaging.
- CI (lint, type-check, test, build) and a tag-driven release workflow that
  refuses to publish when the tag, `package.json`, and `manifest.json`
  versions disagree.
- `RELEASING.md`: the maintainer's release runbook — the automated flow, the
  manual fallback, browser-store credential setup, the first-time Chrome Web
  Store submission checklist, and troubleshooting.
- One-click release automation: a "Prepare Release" workflow bumps
  `package.json`, `package-lock.json`, and `manifest.json` in lockstep,
  promotes the changelog's `[Unreleased]` section, verifies the tree, commits,
  tags, and triggers the publish (`scripts/prepare-release.mjs`, unit-tested).
- Optional store publishing in the release workflow, enabled by adding API
  credentials as Actions secrets: a Mozilla-signed `.xpi` attached to each
  GitHub release (Firefox, self-hosted channel) and automatic Chrome Web
  Store upload/publish.
- Security automation: Dependabot (grouped updates), CodeQL, SHA-pinned and
  hardened Actions.
- Community health files (Contributing, Security, Code of Conduct, issue/PR
  templates, CODEOWNERS) and an MIT license.

## [0.1.0] - 2026-05-11

### Added

- Initial release: copy a GitHub PR as a rich-text hyperlink
  (`Pull Request 1234: Title`) via the toolbar icon or `Alt+Shift+C`, with
  Chrome and Firefox support.

[unreleased]: https://github.com/ShiosOS/copy-pr-link/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ShiosOS/copy-pr-link/releases/tag/v0.1.0
