import { describe, it, expect } from "vitest";
import { parsePrUrl, parsePrTitle, formatPrLink } from "../src/pr.js";

describe("parsePrUrl", () => {
  it("parses a canonical PR URL", () => {
    expect(
      parsePrUrl("https://github.com/octocat/hello-world/pull/1234"),
    ).toEqual({
      owner: "octocat",
      repo: "hello-world",
      number: "1234",
      canonical: "https://github.com/octocat/hello-world/pull/1234",
    });
  });

  it("tolerates and strips PR sub-tabs (files, commits, etc.)", () => {
    for (const sub of ["files", "commits", "checks", "files/abc123"]) {
      const result = parsePrUrl(`https://github.com/o/r/pull/7/${sub}`);
      expect(result?.number).toBe("7");
      expect(result?.canonical).toBe("https://github.com/o/r/pull/7");
    }
  });

  it("strips query strings and hash fragments from the canonical URL", () => {
    expect(
      parsePrUrl("https://github.com/o/r/pull/9?diff=split#discussion")
        .canonical,
    ).toBe("https://github.com/o/r/pull/9");
  });

  it("returns null for non-github hosts", () => {
    expect(parsePrUrl("https://gitlab.com/o/r/pull/1")).toBeNull();
    expect(parsePrUrl("https://gist.github.com/o/r/pull/1")).toBeNull();
    expect(parsePrUrl("https://github.example.com/o/r/pull/1")).toBeNull();
  });

  it("returns null for github.com pages that are not PRs", () => {
    expect(parsePrUrl("https://github.com/octocat/hello-world")).toBeNull();
    expect(
      parsePrUrl("https://github.com/octocat/hello-world/issues/12"),
    ).toBeNull();
    expect(
      parsePrUrl("https://github.com/octocat/hello-world/pull/"),
    ).toBeNull();
    expect(
      parsePrUrl("https://github.com/octocat/hello-world/pull/abc"),
    ).toBeNull();
    expect(parsePrUrl("https://github.com/")).toBeNull();
  });

  it("returns null for empty, nullish, or malformed input", () => {
    expect(parsePrUrl("")).toBeNull();
    expect(parsePrUrl(null)).toBeNull();
    expect(parsePrUrl(undefined)).toBeNull();
    expect(parsePrUrl("not a url")).toBeNull();
    expect(parsePrUrl("github.com/o/r/pull/1")).toBeNull(); // no scheme
  });
});

describe("parsePrTitle", () => {
  it("extracts the title from the standard PR document title", () => {
    expect(
      parsePrTitle("Add user auth · Pull Request #12345 · owner/repo"),
    ).toBe("Add user auth");
  });

  it("strips a trailing ' by <username>' segment", () => {
    expect(
      parsePrTitle("Fix the bug by octocat · Pull Request #5 · owner/repo"),
    ).toBe("Fix the bug");
  });

  it("handles sub-tab titles that keep the 'Pull Request #N' marker", () => {
    expect(
      parsePrTitle(
        "Add user auth · Pull Request #12345 · owner/repo · Files changed",
      ),
    ).toBe("Add user auth");
  });

  it("preserves '#' that appears inside the title text itself", () => {
    expect(
      parsePrTitle("Fix issue #42 in parser · Pull Request #99 · owner/repo"),
    ).toBe("Fix issue #42 in parser");
  });

  it("falls back to the trimmed raw title when the pattern is absent", () => {
    expect(parsePrTitle("  Some unrelated page  ")).toBe("Some unrelated page");
  });

  it("returns an empty string for empty or nullish input", () => {
    expect(parsePrTitle("")).toBe("");
    expect(parsePrTitle(null)).toBe("");
    expect(parsePrTitle(undefined)).toBe("");
  });
});

describe("formatPrLink", () => {
  const pr = parsePrUrl("https://github.com/octocat/hello-world/pull/1234");

  it("builds link text, tail, plain text, and href", () => {
    expect(
      formatPrLink(
        pr,
        "Add user auth · Pull Request #1234 · octocat/hello-world",
      ),
    ).toEqual({
      linkText: "Pull Request 1234",
      tail: ": Add user auth",
      plainText: "Pull Request 1234: Add user auth",
      href: "https://github.com/octocat/hello-world/pull/1234",
    });
  });

  it("omits the tail when no title can be parsed", () => {
    const result = formatPrLink(pr, "");
    expect(result.tail).toBe("");
    expect(result.plainText).toBe("Pull Request 1234");
  });

  it("never includes '#' in the hyperlinked text (avoids Slack's phishing warning)", () => {
    const result = formatPrLink(pr, "Whatever · Pull Request #1234 · o/r");
    expect(result.linkText).not.toContain("#");
  });
});
