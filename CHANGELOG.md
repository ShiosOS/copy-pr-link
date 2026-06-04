# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Extracted PR URL/title parsing and link formatting into a unit-tested
  `src/pr.js` module; `background.js` now loads as an ES module.
- Bumped the Firefox minimum to 112 (required for ES-module background scripts).

### Fixed

- Dropped a dangling `": "` suffix when a PR has no parseable title.
- Added null-safety guards around `window.getSelection()` in the clipboard
  fallback path.

### Added

- Unit tests (Vitest) with 100% coverage of `src/`.
- Tooling: ESLint, Prettier, EditorConfig, static type-checking via
  `tsc --checkJs`, and `web-ext` for manifest linting and packaging.
- CI (lint, type-check, test, build) and a tag-driven release workflow.
- Security automation: Dependabot, CodeQL, SHA-pinned and hardened Actions.
- Community health files (Contributing, Security, Code of Conduct, issue/PR
  templates) and an MIT license.

## [0.1.0] - 2026-05-11

### Added

- Initial release: copy a GitHub PR as a rich-text hyperlink
  (`Pull Request 1234: Title`) via the toolbar icon or `Alt+Shift+C`, with
  Chrome and Firefox support.

[unreleased]: https://github.com/ShiosOS/copy-pr-link/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ShiosOS/copy-pr-link/releases/tag/v0.1.0
