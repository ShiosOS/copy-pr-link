import { parsePrUrl, formatPrLink } from "./src/pr.js";

const BADGE_COLOR = "#2ea44f";
const BADGE_DURATION_MS = 1500;

/**
 * Enable the toolbar action on PR pages, disable it elsewhere.
 * @param {chrome.tabs.Tab | undefined} tab
 */
async function updateActionForTab(tab) {
  if (!tab || tab.id == null) return;
  try {
    const pr = parsePrUrl(tab.url);
    if (pr) {
      await chrome.action.enable(tab.id);
    } else {
      await chrome.action.disable(tab.id);
    }
  } catch {
    // Tab may have closed between query and update — ignore.
  }
}

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateActionForTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    updateActionForTab(tab);
  } catch {
    // Ignore.
  }
});

/**
 * Runs in the page context (injected via chrome.scripting): writes a rich-text
 * link to the clipboard. Self-contained — it cannot reference module imports.
 * @param {string} linkText The hyperlinked text ("Pull Request 1234").
 * @param {string} tail Plain-text remainder (": Title"), possibly empty.
 * @param {string} href The link target.
 */
async function writeRichLinkInPage(linkText, tail, href) {
  // Prefer async clipboard for rich HTML copy, with execCommand as fallback.
  // Only the identifier is inside the <a>, so the title stays plain text.
  const text = `${linkText}${tail}`;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.textContent = linkText;
  const span = document.createElement("span");
  span.textContent = tail;

  if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      const richContainer = document.createElement("div");
      richContainer.append(anchor.cloneNode(true), span.cloneNode(true));
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([text], { type: "text/plain" }),
          "text/html": new Blob([richContainer.innerHTML], {
            type: "text/html",
          }),
        }),
      ]);

      return {
        ok: true,
        method: "clipboard.write",
        href,
        linkText,
        tail,
        title: document.title,
        activeElement: document.activeElement?.tagName ?? null,
      };
    } catch {
      // Async clipboard can be blocked (e.g. document not focused); fall
      // through to the execCommand path below.
    }
  }

  const div = document.createElement("div");
  div.contentEditable = "true";
  div.style.position = "fixed";
  div.style.top = "0";
  div.style.left = "0";
  div.style.opacity = "0";
  div.style.pointerEvents = "none";
  div.append(anchor, span);
  document.body.appendChild(div);

  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  if (!sel) {
    div.remove();
    return {
      ok: false,
      method: "execCommand",
      href,
      linkText,
      tail,
      title: document.title,
      activeElement: document.activeElement?.tagName ?? null,
      selectionRangeCount: 0,
    };
  }
  sel.removeAllRanges();
  sel.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    sel.removeAllRanges();
    div.remove();
  }

  return {
    ok,
    method: "execCommand",
    href,
    linkText,
    tail,
    title: document.title,
    activeElement: document.activeElement?.tagName ?? null,
    selectionRangeCount: sel.rangeCount,
  };
}

/**
 * Briefly show a ✓ badge on the action to confirm the copy.
 * @param {number} tabId
 */
async function flashBadge(tabId) {
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
    await chrome.action.setBadgeText({ tabId, text: "✓" });
  } catch {
    return;
  }
  setTimeout(() => {
    chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  }, BADGE_DURATION_MS);
}

/**
 * Parse the tab's PR, then inject the clipboard write and flash the badge.
 * @param {chrome.tabs.Tab | undefined} tab
 */
async function copyForTab(tab) {
  if (!tab || tab.id == null) return;
  const pr = parsePrUrl(tab.url);
  if (!pr) return;

  const { linkText, tail, href } = formatPrLink(pr, tab.title);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: writeRichLinkInPage,
      args: [linkText, tail, href],
    });
  } catch {
    return;
  }

  flashBadge(tab.id);
}

chrome.action.onClicked.addListener(copyForTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-pr-link") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) copyForTab(tab);
});
