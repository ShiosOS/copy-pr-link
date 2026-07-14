// Prepares a release: bumps the version in package.json, package-lock.json,
// and manifest.json in lockstep, and promotes the changelog's [Unreleased]
// section to the new version. Run by the "Prepare Release" workflow, or
// locally:
//
//   node scripts/prepare-release.mjs <patch|minor|major>
//
// Prints the new version to stdout on success. Fails without touching any
// file when there is nothing to release or the changelog is malformed.

import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/**
 * Compute the next semver for a bump level.
 *
 * @param {string} current The current "MAJOR.MINOR.PATCH" version.
 * @param {string} level One of "patch", "minor", or "major".
 * @returns {string} The bumped version.
 */
export function bumpVersion(current, level) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(current);
  if (!match) throw new Error(`Unexpected current version: "${current}"`);
  const [major, minor, patch] = match.slice(1).map(Number);

  switch (level) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Unknown bump level: "${level}" (patch|minor|major)`);
  }
}

/**
 * Promote the [Unreleased] section of a Keep-a-Changelog document to a
 * released version: a dated heading is inserted above the unreleased notes,
 * a fresh empty [Unreleased] section is kept on top, and the link references
 * at the bottom are updated.
 *
 * @param {string} changelog The current CHANGELOG.md contents.
 * @param {{ version: string, previousVersion: string, date: string, repoUrl: string }} opts
 * @returns {string} The rewritten changelog.
 */
export function promoteUnreleased(changelog, opts) {
  const { version, previousVersion, date, repoUrl } = opts;

  const heading = /^## \[Unreleased\]\s*\n/m.exec(changelog);
  if (!heading) {
    throw new Error("CHANGELOG.md has no '## [Unreleased]' section");
  }

  const bodyStart = heading.index + heading[0].length;
  const rest = changelog.slice(bodyStart);
  const nextSection = rest.search(/^## \[|^\[unreleased\]:/m);
  const body = nextSection === -1 ? rest : rest.slice(0, nextSection);
  if (!body.trim()) {
    throw new Error("The [Unreleased] section is empty — nothing to release");
  }

  const linkRef = /^\[unreleased\]: .+$/m;
  if (!linkRef.test(changelog)) {
    throw new Error("CHANGELOG.md has no '[unreleased]:' link reference");
  }

  return (
    changelog.slice(0, bodyStart) +
    `## [${version}] - ${date}\n\n` +
    changelog.slice(bodyStart)
  ).replace(
    linkRef,
    `[unreleased]: ${repoUrl}/compare/v${version}...HEAD\n` +
      `[${version}]: ${repoUrl}/compare/v${previousVersion}...v${version}`,
  );
}

/**
 * Replace the top-level "version" field of a JSON document, preserving all
 * other formatting byte-for-byte (a JSON.parse/stringify round-trip would
 * fight Prettier over array wrapping).
 *
 * @param {string} jsonText
 * @param {string} version
 * @returns {string}
 */
export function setJsonVersion(jsonText, version) {
  // The first "version" key in package.json and manifest.json is the
  // document's own; nested ones (none today) would come later.
  const updated = jsonText.replace(
    /^(\s*"version": ")[^"]+(")/m,
    `$1${version}$2`,
  );
  if (JSON.parse(updated).version !== version) {
    throw new Error('Failed to update the top-level "version" field');
  }
  return updated;
}

/**
 * Replace both of package-lock.json's own version fields (the top level and
 * the root "" package), identified by their adjacent "name" field so the
 * hundreds of dependency versions are left untouched.
 *
 * @param {string} lockText
 * @param {string} packageName
 * @param {string} version
 * @returns {string}
 */
export function setLockVersion(lockText, packageName, version) {
  const escapedName = packageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `("name": "${escapedName}",\\n\\s*"version": ")[^"]+(")`,
    "g",
  );
  const matches = lockText.match(re);
  if (matches?.length !== 2) {
    throw new Error(
      `Expected 2 version fields for "${packageName}" in package-lock.json, ` +
        `found ${matches?.length ?? 0}`,
    );
  }
  return lockText.replace(re, `$1${version}$2`);
}

function main() {
  const level = process.argv[2];
  if (!level) {
    console.error(
      "Usage: node scripts/prepare-release.mjs <patch|minor|major>",
    );
    process.exit(1);
  }

  const pkgText = readFileSync("package.json", "utf8");
  const pkg = JSON.parse(pkgText);
  const previousVersion = pkg.version;
  const version = bumpVersion(previousVersion, level);

  // Compute every rewrite before touching any file: if something is wrong
  // (e.g. nothing to release), fail with the working tree untouched.
  const changelog = promoteUnreleased(readFileSync("CHANGELOG.md", "utf8"), {
    version,
    previousVersion,
    date: new Date().toISOString().slice(0, 10),
    repoUrl: pkg.repository.url.replace(/\.git$/, ""),
  });
  const newPkg = setJsonVersion(pkgText, version);
  const newManifest = setJsonVersion(
    readFileSync("manifest.json", "utf8"),
    version,
  );
  const newLock = setLockVersion(
    readFileSync("package-lock.json", "utf8"),
    pkg.name,
    version,
  );

  writeFileSync("package.json", newPkg);
  writeFileSync("manifest.json", newManifest);
  writeFileSync("package-lock.json", newLock);
  writeFileSync("CHANGELOG.md", changelog);

  console.log(version);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) main();
