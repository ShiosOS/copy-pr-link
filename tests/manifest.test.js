// Guards against the manifest drifting out of sync with the package metadata,
// the shipped assets, and the command wiring in background.js.

import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
/** @param {string} file */
const readJson = (file) => JSON.parse(readFileSync(join(root, file), "utf8"));

const manifest = readJson("manifest.json");
const pkg = readJson("package.json");

describe("manifest.json", () => {
  it("keeps the version in sync with package.json", () => {
    expect(manifest.version).toBe(pkg.version);
  });

  it("requests exactly the documented permissions", () => {
    expect([...manifest.permissions].sort()).toEqual([
      "activeTab",
      "clipboardWrite",
      "scripting",
    ]);
    expect(manifest.host_permissions).toEqual(["https://github.com/*"]);
  });

  it("loads the background as a cross-browser ES module", () => {
    expect(manifest.background).toEqual({
      service_worker: "background.js", // Chrome
      scripts: ["background.js"], // Firefox
      type: "module",
    });
  });

  it("declares minimum browser versions", () => {
    expect(manifest.minimum_chrome_version).toBeDefined();
    expect(
      manifest.browser_specific_settings.gecko.strict_min_version,
    ).toBeDefined();
  });

  it("ships every icon it references", () => {
    const paths = [
      ...Object.values(manifest.icons),
      ...Object.values(manifest.action.default_icon),
    ];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(existsSync(join(root, path)), `${path} should exist`).toBe(true);
    }
  });

  it("declares only commands that background.js handles", () => {
    const background = readFileSync(join(root, "background.js"), "utf8");
    const commands = Object.keys(manifest.commands);
    expect(commands).toEqual(["copy-pr-link"]);
    for (const command of commands) {
      expect(background).toContain(`"${command}"`);
    }
  });
});
