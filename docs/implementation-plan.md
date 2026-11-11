# Implementation Plan: Production-Ready Visual CMS

> Status: Draft
> Scope: This fork, targeting a landing page, documentation, pricing page, and blog for a mobile app.
> Related: [CMS Integration Guide](cms-integration-guide.md), [SDK Embedding Guide](sdk-embedding.md), [Builder Documentation](builder-documentation.md).

## 1. Purpose

This plan turns the project assessment into a phased implementation roadmap. It prioritizes the work that unblocks adoption first, then security, production persistence, CMS features, and long-term quality.

The target end state:

- The builder installs without cloning the monorepo.
- Secure defaults are in place before untrusted authoring is possible.
- A real database, media store, auth layer, and revision system replace the in-memory demo.
- The editor supports landing, docs, pricing, and blog content end-to-end.
- CI enforces checks, tests, builds, audits, and release hygiene.

## 2. Guiding principles

- **Security before exposure.** Sanitization and default-deny permissions land before any public or untrusted authoring.
- **Small, reversible changes.** Keep PRs scoped to one phase or one concern so they remain easy to review and rebase against upstream.
- **Backward compatibility where practical.** Breaking changes require a changeset, migration notes, and an explicit escape hatch.
- **Runtime stays clean.** Published routes must never import editor packages or editor-only dependencies.
- **Every phase ships with tests and docs.** No phase is complete without CI coverage and documentation updates.

## 3. Assumptions and known constraints

- Stack: Svelte 5, SvelteKit, pnpm workspace, Node 20 or 22.
- Work happens in this fork, with upstream kept mergeable.
- Until Phase 1, workspace packages export TypeScript source and require `ssr.noExternal: [/^@builder\//]`.
- Until Phase 3, demo persistence and media are in-memory and reset on restart.
- Until Phase 2, rendered HTML and imported attributes are trusted-author content.
- `pnpm-lock.yaml` is currently ignored and must be committed in Phase 0.
- The project is pre-1.0, so minor releases may include breaking changes if documented.

## 4. Phase overview

| Phase | Focus | Effort | Depends on | Required for CMS |
| --- | --- | --- | --- | --- |
| 0 | Baseline, CI, governance | 1–2 days | — | Yes |
| 1 | Packaging and distribution | 3–5 days | 0 | Yes |
| 2 | Security hardening | 3–5 days | 1 | Yes |
| 3 | Production persistence and media | 5–8 days | 1 | Yes |
| 4 | CMS features | 8–12 days | 2, 3 | Yes |
| 5 | Performance and quality | 4–6 days | 1–4 | Recommended |
| 6 | Ecosystem | ongoing | 1–5 | Later |

For one developer, Phases 0–4 are roughly 4–6 weeks. A small team can compress this to 2–3 weeks by running Phases 1–3 in parallel.

---

## Phase 0 — Baseline and guardrails

**Goal:** reproducible installs and automated quality gates.

### Tasks

