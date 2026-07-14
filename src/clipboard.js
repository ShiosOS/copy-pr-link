// The in-page clipboard writer. background.js passes this function to
// chrome.scripting.executeScript({ func }), which serializes it with
// Function.prototype.toString() and re-evaluates it in the page's context.
//
// INVARIANT: the function must stay fully self-contained — no imports, no
// references to module-level state — because only its own source text is
// injected. It may use its parameters and page globals (document, navigator).

/**
 * Write a rich-text PR link to the clipboard from within the page.
 *
 * Prefers the async clipboard API for the rich HTML copy and falls back to a
 * hidden contenteditable + `document.execCommand("copy")` when the async API
 * is unavailable or blocked (e.g. the document is not focused). Only the
 * identifier is placed inside the `<a>`, so the title stays plain text.
 *
 * @param {string} linkText The hyperlinked text ("Pull Request 1234").
 * @param {string} tail Plain-text remainder (": Title"), possibly empty.
 * @param {string} href The link target.
 * @returns {Promise<{ ok: boolean, method: string }>} Whether the copy
 *   succeeded and which clipboard path was used.
 */
export async function writeRichLinkInPage(linkText, tail, href) {
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

      return { ok: true, method: "clipboard.write" };
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
    return { ok: false, method: "execCommand" };
  }
  sel.removeAllRanges();
  sel.addRange(range);

  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    // Some pages disallow execCommand entirely; report failure, don't throw.
  } finally {
    sel.removeAllRanges();
    div.remove();
  }

  return { ok, method: "execCommand" };
}
