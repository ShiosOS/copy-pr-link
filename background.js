import { parsePrUrl, formatPrLink } from "./src/pr.js";
import { writeRichLinkInPage } from "./src/clipboard.js";

const SUCCESS_BADGE = { text: "✓", color: "#2ea44f" };
const FAILURE_BADGE = { text: "!", color: "#cf222e" };
const BADGE_DURATION_MS = 1500;

/**
 * Pending badge-clear timers keyed by tab, so overlapping copies restart the
 * countdown instead of clearing a fresh badge early. Module state (and the
 * timers with it) is lost if the service worker is terminated, but Chrome
 * also clears tab-scoped badge text on navigation, so a stuck badge cannot
 * outlive the page it was flashed on.
 * @type {Map<number, ReturnType<typeof setTimeout>>}
 */
const badgeClearTimers = new Map();

/**
 * Enable the toolbar action on PR pages, disable it elsewhere.
 * @param {chrome.tabs.Tab} tab
 */
async function updateActionForTab(tab) {
  if (tab.id == null) return;
  try {
    if (parsePrUrl(tab.url)) {
      await chrome.action.enable(tab.id);
    } else {
      await chrome.action.disable(tab.id);
    }
  } catch {
    // Tab may have closed between query and update — ignore.
  }
}

/**
 * Sync the action state for every open tab. Without this, tabs that were
 * already open when the extension was installed (or when the browser
 * restarted) would keep the default-enabled action until their next
 * navigation.
 */
async function syncAllTabs() {
  try {
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map((tab) => updateActionForTab(tab)));
  } catch {
    // Tab enumeration is best-effort; per-tab listeners will catch up.
  }
}

chrome.runtime.onInstalled.addListener(syncAllTabs);
chrome.runtime.onStartup.addListener(syncAllTabs);

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    updateActionForTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await updateActionForTab(tab);
  } catch {
    // Tab may have closed before it could be inspected — ignore.
  }
});

/**
 * Briefly show a badge on the action reporting whether the copy succeeded.
 * @param {number} tabId
 * @param {boolean} ok
 */
async function flashBadge(tabId, ok) {
  const badge = ok ? SUCCESS_BADGE : FAILURE_BADGE;
  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: badge.color });
    await chrome.action.setBadgeText({ tabId, text: badge.text });
  } catch {
    return; // Tab closed before the badge could be shown.
  }

  const pending = badgeClearTimers.get(tabId);
  if (pending !== undefined) clearTimeout(pending);
  badgeClearTimers.set(
    tabId,
    setTimeout(() => {
      badgeClearTimers.delete(tabId);
      chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {
        // Tab closed before the badge could be cleared — ignore.
      });
    }, BADGE_DURATION_MS),
  );
}

/**
 * Parse the tab's PR, then inject the clipboard write and flash a badge
 * reflecting whether the copy actually succeeded.
 * @param {chrome.tabs.Tab} tab
 */
async function copyForTab(tab) {
  if (tab.id == null) return;
  const pr = parsePrUrl(tab.url);
  if (!pr) return;

  const { linkText, tail, href } = formatPrLink(pr, tab.title);

  let ok = false;
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: writeRichLinkInPage,
      args: [linkText, tail, href],
    });
    ok = injection?.result?.ok === true;
  } catch {
    // Injection can fail on restricted pages; report it via the badge.
  }

  await flashBadge(tab.id, ok);
}

chrome.action.onClicked.addListener(copyForTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-pr-link") return;
  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab) await copyForTab(tab);
  } catch {
    // No queryable active tab (e.g. only devtools focused) — nothing to copy.
  }
});
