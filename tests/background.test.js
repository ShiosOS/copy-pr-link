// Tests for the extension-wiring layer. background.js registers chrome.*
// listeners at import time, so a mock `chrome` global is installed first and
// the module is imported fresh for each test file run. The captured listeners
// are then invoked directly to simulate browser events.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** Collects listeners registered via `addListener` so tests can fire them. */
function makeEvent() {
  /** @type {Function[]} */
  const listeners = [];
  return {
    addListener: (/** @type {Function} */ fn) => listeners.push(fn),
    /** @param {...any} args */
    fire: (...args) => Promise.all(listeners.map((fn) => fn(...args))),
  };
}

const events = {
  onInstalled: makeEvent(),
  onStartup: makeEvent(),
  onUpdated: makeEvent(),
  onActivated: makeEvent(),
  onClicked: makeEvent(),
  onCommand: makeEvent(),
};

const chromeMock = {
  runtime: {
    onInstalled: events.onInstalled,
    onStartup: events.onStartup,
  },
  tabs: {
    onUpdated: events.onUpdated,
    onActivated: events.onActivated,
    query: vi.fn(),
    get: vi.fn(),
  },
  action: {
    onClicked: events.onClicked,
    enable: vi.fn(),
    disable: vi.fn(),
    setBadgeText: vi.fn(),
    setBadgeBackgroundColor: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn(),
  },
  commands: {
    onCommand: events.onCommand,
  },
};

vi.stubGlobal("chrome", chromeMock);
await import("../background.js");

const PR_URL = "https://github.com/octocat/hello-world/pull/1234";
const PR_TITLE = "Add user auth · Pull Request #1234 · octocat/hello-world";

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  chromeMock.action.enable.mockResolvedValue(undefined);
  chromeMock.action.disable.mockResolvedValue(undefined);
  chromeMock.action.setBadgeText.mockResolvedValue(undefined);
  chromeMock.action.setBadgeBackgroundColor.mockResolvedValue(undefined);
  chromeMock.scripting.executeScript.mockResolvedValue([
    { result: { ok: true, method: "clipboard.write" } },
  ]);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("action enable/disable per tab", () => {
  it("enables the action when a tab navigates to a PR page", async () => {
    await events.onUpdated.fire(1, { url: PR_URL }, { id: 1, url: PR_URL });
    expect(chromeMock.action.enable).toHaveBeenCalledWith(1);
    expect(chromeMock.action.disable).not.toHaveBeenCalled();
  });

  it("disables the action when a tab finishes loading a non-PR page", async () => {
    const tab = { id: 2, url: "https://github.com/octocat/hello-world" };
    await events.onUpdated.fire(2, { status: "complete" }, tab);
    expect(chromeMock.action.disable).toHaveBeenCalledWith(2);
    expect(chromeMock.action.enable).not.toHaveBeenCalled();
  });

  it("ignores tab updates that change neither URL nor load status", async () => {
    await events.onUpdated.fire(3, { title: "x" }, { id: 3, url: PR_URL });
    expect(chromeMock.action.enable).not.toHaveBeenCalled();
    expect(chromeMock.action.disable).not.toHaveBeenCalled();
  });

  it("updates the action when the active tab changes", async () => {
    chromeMock.tabs.get.mockResolvedValue({ id: 4, url: PR_URL });
    await events.onActivated.fire({ tabId: 4 });
    expect(chromeMock.tabs.get).toHaveBeenCalledWith(4);
    expect(chromeMock.action.enable).toHaveBeenCalledWith(4);
  });

  it("survives the tab disappearing mid-update", async () => {
    chromeMock.tabs.get.mockRejectedValue(new Error("No tab with id"));
    await expect(events.onActivated.fire({ tabId: 5 })).resolves.not.toThrow();

    chromeMock.action.disable.mockRejectedValue(new Error("No tab with id"));
    const tab = { id: 6, url: "https://example.com" };
    await expect(
      events.onUpdated.fire(6, { url: tab.url }, tab),
    ).resolves.not.toThrow();
  });

  it("syncs every open tab on install and on browser startup", async () => {
    const tabs = [
      { id: 1, url: PR_URL },
      { id: 2, url: "https://example.com" },
      { id: undefined, url: PR_URL }, // e.g. devtools — must be skipped
    ];
    chromeMock.tabs.query.mockResolvedValue(tabs);

    await events.onInstalled.fire();
    expect(chromeMock.tabs.query).toHaveBeenCalledWith({});
    expect(chromeMock.action.enable).toHaveBeenCalledWith(1);
    expect(chromeMock.action.disable).toHaveBeenCalledWith(2);
    expect(chromeMock.action.enable).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    chromeMock.tabs.query.mockResolvedValue(tabs);
    await events.onStartup.fire();
    expect(chromeMock.action.enable).toHaveBeenCalledWith(1);
  });

  it("survives tab enumeration failing during a sync", async () => {
    chromeMock.tabs.query.mockRejectedValue(new Error("boom"));
    await expect(events.onInstalled.fire()).resolves.not.toThrow();
    expect(chromeMock.action.enable).not.toHaveBeenCalled();
  });
});

