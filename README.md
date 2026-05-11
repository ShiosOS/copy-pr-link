# Copy PR Link

Chrome extension that copies a GitHub pull request as a rich-text hyperlink. Pasting in Slack, email, or any rich-text editor renders as `Pull Request 1234: Title` with only the identifier portion as a clickable link — matching Azure DevOps's "Copy" button on PR pages.

## Install from a release

1. Download the `copy-pr-link-vX.Y.Z.zip` asset from the [latest release](https://github.com/ShiosOS/copy-pr-link/releases/latest).
2. Unzip it somewhere permanent — Chrome loads the folder by path, so deleting or moving it breaks the extension.
3. Open `chrome://extensions/`, toggle **Developer mode** on, click **Load unpacked**, and select the unzipped folder.
4. Pin the extension to your toolbar.

New releases require redownloading the zip and reloading the extension — Chrome does not auto-update unpacked extensions.

## Install (development)

1. Open `chrome://extensions/`.
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this directory.
4. Pin the extension to your toolbar.

## Usage

- Navigate to any `https://github.com/<owner>/<repo>/pull/<number>` page.
- Click the toolbar icon — or press `Alt+Shift+C` — to copy.
- The icon flashes a ✓ to confirm.
- On non-PR pages the icon is grayed out.
- Paste in Slack / Gmail / Notion / docs → renders as `Pull Request 1234: Title` with `Pull Request 1234` as the hyperlink.

## Customizing the keyboard shortcut

Visit `chrome://extensions/shortcuts` and rebind **Copy current PR as a rich-text link**.

## Files

- `manifest.json` — MV3 manifest
- `background.js` — service worker (action handler, command handler, tab listener, clipboard write)
- `icons/icon-{16,48,128}.png` — toolbar icons
- `icons/icon.svg` — source for regenerating the PNGs (Octicons `git-pull-request`, MIT)
- `icons/LICENSE-octicons.txt` — MIT license attribution

## Permissions

- `activeTab` — read the active tab's title and URL when you click.
- `scripting` — inject the clipboard write into the page's context.
- `https://github.com/*` — so the icon can be enabled / disabled as you navigate.

## Notes

- The clipboard write uses `document.execCommand('copy')` because `navigator.clipboard.write()` can fail with "Document not focused" immediately after an action-button click.
- Slack's "Check this link" anti-phishing warning fires for rich-text anchors whose visible text contains `#`. The display format `Pull Request N` (no `#`) sidesteps the warning.
- Icon credit: GitHub Octicons (`git-pull-request`), MIT licensed. See `icons/LICENSE-octicons.txt`.