- [ ] Remove `pnpm-lock.yaml` from `.gitignore` and commit the lockfile.
- [ ] Use `pnpm install --frozen-lockfile` in CI and document it.
- [ ] Add `.nvmrc` (Node 22) and `engines` to the root `package.json`.
- [ ] Add root scripts: `check:all`, `build:packages`, `lint`, `format:check`, `audit:ci`.
- [ ] Add ESLint flat config with `eslint-plugin-svelte` and `eslint-plugin-security`.
- [ ] Add a Prettier check script and CI step.
- [ ] Add `.github/workflows/ci.yml` with a Node 20/22 matrix: install, `check:all`, test, build, audit.
- [ ] Add Dependabot or Renovate for dependency updates.
- [ ] Add Changesets (`.changeset/config.json`) and a release workflow.
- [ ] Add `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, issue/PR templates, and `CODEOWNERS`.
- [ ] Add `pnpm -r check` and fix any existing failures.

### Deliverables

- CI workflow and dependency automation.
- Root quality scripts.
- Release and governance files.
- Committed lockfile.

### Acceptance criteria

- A fresh clone installs reproducibly with `--frozen-lockfile`.
- CI is green on Node 20 and Node 22.
- `pnpm check:all` passes.
- `pnpm audit` is reviewed and any accepted risks are documented.

### Effort and dependencies

- 1–2 days.
- No dependencies.

---

## Phase 1 — Packaging and distribution

**Goal:** make the builder installable without cloning the monorepo.

### Tasks

- [x] Add a `tsconfig.build.json` per package.
- [x] Build Svelte packages (`editor-svelte`, `runtime-svelte`) with `svelte-package` into `dist/`.
- [x] Build TypeScript packages (`schema`, `core`, `plugin-api`, `adapter-sveltekit`, `elementor-import`) with `tsc` or `tsup`.
- [x] Update every `package.json` with `exports` (`types`, `svelte`, `import`), `files: ["dist", "src"]`, `sideEffects`, and `publishConfig`.
  - `src` is published because the `development` export points at source so Vite dev can use workspace source without a rebuild.
- [x] Add `prepack` scripts and a root `build:packages` script.
- [x] Add `publint` and `@arethetypeswrong/cli` validation scripts (`pnpm lint:packages`, `pnpm types:packages`, `pnpm check:packages`).
- [ ] Wire packaging validation into CI (depends on Phase 0).
- [x] Add a `create-svelte-builder` CLI with minimal, blog, docs, and pricing templates.
- [x] Add a packaging smoke test: pack every package with `pnpm pack`, install the tarballs into a temporary starter app, type-check it, and build it (`pnpm smoke:packages`).
  - `pnpm pack` is used instead of `npm pack` because it rewrites internal `workspace:*` dependencies; the smoke test fails if any tarball still contains `workspace:`.

> **Phase 1 status:** packaging, starter CLI, and smoke test are implemented. `pnpm check`, `pnpm test`, `pnpm check:packages`, and `pnpm smoke:packages` pass. `attw` runs for TypeScript-only packages; Svelte packages are covered by `publint` plus bundler resolution because TypeScript `node16` cannot resolve `.svelte` imports inside `.d.ts` files. CI wiring and Changesets remain part of Phase 0.

### Deliverables

- Built packages with type declarations and correct export maps.
- Publishable tarballs.
- Starter CLI and templates.
- Packaging validation in CI.

### Acceptance criteria

- Tarballs install and build in a clean app.
- `publint` and `attw` pass.
- `pnpm create svelte-builder` produces a working starter.
- Internal `workspace:*` dependencies are rewritten correctly on publish.

### Effort and dependencies

- 3–5 days.
- Depends on Phase 0.

---

## Phase 2 — Security hardening

**Goal:** safe defaults for HTML, permissions, AI keys, media, and CSP.

### Tasks

- [ ] Add a shared sanitizer (`isomorphic-dompurify` or `sanitize-html`) with a documented configuration.
- [ ] Sanitize on import in `packages/editor-svelte/src/lib/html-import.ts`.
- [ ] Sanitize on render in `packages/runtime-svelte/src/lib/BuilderNodeView.svelte`.
- [ ] Add an explicit `trustedHtml` opt-out for trusted content.
- [ ] Strip `on*` attributes, `javascript:` and unsafe `data:` URLs, `srcdoc`, and `formaction`.
- [ ] Add `rel="noopener noreferrer"` for links with `target="_blank"`.
- [ ] Add XSS fixture tests for headings, paragraphs, tabs, accordions, HTML fallback nodes, and imported attributes.
- [ ] Change permissions to default-deny in `packages/editor-svelte/src/lib/editor.ts`.
- [ ] Add an explicit `allowAll` escape hatch for demos and trusted internal tools.
- [ ] Update demos and docs to pass explicit permissions.
- [ ] Document and demonstrate server-side permission enforcement.
- [ ] Make browser `localStorage` AI keys opt-in in `packages/editor-svelte/src/lib/ai-core.ts`.
- [ ] Add a server-side AI proxy example and document key handling.
- [ ] Add secure media defaults: MIME allowlist, size limits, SVG reject or sanitize, dimension validation.
- [ ] Add a `renderStylesheet`/`nonce` option so published pages can avoid inline `<style>`.
- [ ] Expand `SECURITY.md` with a threat model and deployment guidance.

### Deliverables

- Sanitization layer with opt-out.
- Default-deny permissions with tests.
- Opt-in browser AI keys and server proxy example.
- Secure media defaults.
- CSP-friendly stylesheet output.
- Security documentation.

### Acceptance criteria

- XSS regression suite passes.
- Permissions are default-deny and covered by tests.
- AI keys are not persisted by default.
- A strict-CSP example renders published pages.
- Media uploads reject disallowed types and oversized files.

### Effort and dependencies

- 3–5 days.
- Depends on Phase 1. Can run in parallel with Phase 3.

---

## Phase 3 — Production persistence and media

**Goal:** replace in-memory demo storage with a real backend.

### Tasks

- [ ] Add a production adapter (new package or `apps/reference-studio/src/lib/server/production`) using Drizzle with SQLite or Postgres.
- [ ] Define schema: workspaces, users, projects, documents, revisions, media, audit log.
- [ ] Implement `BuilderHostPersistenceAdapter` with version tokens, 409 conflicts, autosave retry/backoff, publish, restore, and revision listing.
- [ ] Implement media storage: local development adapter plus S3/R2, signed URLs, metadata, and cleanup.
- [ ] Add session authentication and role-based access control.
- [ ] Enforce permissions in every endpoint, not just the editor.
- [ ] Add conflict-resolution flows and tests.
- [ ] Swap the demo to the real adapter behind an environment flag; keep in-memory for tests.
- [ ] Deploy a live demo (for example Vercel + Neon/Supabase + R2).

### Deliverables

- Production persistence adapter and migrations.
- Media adapter with local and object-storage backends.
- Auth and RBAC.
- Conflict resolution.
- Live demo deployment.

### Acceptance criteria

- Restarting preserves projects, revisions, and media.
- Concurrent saves return 409 and resolve correctly.
- Revisions restore.
- Unauthorized requests are rejected server-side.
- The live demo works end-to-end.

### Effort and dependencies

- 5–8 days.
- Depends on Phase 1.

---

## Phase 4 — CMS features

**Goal:** make the builder useful for landing, docs, pricing, and blog content.

### Tasks

- [ ] Extend the schema with SEO meta, workflow status, schedule, locale, and translations.
- [ ] Add an SEO panel and runtime `<svelte:head>` output: title, description, canonical, OG/Twitter, robots, JSON-LD.
- [ ] Add sitemap and robots generation.
- [ ] Add blog elements: post list, pagination, categories/tags, author box, related posts, TOC, reading time.
- [ ] Add docs layout, sidebar, TOC, search, and prev/next navigation.
- [ ] Add a pricing table element with monthly/yearly toggle and feature comparison.
- [ ] Add a form submission adapter plus endpoint, validation, honeypot/rate limiting, and email/webhook delivery.
- [ ] Add workflow states (draft → review → approved → published), scheduling, and roles.
- [ ] Add localization: per-document locale, hreflang, language switcher.
- [ ] Build a sample site with `/`, `/pricing`, `/docs`, `/blog`, and `/blog/[slug]`.

### Deliverables

- SEO metadata, sitemap, and JSON-LD support.
- Blog, docs, and pricing elements.
- Form submission pipeline.
- Workflow and scheduling.
- Localization support.
- End-to-end sample site.

### Acceptance criteria

- The sample site works end-to-end.
- SEO tags, sitemap, and JSON-LD validate.
- Forms submit safely and are rate-limited.
- Scheduled publishing and workflow transitions work.
- Language switching and hreflang are correct.

### Effort and dependencies

- 8–12 days.
- Depends on Phases 2 and 3.

---

## Phase 5 — Performance and quality

**Goal:** keep the editor and published pages fast and well-tested.

### Tasks

- [ ] Add bundle analysis and size budgets.
- [ ] Lazy-load AI, import, and media panels.
- [ ] Add SSG/SSR examples for published routes.
- [ ] Extract stylesheets for nonce/hash CSP.
- [ ] Add image optimization helpers: `srcset`, `loading="lazy"`, focal point.
- [ ] Add benchmarks for the `dense-200` and `dense-500` fixtures.
- [ ] Memoize the runtime model for large documents.
- [ ] Add visual regression tests with Playwright screenshots.
- [ ] Add axe accessibility tests.
- [ ] Add import fuzz and round-trip tests.
- [ ] Add schema migration fixtures.
- [ ] Add e2e coverage for save, publish, conflicts, permissions, media, and AI mock.
- [ ] Add dependency-cruiser boundaries, `knip`, and commitlint.
- [ ] Add `pnpm -r` scripts and a single `check:all` entry point.

### Deliverables

- Performance budgets and benchmarks.
- SSG/SSR and CSP examples.
- Visual, accessibility, fuzz, migration, and e2e test suites.
- Boundary and dead-code tooling.

### Acceptance criteria

- Bundle budgets, Lighthouse, and axe thresholds run in CI.
- E2E suite is green.
- Benchmarks are recorded and tracked.
- Runtime packages do not import editor packages.

### Effort and dependencies

- 4–6 days.
- Depends on Phases 1–4.

---

## Phase 6 — Ecosystem

**Goal:** broaden adoption and long-term sustainability. This phase is ongoing and should be scheduled after the CMS launch.

### Tasks

- [ ] Add a framework-agnostic runtime (web component or iframe).
- [ ] Add Astro, Next.js, and Remix adapters.
- [ ] Add dynamic-data providers for Sanity, Contentful, Strapi, WordPress, and Shopify.
- [ ] Add a visual query builder for dynamic data.
- [ ] Harden AI: provider-agnostic support, streaming, cost caps, prompt-injection defenses, and moderation.
- [ ] Add a plugin marketplace with sandboxing and versioning.
- [ ] Add community infrastructure: Discussions, hosted playground, comparison docs, public roadmap.

### Acceptance criteria

- At least one non-Svelte host can render published pages.
- Dynamic data providers have documented adapters and tests.
- AI providers can be swapped without host code changes.

---

## 5. Sequencing and effort

| Phase | Focus | Effort | Depends on |
| --- | --- | --- | --- |
| 0 | Baseline, CI, governance | 1–2 days | — |
| 1 | Packaging and distribution | 3–5 days | 0 |
| 2 | Security hardening | 3–5 days | 1 |
| 3 | Production persistence and media | 5–8 days | 1 |
| 4 | CMS features | 8–12 days | 2, 3 |
| 5 | Performance and quality | 4–6 days | 1–4 |
| 6 | Ecosystem | ongoing | 1–5 |

Recommended execution order:

1. Phase 0 immediately.
2. Phase 1 immediately after Phase 0.
3. Phases 2 and 3 in parallel.
4. Phase 4 after both 2 and 3 are complete.
5. Phase 5 continuously, with a dedicated pass before launch.
6. Phase 6 after the CMS is stable.

## 6. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Breaking changes from default-deny permissions and sanitization | Use Changesets, release with migration notes, provide `allowAll` and `trustedHtml` escape hatches. |
| Sanitization breaks existing content | Warn on save, offer a one-time migration, and log dropped attributes. |
| Packaging fails because of `workspace:*` dependencies | Test `pnpm pack`/`npm pack` tarballs in a clean app before publishing. |
| Scope creep in Phase 4 | Freeze the feature set to the four site types; defer collaboration and marketplaces. |
| Divergence from upstream | Keep patches small, rebase regularly, and isolate fork-only code behind adapters. |
| In-memory demo hides production issues | Ship Phase 3 before launch; run persistence and media tests in CI. |
| Large editor bundle | Enforce budgets in Phase 5 and lazy-load heavy panels. |
| AI key leakage | Default to a server-side proxy; make browser storage opt-in; add CSP. |

## 7. Definition of done

- A fresh clone can install, develop, build, and publish.
- Packages install from npm or tarballs.
- Security defaults are documented and covered by tests.
- Real persistence, media, and auth are wired.
- A sample landing/docs/pricing/blog site works.
- CI is green and the audit is clean or explicitly accepted.
- The live demo runs with real persistence.

## 8. Immediate next steps

1. **Phase 0 PR:** commit lockfile, add CI, quality scripts, lint, changesets, and governance files.
2. **Phase 1 PR:** add build tooling and package exports for all `@builder/*` packages.
3. **Phase 2 PR:** add the sanitizer, default-deny permissions, AI key handling, and CSP option.

## 9. File map

| Area | Primary files and packages |
| --- | --- |
| CI, governance, release | `.github/`, `.changeset/`, `package.json`, `.gitignore`, `.nvmrc`, `eslint.config.js`, `SECURITY.md`, `CONTRIBUTING.md` |
| Packaging | `packages/*/package.json`, `packages/*/tsconfig.build.json`, `packages/create-svelte-builder/` |
| Sanitization | `packages/editor-svelte/src/lib/html-import.ts`, `packages/runtime-svelte/src/lib/BuilderNodeView.svelte`, new sanitizer module |
| Permissions and AI | `packages/editor-svelte/src/lib/editor.ts`, `packages/editor-svelte/src/lib/ai-core.ts`, `packages/editor-svelte/src/lib/ai.ts` |
| Persistence and media | `apps/reference-studio/src/lib/server/`, `apps/reference-studio/prisma/schema.prisma`, new storage adapter package |
| CMS schema and elements | `packages/schema/src/index.ts`, `packages/plugin-api/src/`, `packages/runtime-svelte/src/lib/runtime.ts`, `packages/editor-svelte/src/lib/components/` |
| Demo routes and samples | `apps/reference-studio/src/routes/`, `apps/embed-smoke-host/src/routes/` |
| Tests and performance | `playwright.config.ts`, `vitest.config.ts`, `packages/*/tests/`, `apps/*/tests/` |

## 10. Tracking

- Create one milestone per phase and one issue per task group.
- Label issues with `phase-0` through `phase-6`, plus `security`, `packaging`, `cms`, `performance`, and `testing`.
- Every PR must include tests, documentation updates, and a changeset when behavior changes.
- Review progress weekly and update this document when scope changes.
