const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;
const BADGE_COLOR = "#2ea44f";
const BADGE_DURATION_MS = 1500;

function parsePrUrl(urlString) {
  if (!urlString) return null;
  let u;
  try {
    u = new URL(urlString);
  } catch {
    return null;
  }
  if (u.hostname !== "github.com") return null;
  const m = u.pathname.match(PR_PATH);
  if (!m) return null;
  const [, owner, repo, number] = m;
  return {
    owner,
    repo,
    number,
    canonical: `https://github.com/${owner}/${repo}/pull/${number}`,
  };
}

function parsePrTitle(documentTitle) {
  // GitHub PR pages set <title> to: "Add user auth · Pull Request #12345 · owner/repo"
  // Sub-tabs (Files, Commits) wedge extra segments in but always keep "Pull Request #N".
  // Some pages append " by <username>" before the · Pull Request separator — strip it.
  const m = documentTitle.match(/^(.*?)\s·\sPull Request\s#\d+/);
  const raw = m ? m[1] : documentTitle;
  return raw.replace(/\s+by\s+[^\s·]+\s*$/, "").trim();
}

async function updateActionForTab(tab) {
  if (!tab || tab.id == null) return;
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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
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

function writeRichLinkInPage(linkText, tail, href) {
  // Runs in the page context. Uses execCommand because navigator.clipboard.write
  // can fail with "Document not focused" right after the user clicks the action button.
  // Only the identifier ("Pull Request 12345") is inside the <a>; the trailing title
  // sits in a sibling <span> so only that portion shows as a hyperlink in Slack.
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = `<a href="${escape(href)}">${escape(linkText)}</a><span>${escape(tail)}</span>`;

  const div = document.createElement("div");
  div.contentEditable = "true";
  div.style.position = "fixed";
  div.style.top = "0";
  div.style.left = "0";
  div.style.opacity = "0";
  div.style.pointerEvents = "none";
  div.innerHTML = html;
  document.body.appendChild(div);

  const range = document.createRange();
  range.selectNodeContents(div);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } finally {
    sel.removeAllRanges();
    div.remove();
  }
  return ok;
}

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

async function copyForTab(tab) {
  if (!tab) return;
  const pr = parsePrUrl(tab.url);
  if (!pr) return;

  const title = parsePrTitle(tab.title || "");
  const linkText = `Pull Request ${pr.number}`;
  const tail = `: ${title}`;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: writeRichLinkInPage,
    args: [linkText, tail, pr.canonical],
  });

  flashBadge(tab.id);
}

chrome.action.onClicked.addListener(copyForTab);

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "copy-pr-link") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) copyForTab(tab);
});
