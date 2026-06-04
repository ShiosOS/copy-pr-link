# Contributing

Thanks for your interest in improving Copy PR Link! This is a small extension,
so the process is light.

## Getting set up

Requires Node.js 20+ (see `.nvmrc`).

```bash
npm install
npm run check   # format check + ESLint + tsc + web-ext lint + tests
```

## Project layout

- `src/pr.js` — pure, unit-tested logic (URL/title parsing, link formatting).
- `background.js` — the extension layer (toolbar action, command, tab
  listeners, clipboard write). Loaded as an ES module.
- `tests/` — Vitest unit tests for `src/`.

See [README.md](README.md#architecture) for more on the architecture.

## Making a change

1. Create a branch off `main`.
2. Keep the change focused. Put any new logic in `src/` so it can be tested.
3. Add or update tests — `src/` is held at 100% coverage.
4. Run `npm run check` and `npm run build` locally; both must pass.
5. Use clear commit messages. We loosely follow
   [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`,
   `fix:`, `chore:`, `docs:`, `ci:`, `refactor:`, `test:`).
6. Open a pull request. CI runs the same checks plus a build and CodeQL.

## Manual testing

Load the unpacked extension (or `npm run build` output) per the README's
development instructions, open a GitHub PR page, and confirm the toolbar icon
copies a rich-text link that pastes correctly into Slack/Gmail/docs.

## Code style

Formatting and linting are enforced by Prettier and ESLint — run
`npm run format` and `npm run lint:fix` to apply fixes automatically.
