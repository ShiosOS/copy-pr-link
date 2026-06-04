# Security Policy

## Supported versions

This is a small extension; only the latest released version receives fixes.

## Reporting a vulnerability

Please report security issues privately via GitHub's
[private vulnerability reporting](https://github.com/ShiosOS/copy-pr-link/security/advisories/new)
("Report a vulnerability" under the repository's **Security** tab) rather than
opening a public issue.

Include steps to reproduce and the affected version. We aim to acknowledge
reports within a few days.

## Scope notes

The extension requests narrow permissions (`activeTab`, `scripting`,
`clipboardWrite`, and `https://github.com/*`). It reads the active tab's URL and
title only on GitHub PR pages and writes a link to the clipboard. It makes no
network requests and collects no data.