describe("copying via the toolbar action", () => {
  const tab = { id: 7, url: PR_URL, title: PR_TITLE };

  it("injects the clipboard write with the formatted link parts", async () => {
    await events.onClicked.fire(tab);

    expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
    const call = chromeMock.scripting.executeScript.mock.calls[0][0];
    expect(call.target).toEqual({ tabId: 7 });
    expect(call.args).toEqual([
      "Pull Request 1234",
      ": Add user auth",
      "https://github.com/octocat/hello-world/pull/1234",
    ]);
  });

  it("flashes a success badge when the in-page copy reports ok", async () => {
    await events.onClicked.fire(tab);

    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: "✓",
    });

    chromeMock.action.setBadgeText.mockClear();
    vi.runAllTimers();
    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: "",
    });
  });

  it("flashes a failure badge when the in-page copy reports failure", async () => {
    chromeMock.scripting.executeScript.mockResolvedValue([
      { result: { ok: false, method: "execCommand" } },
    ]);
    await events.onClicked.fire(tab);

    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: "!",
    });
  });

  it("flashes a failure badge when script injection is rejected", async () => {
    chromeMock.scripting.executeScript.mockRejectedValue(
      new Error("Cannot access contents of the page"),
    );
    await events.onClicked.fire(tab);

    expect(chromeMock.action.setBadgeText).toHaveBeenCalledWith({
      tabId: 7,
      text: "!",
    });
  });

  it("does nothing on non-PR pages", async () => {
    await events.onClicked.fire({ id: 8, url: "https://example.com" });
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
    expect(chromeMock.action.setBadgeText).not.toHaveBeenCalled();
  });

  it("does not throw if the badge cannot be set (tab closed)", async () => {
    chromeMock.action.setBadgeBackgroundColor.mockRejectedValue(
      new Error("No tab with id"),
    );
    await expect(events.onClicked.fire(tab)).resolves.not.toThrow();
  });
});

describe("copying via the keyboard command", () => {
  it("copies for the active tab on the copy-pr-link command", async () => {
    chromeMock.tabs.query.mockResolvedValue([
      { id: 9, url: PR_URL, title: PR_TITLE },
    ]);
    await events.onCommand.fire("copy-pr-link");

    expect(chromeMock.tabs.query).toHaveBeenCalledWith({
      active: true,
      currentWindow: true,
    });
    expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(1);
  });

  it("ignores other commands", async () => {
    await events.onCommand.fire("some-other-command");
    expect(chromeMock.tabs.query).not.toHaveBeenCalled();
  });

  it("does nothing when there is no active tab", async () => {
    chromeMock.tabs.query.mockResolvedValue([]);
    await events.onCommand.fire("copy-pr-link");
    expect(chromeMock.scripting.executeScript).not.toHaveBeenCalled();
  });
});
