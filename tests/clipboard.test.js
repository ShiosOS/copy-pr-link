/**
 * @vitest-environment jsdom
 *
 * writeRichLinkInPage normally runs injected into the page via
 * chrome.scripting.executeScript; here it runs against jsdom with the
 * clipboard APIs stubbed, covering both the async-clipboard and the
 * execCommand fallback paths.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { writeRichLinkInPage } from "../src/clipboard.js";

const LINK_TEXT = "Pull Request 1234";
const TAIL = ": Add user auth";
const HREF = "https://github.com/octocat/hello-world/pull/1234";

class FakeClipboardItem {
  /** @param {Record<string, Blob>} items */
  constructor(items) {
    this.items = items;
  }
}

/** @param {(items: unknown[]) => Promise<void>} write */
function stubAsyncClipboard(write) {
  Object.defineProperty(navigator, "clipboard", {
    value: { write },
    configurable: true,
  });
  vi.stubGlobal("ClipboardItem", FakeClipboardItem);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "clipboard");
  Reflect.deleteProperty(document, "execCommand");
  document.body.innerHTML = "";
});

describe("writeRichLinkInPage — async clipboard path", () => {
  it("writes rich HTML with only the identifier hyperlinked, plus plain text", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    stubAsyncClipboard(write);

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);
    expect(result).toEqual({ ok: true, method: "clipboard.write" });

    expect(write).toHaveBeenCalledTimes(1);
    const [item] = write.mock.calls[0][0];
    expect(item).toBeInstanceOf(FakeClipboardItem);
    expect(await item.items["text/plain"].text()).toBe(`${LINK_TEXT}${TAIL}`);
    expect(await item.items["text/html"].text()).toBe(
      `<a href="${HREF}">${LINK_TEXT}</a><span>${TAIL}</span>`,
    );
  });

  it("escapes markup in the link text and tail (no HTML injection)", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    stubAsyncClipboard(write);

    await writeRichLinkInPage(LINK_TEXT, ': <img src=x onerror="pwn">', HREF);

    const [item] = write.mock.calls[0][0];
    const html = await item.items["text/html"].text();
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("falls back to execCommand when the async clipboard write is blocked", async () => {
    stubAsyncClipboard(vi.fn().mockRejectedValue(new Error("not focused")));
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: true, method: "execCommand" });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when ClipboardItem is unavailable", async () => {
    const write = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      value: { write },
      configurable: true,
    });
    document.execCommand = vi.fn().mockReturnValue(true);

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: true, method: "execCommand" });
    expect(write).not.toHaveBeenCalled();
  });
});

describe("writeRichLinkInPage — execCommand fallback path", () => {
  it("copies via a hidden selection and cleans up the DOM", async () => {
    // Snapshot the page state at copy time; asserted after the call because
    // exceptions inside execCommand are intentionally swallowed by the code.
    /** @type {{ href: string | undefined, ranges: number } | undefined} */
    let atCopyTime;
    document.execCommand = vi.fn(() => {
      // Note: jsdom doesn't reflect the contentEditable property to the
      // attribute, so query the staged div by element rather than attribute.
      const div = document.body.querySelector("div");
      atCopyTime = {
        href: div?.querySelector("a")?.getAttribute("href") ?? undefined,
        ranges: window.getSelection()?.rangeCount ?? -1,
      };
      return true;
    });

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: true, method: "execCommand" });
    expect(atCopyTime).toEqual({ href: HREF, ranges: 1 });
    expect(document.body.innerHTML).toBe("");
    expect(window.getSelection()?.rangeCount).toBe(0);
  });

  it("reports failure when execCommand returns false", async () => {
    document.execCommand = vi.fn().mockReturnValue(false);

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: false, method: "execCommand" });
    expect(document.body.innerHTML).toBe("");
  });

  it("reports failure and still cleans up when execCommand throws", async () => {
    document.execCommand = vi.fn(() => {
      throw new Error("copy is not allowed");
    });

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: false, method: "execCommand" });
    expect(document.body.innerHTML).toBe("");
    expect(window.getSelection()?.rangeCount).toBe(0);
  });

  it("reports failure when the page has no selection object", async () => {
    vi.spyOn(window, "getSelection").mockReturnValue(null);
    document.execCommand = vi.fn();

    const result = await writeRichLinkInPage(LINK_TEXT, TAIL, HREF);

    expect(result).toEqual({ ok: false, method: "execCommand" });
    expect(document.execCommand).not.toHaveBeenCalled();
    expect(document.body.innerHTML).toBe("");
  });
});
