# Copy PR Link

Browser extension (Chrome and Firefox) that copies a GitHub pull request as a rich-text hyperlink. Pasting in Slack, email, or any rich-text editor renders as `Pull Request 1234: Title` with only the identifier portion as a clickable link — matching Azure DevOps's "Copy" button on PR pages.

## Install from a release

### Chrome

1. Download the `copy-pr-link-vX.Y.Z.zip` asset from the [latest release](https://github.com/ShiosOS/copy-pr-link/releases/latest).
2. Unzip it somewhere permanent — Chrome loads the folder by path, so deleting or moving it breaks the extension.
3. Open `chrome://extensions/`, toggle **Developer mode** on, click **Load unpacked**, and select the unzipped folder.
4. Pin the extension to your toolbar.

New releases require redownloading the zip and reloading the extension — Chrome does not auto-update unpacked extensions.

### Firefox

1. Download the `copy-pr-link-vX.Y.Z.zip` asset from the [latest release](https://github.com/ShiosOS/copy-pr-link/releases/latest).
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
- The icon flashes a ✓ to confirm.
- On non-PR pages the icon is grayed out.
- Paste in Slack / Gmail / Notion / docs → renders as `Pull Request 1234: Title` with `Pull Request 1234` as the hyperlink.

## Customizing the keyboard shortcut

- **Chrome:** Visit `chrome://extensions/shortcuts` and rebind **Copy current PR as a rich-text link**.
- **Firefox:** Visit `about:addons`, click the gear icon → **Manage Extension Shortcuts**, and rebind the command.

## Files

- `manifest.json` — MV3 manifest
- `background.js` — background script / service worker (action handler, command handler, tab listener, clipboard write)
- `icons/icon-{16,48,128}.png` — toolbar icons
- `icons/icon.svg` — source for regenerating the PNGs (Octicons `git-pull-request`, MIT)
- `icons/LICENSE-octicons.txt` — MIT license attribution

## Permissions

- `activeTab` — read the active tab's title and URL when you click.
- `scripting` — inject the clipboard write into the page's context.
- `https://github.com/*` — so the icon can be enabled / disabled as you navigate.

## Notes

- The clipboard write prefers `navigator.clipboard.write()` for rich HTML copy and falls back to `document.execCommand('copy')` when needed for browser compatibility.
- Slack's "Check this link" anti-phishing warning fires for rich-text anchors whose visible text contains `#`. The display format `Pull Request N` (no `#`) sidesteps the warning.
- Icon credit: GitHub Octicons (`git-pull-request`), MIT licensed. See `icons/LICENSE-octicons.txt`.
