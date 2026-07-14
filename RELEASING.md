# Releasing

This is the maintainer's runbook for shipping a new version of Copy PR Link:
cutting the release, what the automation does, publishing to the browser
stores, and what to do when something fails.

## TL;DR

1. Make sure `CHANGELOG.md`'s `[Unreleased]` section describes what's
   shipping.
2. Go to **Actions → Prepare Release → Run workflow**, pick a bump level
   (`patch` / `minor` / `major`), and run it.
3. Done. A `vX.Y.Z` tag, GitHub Release, and zip appear automatically; store
   publishing also runs if the credentials in
   [Store publishing](#store-publishing) are configured.

## Before you release

- **The changelog is the release notes.** The `[Unreleased]` section of
  `CHANGELOG.md` becomes the new version's section, so make sure it is
  accurate and non-empty. The workflow refuses to release an empty
  `[Unreleased]` section.
- **`main` must be green.** The workflow re-runs the full check suite before
  tagging, but don't use a release to find out CI is broken.
- Pick the bump level by [SemVer](https://semver.org/): `patch` for fixes,
  `minor` for new user-facing behavior, `major` for breaking changes.

## What the automation does

Two workflows cooperate:

### 1. `Prepare Release` (`.github/workflows/release-prep.yml`)

Manually triggered (`workflow_dispatch`), refuses to run from any branch but
`main`. It runs `scripts/prepare-release.mjs`, which:

- bumps the version in `package.json`, `package-lock.json`, and
  `manifest.json` in lockstep (targeted single-field edits — no reformatting);
- promotes the changelog's `[Unreleased]` notes to a dated `## [X.Y.Z]`
  section and updates the link references at the bottom;
- fails **before touching any file** if there is nothing to release or the
  changelog is malformed.

The workflow then runs the full check suite against the bumped tree (the
manifest-consistency tests re-verify the version sync), commits
`chore(release): vX.Y.Z`, creates an annotated `vX.Y.Z` tag, and pushes the
commit and tag atomically. Finally it dispatches the Release workflow —
explicitly, because tags pushed with the workflow's own `GITHUB_TOKEN` never
fire `push` triggers (GitHub's recursion protection).

### 2. `Release` (`.github/workflows/release.yml`)

Triggered by `v*` tag pushes or by the dispatch above. It:

1. **Verifies the tag matches** the `package.json` and `manifest.json`
   versions, and fails fast on any mismatch.
2. Re-runs the full check suite and builds the zip (`npm run build`).
3. Signs the build for Firefox and uploads to the Chrome Web Store when the
   [store credentials](#store-publishing) are configured; steps without
   credentials are skipped.
4. Publishes a GitHub Release with generated notes, the zip, and (when
   signing ran) the Mozilla-signed `.xpi`.

## Manual release (fallback)

If you can't or don't want to use the workflow, the same result by hand:

```bash
node scripts/prepare-release.mjs minor   # or patch / major; prints the version
npm run check                            # verify the bumped tree
git commit -am "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "vX.Y.Z"
git push --atomic origin main vX.Y.Z
```

A tag pushed with your personal credentials fires the Release workflow by
itself — no dispatch needed. The version guard still rejects tags that don't
match the manifests.

## Store publishing

Publishing is built into the Release workflow but **off by default**: each
store's step runs only when its credentials exist as repository Actions
secrets (**GitHub → Settings → Secrets and variables → Actions**). Without
them, releases are GitHub-only.

| Secret                 | Store   | Where to get it                                  |
| ---------------------- | ------- | ------------------------------------------------ |
| `AMO_JWT_ISSUER`       | Firefox | addons.mozilla.org → Tools → Manage API Keys     |
| `AMO_JWT_SECRET`       | Firefox | same page (the "JWT secret")                     |
| `CHROME_EXTENSION_ID`  | Chrome  | Developer console, after the first manual upload |
| `CHROME_CLIENT_ID`     | Chrome  | Web Store API OAuth setup (guide linked below)   |
| `CHROME_CLIENT_SECRET` | Chrome  | Web Store API OAuth setup                        |
| `CHROME_REFRESH_TOKEN` | Chrome  | Web Store API OAuth setup                        |

### Firefox one-time setup (free)

1. Create a [Firefox Add-ons developer account](https://addons.mozilla.org/developers/).
2. Generate API credentials at
   [Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/).
3. Add the `AMO_JWT_ISSUER` and `AMO_JWT_SECRET` secrets.

From the next release on, the workflow submits the build to Mozilla for
signing and attaches the signed `.xpi` to the GitHub release — installable
permanently in regular Firefox. This uses the **unlisted** (self-hosted)
channel. To publish on addons.mozilla.org instead, create the listing there
once and switch the `web-ext sign` step in `release.yml` to
`--channel listed`.

### Chrome one-time setup (one-time $5 registration)

1. Register as a
   [Chrome Web Store developer](https://chrome.google.com/webstore/devconsole/)
   ($5, one time).
2. Create the listing **manually once** — see
   [First Chrome Web Store submission](#first-chrome-web-store-submission)
   below. Note the extension ID the console assigns.
3. Follow the
   [Chrome Web Store API guide](https://developer.chrome.com/docs/webstore/using-api)
   to create OAuth credentials (client ID, client secret, refresh token).
4. Add the four `CHROME_*` secrets.

From the next release on, the workflow uploads the new version and submits it
for review automatically. The uploaded version must be higher than the
published one, which the release flow guarantees.

## First Chrome Web Store submission

The very first listing is manual. Upload the `copy-pr-link-vX.Y.Z.zip` from
any release, then work through the console tabs. The console will warn about
`browser_specific_settings` and `background.scripts` in the manifest — that's
the Firefox half of the cross-browser config; Chrome ignores it and the
upload is accepted.

### Privacy practices tab

**Single purpose:**

> Copies the GitHub pull request open in the current tab to the clipboard as
> a rich-text hyperlink ("Pull Request 1234: Title") that pastes as a
> clickable link in Slack, email, and documents.

**Permission justifications:**

- `activeTab` — Used to read the URL and title of the currently open GitHub
  pull request tab when the user clicks the toolbar button or presses the
  keyboard shortcut, so the extension can build the link text. No tab data is
  accessed without a deliberate user action.
- `clipboardWrite` — Used to write the formatted pull request link (rich HTML
  plus plain text) to the user's clipboard. Writing to the clipboard is the
  extension's entire function.
- `scripting` — Used to inject a small self-contained function into the
  current GitHub page that performs the clipboard write. The clipboard API
  must run in the page context; the injected code copies the link and does
  nothing else.
- Host permission (`https://github.com/*`) — Used only to enable the toolbar
  button on GitHub pull request pages and gray it out everywhere else. The
  extension reads nothing from GitHub pages other than the tab's URL and
  title, and makes no network requests.

**Remote code:** select "No, I am not using remote code" — all code ships in
the package.

**Data usage:** check none of the data-collection categories (the extension
collects nothing and makes no network requests), then tick the certification
checkboxes.

### Store listing tab

- **Icon:** `icons/icon-128.png` (128×128 PNG, same artwork as the toolbar).
- **Screenshots:** at least one, 1280×800 or 640×400. Load the extension,
  open a GitHub PR, click the button so the green ✓ badge shows, screenshot.
- **Video (optional):** the console only accepts a **YouTube URL** — upload a
  screen recording to YouTube (unlisted is fine) and paste the link.
- **Category:** Developer Tools. **Language:** English.
- **Description:** summarize the README's Usage section; minimum 25
  characters.

### Settings page (account-level, one time)

Add and verify the publisher contact email — publishing is blocked until the
email-verification link is clicked, so start this first.

## Troubleshooting

- **Prepare Release fails with "nothing to release"** — the changelog's
  `[Unreleased]` section is empty. Land the changelog entries first.
- **Release fails at "Verify tag matches…"** — the tag doesn't match
  `package.json` / `manifest.json` (usually a hand-made tag on the wrong
  commit). Delete the tag, fix, re-tag.
- **`web-ext sign` fails with "version already exists"** — that version was
  already submitted to AMO (e.g. a re-run of a previous release). Cut a new
  version instead of re-running.
- **Re-running a Release for an existing tag** re-creates the GitHub Release
  assets safely, but store steps may fail as above; prefer a new patch
  release over re-runs.
- **The release commit shows no CI run on `main`** — expected: pushes made
  with the workflow's `GITHUB_TOKEN` don't trigger workflows. The identical
  tree already passed the full check inside Prepare Release.
