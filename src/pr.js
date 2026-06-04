// Pure, browser-agnostic helpers for parsing GitHub pull-request pages and
// formatting the rich-text link. This module deliberately contains no
// extension, DOM, or clipboard APIs so it can be unit-tested in plain Node.

/**
 * Matches the pathname of a GitHub PR URL, capturing owner, repo, and number.
 * Tolerates trailing sub-paths such as `/files` or `/commits`.
 */
export const PR_PATH = /^\/([^/]+)\/([^/]+)\/pull\/(\d+)(?:\/|$)/;

/**
 * @typedef {Object} ParsedPr
 * @property {string} owner     Repository owner / org.
 * @property {string} repo      Repository name.
 * @property {string} number    PR number (as a string).
 * @property {string} canonical Canonical PR URL with any sub-path/query/hash stripped.
 */

/**
 * Parse a GitHub PR URL into its components.
 *
 * @param {string | null | undefined} urlString
 * @returns {ParsedPr | null} `null` if the URL is not a github.com PR page.
 */
export function parsePrUrl(urlString) {
  if (!urlString) return null;

  let url;
  try {
    url = new URL(urlString);
  } catch {
    return null;
  }

  if (url.hostname !== "github.com") return null;

  const match = url.pathname.match(PR_PATH);
  if (!match) return null;

  const [, owner, repo, number] = match;
  return {
    owner,
    repo,
    number,
    canonical: `https://github.com/${owner}/${repo}/pull/${number}`,
  };
}

/**
 * Extract the human title of a PR from the document `<title>`.
 *
 * GitHub PR pages set `<title>` to e.g.
 *   "Add user auth · Pull Request #12345 · owner/repo"
 * Sub-tabs (Files, Commits) wedge extra segments in but always keep
 * "Pull Request #N". Some pages append " by <username>" before the
 * `· Pull Request` separator — strip it.
 *
 * Falls back to the trimmed raw title when the expected pattern is absent.
 *
 * @param {string | null | undefined} documentTitle
 * @returns {string} The PR title, or "" if none could be determined.
 */
export function parsePrTitle(documentTitle) {
  if (!documentTitle) return "";
  const match = documentTitle.match(/^(.*?)\s·\sPull Request\s#\d+/);
  const raw = match ? match[1] : documentTitle;
  return raw.replace(/\s+by\s+[^\s·]+\s*$/, "").trim();
}

/**
 * @typedef {Object} RichLinkParts
 * @property {string} linkText  The hyperlinked text, e.g. "Pull Request 1234".
 * @property {string} tail      Plain-text remainder, e.g. ": Add user auth" (may be "").
 * @property {string} plainText The full plain-text form, `linkText + tail`.
 * @property {string} href      The link target (canonical PR URL).
 */

/**
 * Build the parts of the rich-text link for a parsed PR.
 *
 * Only the identifier ("Pull Request N") is hyperlinked; the title is appended
 * as plain text. The display text intentionally omits "#" — Slack's anti-phishing
 * "Check this link" warning fires for anchors whose visible text contains "#".
 *
 * @param {ParsedPr} pr
 * @param {string | null | undefined} rawTitle The document title to parse.
 * @returns {RichLinkParts}
 */
export function formatPrLink(pr, rawTitle) {
  const title = parsePrTitle(rawTitle);
  const linkText = `Pull Request ${pr.number}`;
  const tail = title ? `: ${title}` : "";
  return {
    linkText,
    tail,
    plainText: `${linkText}${tail}`,
    href: pr.canonical,
  };
}
