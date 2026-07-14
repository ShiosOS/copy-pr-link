import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  bumpVersion,
  promoteUnreleased,
  setJsonVersion,
  setLockVersion,
} from "../scripts/prepare-release.mjs";

/** @param {string} file */
const readRepoFile = (file) =>
  readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

describe("bumpVersion", () => {
  it("bumps each semver level", () => {
    expect(bumpVersion("0.1.0", "patch")).toBe("0.1.1");
    expect(bumpVersion("0.1.9", "minor")).toBe("0.2.0");
    expect(bumpVersion("0.9.9", "major")).toBe("1.0.0");
    expect(bumpVersion("1.2.3", "patch")).toBe("1.2.4");
  });

  it("rejects unknown bump levels", () => {
    expect(() => bumpVersion("1.0.0", "premajor")).toThrow(
      /Unknown bump level/,
    );
    expect(() => bumpVersion("1.0.0", "")).toThrow(/Unknown bump level/);
  });

  it("rejects versions that are not plain MAJOR.MINOR.PATCH", () => {
    // Extension manifests do not allow prerelease/build suffixes.
    expect(() => bumpVersion("1.0.0-beta.1", "patch")).toThrow(
      /Unexpected current version/,
    );
    expect(() => bumpVersion("1.0", "patch")).toThrow(
      /Unexpected current version/,
    );
  });
});

describe("promoteUnreleased", () => {
  const REPO_URL = "https://github.com/o/r";
  const OPTS = {
    version: "0.2.0",
    previousVersion: "0.1.0",
    date: "2026-07-14",
    repoUrl: REPO_URL,
  };

  const CHANGELOG = `# Changelog

Intro text.

## [Unreleased]

### Added

- New thing.

## [0.1.0] - 2026-05-11

### Added

- Initial release.

[unreleased]: ${REPO_URL}/compare/v0.1.0...HEAD
[0.1.0]: ${REPO_URL}/releases/tag/v0.1.0
`;

  it("promotes the unreleased notes to a dated version section", () => {
    expect(promoteUnreleased(CHANGELOG, OPTS)).toBe(`# Changelog

Intro text.

## [Unreleased]

## [0.2.0] - 2026-07-14

### Added

- New thing.

## [0.1.0] - 2026-05-11

### Added

- Initial release.

[unreleased]: ${REPO_URL}/compare/v0.2.0...HEAD
[0.2.0]: ${REPO_URL}/compare/v0.1.0...v0.2.0
[0.1.0]: ${REPO_URL}/releases/tag/v0.1.0
`);
  });

  it("is idempotent-safe: refuses to release an empty unreleased section", () => {
    const promoted = promoteUnreleased(CHANGELOG, OPTS);
    expect(() => promoteUnreleased(promoted, OPTS)).toThrow(
      /nothing to release/,
    );
  });

  it("refuses a changelog without an unreleased section", () => {
    expect(() =>
      promoteUnreleased("# Changelog\n\n## [0.1.0] - 2026-05-11\n", OPTS),
    ).toThrow(/no '## \[Unreleased\]' section/);
  });

  it("refuses a changelog without an unreleased link reference", () => {
    const withoutLinks = CHANGELOG.replace(/^\[unreleased\]: .+\n/m, "");
    expect(() => promoteUnreleased(withoutLinks, OPTS)).toThrow(
      /no '\[unreleased\]:' link reference/,
    );
  });

  it("promotes the repository's actual changelog cleanly", () => {
    // Seed a synthetic entry so this holds even at the moment the release
    // workflow runs the suite, right after [Unreleased] has been emptied.
    const real = readRepoFile("CHANGELOG.md").replace(
      "## [Unreleased]\n",
      "## [Unreleased]\n\n### Added\n\n- Synthetic entry.\n",
    );
    const promoted = promoteUnreleased(real, OPTS);

    expect(promoted).toContain("## [Unreleased]\n\n## [0.2.0] - 2026-07-14");
    expect(promoted).toContain(
      `[unreleased]: ${REPO_URL}/compare/v0.2.0...HEAD`,
    );
    expect(promoted).toContain(`[0.2.0]: ${REPO_URL}/compare/v0.1.0...v0.2.0`);
  });
});

describe("setJsonVersion", () => {
  it("changes only the top-level version field, byte-for-byte", () => {
    const input = `{\n  "name": "x",\n  "version": "0.1.0",\n  "deps": { "version": "9.9.9" }\n}\n`;
    const output = setJsonVersion(input, "0.2.0");
    expect(output).toBe(
      `{\n  "name": "x",\n  "version": "0.2.0",\n  "deps": { "version": "9.9.9" }\n}\n`,
    );
  });

  it("updates the real package.json and manifest.json without reformatting", () => {
    for (const file of ["package.json", "manifest.json"]) {
      const input = readRepoFile(file);
      const output = setJsonVersion(input, "9.9.9");
      expect(JSON.parse(output).version).toBe("9.9.9");
      // Exactly one line may differ.
      const inputLines = input.split("\n");
      const changed = output
        .split("\n")
        .filter((line, i) => line !== inputLines[i]);
      expect(changed).toEqual([`  "version": "9.9.9",`]);
    }
  });

  it("fails loudly when the replacement doesn't take", () => {
    expect(() => setJsonVersion(`{ "name": "x" }`, "1.0.0")).toThrow(
      /Failed to update/,
    );
  });
});

describe("setLockVersion", () => {
  it("updates both of the lockfile's own version fields and nothing else", () => {
    const input = readRepoFile("package-lock.json");
    const output = setLockVersion(input, "copy-pr-link", "9.9.9");

    const lock = JSON.parse(output);
    expect(lock.version).toBe("9.9.9");
    expect(lock.packages[""].version).toBe("9.9.9");

    const inputLines = input.split("\n");
    const changed = output
      .split("\n")
      .filter((line, i) => line !== inputLines[i]);
    expect(changed).toHaveLength(2);
  });

  it("fails loudly when the expected fields are missing", () => {
    expect(() => setLockVersion("{}", "copy-pr-link", "1.0.0")).toThrow(
      /Expected 2 version fields/,
    );
  });
});
