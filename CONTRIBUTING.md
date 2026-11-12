# Contributing

Thanks for helping improve Svelte Visual Builder. This project is a pnpm workspace containing the published `@builder/*` packages and two private demo apps.

## Setup

Requirements:

- Node 22 (see `.nvmrc`); CI also validates Node 20.
- pnpm 9.12 or newer.

```sh
corepack enable
pnpm install --frozen-lockfile
```

Use `--frozen-lockfile` for reproducible installs and in CI. Update `pnpm-lock.yaml` intentionally with `pnpm install` when dependencies change.

## Local checks

Run the same checks as CI before opening a pull request:

```sh
pnpm lint
pnpm format:check
pnpm check:all
pnpm test
pnpm build:packages
pnpm audit:ci
```

Useful focused commands:

```sh
pnpm dev                 # reference studio
pnpm test:watch          # unit tests
pnpm check:packages      # publint + attw package validation
pnpm smoke:packages      # pack, install, type-check, and build a clean starter
```

Playwright end-to-end tests require browsers:

```sh
pnpm exec playwright install
pnpm test:e2e
```

## Formatting and linting

Prettier is the source of truth for formatting. Run `pnpm format` before committing. ESLint uses the flat config in `eslint.config.js` with Svelte, TypeScript, and security plugins.

## Tests

Add regression coverage for bug fixes and behavior changes. Unit and integration tests live in `packages/*/tests/` and `apps/*/tests/`. Security-sensitive changes should extend the XSS and permission suites.

## Changesets

Published packages require a changeset:

```sh
pnpm changeset
```

Pick the affected packages and the semver bump. Documentation-only or private-app changes may skip a changeset. The release workflow opens a version PR on `main`.

## Pull requests

- Keep changes focused and describe the host-facing behavior.
- Include tests and documentation updates.
- Fill in the validation checklist.
- Do not commit secrets, `.env` files, or generated build output.
- Report suspected vulnerabilities privately as described in `SECURITY.md`.

## Code style

- Follow the existing Svelte 5 runes and TypeScript conventions.
- Prefer small, deep modules with explicit public entry points.
- Keep editor-only code out of runtime entry points.
- Do not add comments unless they explain non-obvious intent.

## License

By contributing, you agree that your contributions are licensed under the MIT License.
