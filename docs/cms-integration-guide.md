# Svelte Visual Builder — Run & CMS Integration Guide

This guide covers:

1. What this project is and what it is not.
2. How to run the demo locally.
3. How to embed it in your own SvelteKit app.
4. How to map it to a landing page, docs, pricing page, and blog.
5. A practical safety assessment before you put it in production.

The short version: **Svelte Visual Builder is a visual editor plus a runtime renderer. It is not a complete CMS backend.** Your app owns the database, authentication, media storage, publishing, and content APIs. The builder gives you the editing experience and the published-page renderer.

---

## 1. Quick demo (already verified in this checkout)

From the repository root:

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173/
```

The demo is the `reference-studio` app. It loads a full sample project with a landing page, header/footer layouts, components, blog templates, popups, a template library, and an Elementor/HTML import demo.

What to try:

- Click a node on the canvas, then edit it in the left inspector.
- Drag elements from the left **Elements** panel onto the canvas.
- Use the **Structure** navigator to select nested nodes.
- Try **Import HTML** and **AI** in the top bar.
- Edit the page, then use **Save Draft** / **Publish** to see save state and revisions.
- Open **Menu** to see documents, assignments, components, and library items.

Important demo limitation: the reference studio stores the project and media **in memory**. Restarting the dev server resets your edits and uploads. See `apps/reference-studio/src/lib/server/studio-project.ts:13` and `apps/reference-studio/src/lib/server/media-store.ts:8`.


### If the demo returns HTTP 500 with `Unknown file extension ".ts"`

On this checkout the workspace packages are consumed as TypeScript source. Some Vite/Node combinations externalize them during SSR and Node then refuses to load `.ts`. Both demo apps now include this fix in their Vite config:

```ts
ssr: {
  noExternal: [ /^@builder\// ],
},
```

Files: `apps/reference-studio/vite.config.ts` and `apps/embed-smoke-host/vite.config.ts`. If you copy the packages into another app, add the same setting there.

### Minimal embedding demo

The `embed-smoke-host` app is the smallest production-style host. It proves package-root imports, host-owned persistence/media, permissions, an editor route, and a runtime-only published route.

```bash
pnpm --filter @builder/embed-smoke-host dev
```

Open:

```text
http://localhost:5175/                      # editor
http://localhost:5175/published/embed-home  # published runtime
```

It also supports permission-denial testing:

```text
http://localhost:5175/?deny=publish,media,ai
```

---

## 2. What this project actually is

```text
apps/
  reference-studio     Full demo/editor development app
  embed-smoke-host     Minimal host integration fixture

packages/
  schema               Project/document/node/style/media/revision schemas
  core                 Editor engine: commands, history, selection, drag/drop
  plugin-api           Element registry, controls, host adapters, defaults
  runtime-svelte       Published renderer + CSS compiler
  editor-svelte        Editor UI, controller, imports, AI, media, SDK helpers
  elementor-import     Elementor JSON conversion
  adapter-sveltekit    SvelteKit binding, condition, and integration helpers
```

The builder is **host-first**:

| Builder provides | Your host app provides |
| --- | --- |
| Visual editor shell and canvas | Database and project storage |
| Typed JSON project model | Autosave, draft, publish, revisions |
| Runtime renderer for published pages | Authentication and authorization |
| HTML/Elementor/template import | Media upload/storage/CDN URLs |
| AI create/edit workflow | AI provider settings and API keys |
| Dynamic binding definitions | Route/load/session/site/collection data |
| Custom element API | Server-side permission enforcement |

### It is not on npm

`@builder/*` packages are **not published to npm** (the registry returns 404). The supported consumption path is the pnpm workspace in this repository. You either:

- add your app inside this monorepo under `apps/`, or
- vendor the packages into your own pnpm workspace.

You cannot currently run `npm install @builder/editor-svelte` from the public registry.

---

## 3. Prerequisites

- Node.js 20 or 22 (verified with Node 22.14).
- pnpm 9.12.0 (the repo declares `packageManager: pnpm@9.12.0`).
- A SvelteKit app using Svelte 5.
- A database and object storage of your choice for production.

On Windows, if `npm.ps1` is blocked by the execution policy, use `pnpm` directly. The repository is designed around pnpm.

---

## 4. Run the demo

```bash
# install once
pnpm install

# full demo/editor
pnpm dev

# checks and tests
pnpm check
pnpm test
pnpm test:e2e

# production-style embedding gate
pnpm embed:validate
```

`pnpm test:e2e` needs Playwright browsers installed. If they are missing:

```bash
pnpm exec playwright install
```

---

## 5. Embedding in your SvelteKit app

### 5.1 Recommended workspace layout

Because the packages export TypeScript source, keep them in the same pnpm workspace as your app:

```text
your-repo/
  apps/
    marketing/                 <- your SvelteKit app
  packages/                    <- copied from this repo
  pnpm-workspace.yaml
```

In `apps/marketing/package.json`:

```json
{
  "dependencies": {
    "@builder/adapter-sveltekit": "workspace:*",
    "@builder/editor-svelte": "workspace:*",
    "@builder/plugin-api": "workspace:*",
    "@builder/runtime-svelte": "workspace:*",
    "@builder/schema": "workspace:*",
    "svelte": "^5.38.7"
  }
}
```

In your Vite config:

```ts
export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: [/^@builder\//],
  },
});
```

### 5.2 Public imports only

Always import from package roots:

```ts
import { BuilderCanvas, createBuilderHostSdk } from '@builder/editor-svelte';
import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';
import { createSvelteKitBuilderIntegration } from '@builder/adapter-sveltekit';
import { createBuilderHostAdapter } from '@builder/plugin-api';
import { parseBuilderPackage } from '@builder/schema';
```

Do **not** import internal paths like `@builder/editor-svelte/src/lib/...`.

### 5.3 Editor route

Create an admin-only route, for example `src/routes/admin/builder/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import type { BuilderPackage } from '@builder/schema';

  export let data: { projectId: string; project: BuilderPackage };

  let canvasComponent: any;
  let editor: any;
  let ready = false;

  onMount(async () => {
    // Defer the heavy editor bundle so public routes stay light.
    const { BuilderCanvas, createBuilderHostSdk } = await import('@builder/editor-svelte');
    const { createSvelteKitBuilderIntegration } = await import('@builder/adapter-sveltekit');

    canvasComponent = BuilderCanvas;

    const integration = createSvelteKitBuilderIntegration({
      previewContext: {
        siteData: { title: 'My App' },
        session: { role: 'admin' },
      },
      permissions: {
        editProject: true,
        publish: true,
        uploadMedia: true,
        deleteMedia: true,
        useAi: false,
        accessDynamicData: true,
      },
      persistence: {
        loadProject: async () => {
          const response = await fetch(`/api/projects/${data.projectId}`);
          return (await response.json()).project;
        },
        saveAutosave: (project, context) => saveProject(project, context, 'autosave'),
        saveDraft: (project, context) => saveProject(project, context, 'draft'),
        publish: (project, context) => saveProject(project, context, 'publish'),
        restoreRevision: async (revisionId) => {
          const response = await fetch(`/api/projects/${data.projectId}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ restoreRevisionId: revisionId }),
          });
          return (await response.json()).project;
        },
        listRevisions: async () => {
          const response = await fetch(`/api/projects/${data.projectId}?include=revisions`);
          return (await response.json()).revisions ?? [];
        },
        getSaveStatus: async () => {
          const response = await fetch(`/api/projects/${data.projectId}`);
          return (await response.json()).status;
        },
      },
      media: {
        listAssets: async () => {
          const response = await fetch(`/api/projects/${data.projectId}/media`);
          return (await response.json()).assets ?? [];
        },
        uploadAsset: async (file) => {
          const form = new FormData();
          form.set('file', file);
          const response = await fetch(`/api/projects/${data.projectId}/media`, {
            method: 'POST',
            body: form,
          });
          return (await response.json()).asset;
        },
        deleteAsset: async (assetId) => {
          await fetch(`/api/projects/${data.projectId}/media`, {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ assetId }),
          });
        },
        resolveAssetUrl: (asset) => (typeof asset === 'string' ? asset : asset.url),
      },
    });

    const sdk = createBuilderHostSdk({
      adapter: integration.adapter,
      persistence: integration.editor.persistence.host,
      media: integration.editor.media.adapter,
      permissions: integration.editor.permissions,
      previewContext: integration.editor.adapter.previewContext,
    });

    editor = sdk.createEditor(data.project, {
      initialState: {
        activeDocumentId: data.project.documents[0]?.id,
      },
    });

    ready = true;
  });

  async function saveProject(project: BuilderPackage, context: any, reason: string) {
    const response = await fetch(`/api/projects/${data.projectId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        project,
        reason,
        expectedVersionToken: context?.expectedVersionToken,
        force: context?.force === true,
        revisionId: context?.revisionId,
        revisionKind: context?.revisionKind,
      }),
    });
    return response.json();
  }
</script>

{#if ready}
  <svelte:component this={canvasComponent} {editor} />
{:else}
  <p>Loading builder…</p>
{/if}
```

The editor route should be protected by your admin auth. The builder UI permissions are only a UX layer; enforce the same rules on the server.

### 5.4 Persistence endpoint

Use `parseBuilderPackage` for every incoming project. It validates and migrates stored JSON.

```ts
// src/routes/api/projects/[projectId]/+server.ts
import { json } from '@sveltejs/kit';
import { parseBuilderPackage } from '@builder/schema';
import { db } from '$lib/server/db';

export const GET = async ({ params }) => {
  const row = await db.project.findUnique({ where: { id: params.projectId } });
  if (!row) return json({ error: 'Not found' }, { status: 404 });

  return json({
    project: parseBuilderPackage(row.projectJson),
    status: {
      state: 'saved',
      versionToken: row.versionToken,
      updatedAt: row.updatedAt,
    },
  });
};

export const POST = async ({ params, request, locals }) => {
  if (!locals.user?.canEditContent) {
    return json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const project = parseBuilderPackage(body.project);

  // Compare body.expectedVersionToken with the stored token and return 409 on conflict.
  // Save the project plus a revision row for draft/autosave/publish.
  // Return { ok: true, versionToken, updatedAt }.
};
```

Minimum production tables:

- `projects` — `id`, `name`, `projectJson`, `versionToken`, `updatedAt`
- `documents` — optional normalized copy for querying by slug/status
- `revisions` — `id`, `projectId`, `documentId`, `kind`, `label`, `snapshot`, `createdAt`
- `media` — `id`, `projectId`, `storageKey`, `publicUrl`, `mimeType`, `size`, `metadata`

The reference Prisma schema is at `apps/reference-studio/prisma/schema.prisma`, but the demo does **not** wire it up. Treat it as a starting point, not a finished backend.

### 5.5 Published runtime route

Published routes must import **only** `@builder/runtime-svelte`, never `@builder/editor-svelte`.

```svelte
<!-- src/routes/[...slug]/+page.svelte -->
<script lang="ts">
  import { createSvelteKitBuilderAdapter } from '@builder/adapter-sveltekit';
  import { BuilderRenderer, renderPublishedDocument } from '@builder/runtime-svelte';
  import type { BuilderPackage } from '@builder/schema';

  export let data: {
    project: BuilderPackage;
    documentId: string;
    bindingContext: any;
  };

  const model = renderPublishedDocument({
    project: data.project,
    documentId: data.documentId,
    adapter: createSvelteKitBuilderAdapter(),
    dynamicContext: data.bindingContext,
    media: {
      resolveAssetUrl: (asset) =>
        typeof asset === 'object' && asset && 'url' in asset ? String(asset.url) : undefined,
    },
    cssIsolation: { rootSelector: '.published-page' },
  });
</script>

<main class="published-page">
  <BuilderRenderer
    project={model.project}
    activeDocumentId={data.documentId}
    adapter={model.adapter}
    bindingContext={model.bindingContext}
    media={model.media}
  />
</main>
```

In `+page.server.ts`, load the project, resolve the published document by slug/assignment, and pass route/load/collection data as `bindingContext`.

---

## 6. Mapping your site to the builder

### 6.1 Documents

Create one `BuilderDocument` per editable surface:

| Your page | Document kind | Suggested slug | Assignment path |
| --- | --- | --- | --- |
| Landing page | `page` | `home` | `/` |
| Pricing | `page` | `pricing` | `/pricing` |
| Documentation index | `page` | `docs` | `/docs` |
| Documentation article | `page` or `template` | `docs-getting-started` | `/docs/getting-started` |
| Blog archive | `page` | `blog` | `/blog` |
| Single blog post | `template` | `single-post` | `/blog/[...slug]` |
| Header | `layout` | `global-header` | header slot, `/*` |
| Footer | `layout` | `global-footer` | footer slot, `/*` |

Assignments are stored in `project.themeAssignments` and decide which document renders for a route and slot. Slots include `page`, `header`, `footer`, `sidebar`, `popup`, `modal`, `loop-item`, and `empty`.

### 6.2 Blog

The demo already shows the pattern:

- A **blog archive page** at `/blog` containing a `loop` node whose collection is `posts`.
- A **single post template** assigned to `/blog/[...slug]` with bindings such as `load.post.title`, `load.post.featuredImage`, `load.post.excerpt`, and `load.post.metaText`.
- A **loop item template** and an **empty state template** assigned to the `loop-item` and `empty` slots.

In your runtime loader, provide the data:

```ts
return {
  project,
  documentId,
  bindingContext: {
    loadData: { post: { title, excerpt, featuredImage, metaText } },
    record: post,
    collections: {
      posts: await getPublishedPosts(),
    },
    routeParams: { slug },
    siteData: { title: 'My App' },
    session: { role: 'visitor' },
  },
};
```

The builder does not create, store, or query blog posts. Your host app does that. The builder binds to the data you pass in.

### 6.3 Documentation

Two workable approaches:

1. **One document per article** — simplest for editing and SEO. Create `page` documents such as `/docs/installation`, `/docs/api`, `/docs/billing`.
2. **One template plus dynamic data** — create a `template` at `/docs/[...slug]` and bind headings, body, and navigation to `load.doc` and `collections.docs`.

For a mobile app docs site, one document per article is usually easier to reason about. Add a shared `layout` for the docs sidebar and header.

### 6.4 Pricing and landing

Both are normal `page` documents. Use dynamic bindings if you want prices or plan names to come from your product API:

- bind plan name to `load.plans[0].name`
- bind price to `load.plans[0].price`
- bind CTA URL to `load.plans[0].ctaUrl`

If pricing changes often, bind it. If it changes rarely, author it directly.

---

## 7. Permissions and auth

Permission keys:

```ts
permissions: {
  editProject: true,
  publish: true,
  uploadMedia: true,
  deleteMedia: true,
  useAi: true,
  accessDynamicData: true,
}
```

Values may be `true`, `false`, a denial reason string, or `{ allowed, reason }`.

**Missing permissions are treated as allowed for backward compatibility.** That is convenient for a demo and dangerous in production. Always:

- protect the editor route with your auth middleware,
- enforce permissions again in every persistence/media endpoint,
- scope every project/media query to the current user or workspace,
- never trust a `projectId` from the client without an ownership check.

---

## 8. Safety assessment

This is a source-level assessment of version `0.2.8` in this checkout.

### 8.1 License and provenance — good

- **MIT licensed.** Commercial use, modification, and distribution are allowed with the license notice. See `LICENSE`.
- The local clone has `upstream` set to `https://github.com/BluePointDigital/svelte-visual-builder`.
- The upstream repository is public, MIT licensed, with **36 stars, 5 forks, 18 commits, and 1 open issue** at the time of writing.

### 8.2 Maturity — early-stage, pre-1.0

- Version `0.2.8`. The changelog explicitly allows breaking schema, SDK, runtime, and adapter changes in `MAJOR` releases.
- Small community and short history. Expect API churn and limited third-party support.
- No published npm packages, so you consume source from a fork/workspace.
- No `SECURITY.md` or documented vulnerability disclosure process.

**Implication:** budget for maintenance. Pin a commit, keep a fork, and read the changelog before upgrading.

### 8.3 Network and telemetry — clean by default

- I found no analytics, telemetry, beacons, WebSockets, or phone-home calls in the packages.
- The only outbound `fetch` in the packages is the AI request to the endpoint you configure: `packages/editor-svelte/src/lib/ai.ts:319`.
- AI prompts and page content are sent to whatever OpenAI-compatible provider you configure. Treat that as a data-sharing decision.

### 8.4 AI API keys — browser storage risk

The built-in browser settings adapter stores AI settings, including the API key, in `localStorage`:

- `packages/editor-svelte/src/lib/ai-core.ts:140` (`createBrowserAiSettingsAdapter`)
- `packages/editor-svelte/src/lib/ai-core.ts:156` (`saveSettings`)

`localStorage` is readable by any script on the same origin. If an XSS bug exists, the key can be stolen.

Recommendations:

- Use a host-provided `aiSettings` adapter backed by your server.
- Proxy AI calls through your backend and keep long-lived keys server-side.
- Use short-lived/scoped keys if the browser must call the provider directly.
- Disable AI (`useAi: false`) until you need it.

### 8.5 Stored HTML / XSS — the most important risk

The runtime intentionally renders authored HTML as HTML:

- Headings, paragraphs, text editors, HTML/SVG nodes use `{@html ...}`: `packages/runtime-svelte/src/lib/BuilderNodeView.svelte:391`, `:399`, `:407`, `:470`.
- Tab and accordion bodies use `{@html item.content}` / `{@html item.body}`: `BuilderNodeView.svelte:575`, `:601`.
- `renderPlainText` does **not** escape: `BuilderNodeView.svelte:197`.
- Node attributes are spread onto rendered elements: `BuilderNodeView.svelte:177` and `:236`.

The HTML importer drops `script`, `noscript`, `template`, `style`, `link`, `meta`, and `title` tags (`packages/editor-svelte/src/lib/html-import.ts:20`, `:117`), but it preserves other attributes (`html-import.ts:291`). That means imported HTML can carry inline event handlers or `javascript:` URLs as attributes, and the runtime will render them.

This is acceptable **only if authoring and importing are trusted admin actions**. It is not safe for untrusted public authors or arbitrary pasted HTML.

Hardening recommendations:

- Restrict the editor and import flows to trusted admins.
- Sanitize authored/imported HTML with a library such as DOMPurify before storing or before runtime rendering.
- Add a strict Content Security Policy. A CSP with `script-src 'self'` and no `unsafe-inline` blocks most inline-handler attacks.
- Do not render builder output on the same origin as sensitive session cookies if content can be untrusted.
- Treat AI-generated HTML as untrusted input. The live AI preview is sandboxed in an iframe (`BuilderCanvas.svelte:1386`, `BuilderPreview.svelte:396`), but committed AI output still goes through the importer and becomes normal nodes.

### 8.6 Dependencies and audit

`pnpm audit --prod` in this checkout reported **1 high and 4 low**:

- **High:** `deepmerge-ts < 8.0.0`, reached through `@prisma/client` → `prisma` → `@prisma/config` in the reference studio. This is Prisma tooling, not the builder runtime. The demo does not use Prisma at runtime.
- **Low:** `cookie < 0.7.0` and two `@sveltejs/kit` advisories reached through `bits-ui`/`runed`/`svelte-toolbelt`.
- **Low:** `deepmerge` prototype poisoning, reached through build tooling.

Recommendations:

- If you use Prisma, upgrade to a version that pulls `deepmerge-ts >= 8.0.0`.
- Keep SvelteKit and transitive dependencies updated.
- Run `pnpm audit` in CI.
- Review the editor dependency set (TipTap, dnd-kit, bits-ui, floating-ui, paneforge, tanstack virtual). It is a normal rich-editor stack, but it is a large surface.

### 8.7 Reproducible installs — lockfile is ignored

`.gitignore:9` ignores `pnpm-lock.yaml` (and `package-lock.json` is ignored too). A local lockfile exists, but it is not committed. That means fresh clones can resolve different dependency versions.

Recommendation: commit your own lockfile in your fork and install with `--frozen-lockfile` in CI.

### 8.8 Demo persistence is not production persistence

- Reference studio: in-memory project and media (`apps/reference-studio/src/lib/server/studio-project.ts:13`, `media-store.ts:8`).
- Embed smoke host: in-memory project, revisions, and media (`apps/embed-smoke-host/src/lib/server/host-store.ts:27`).

Restarting loses content. You must implement real persistence and object storage.

### 8.9 Overall verdict

**Safe to prototype with today. Reasonable for an internal or trusted-admin CMS after hardening. Not yet a drop-in production CMS for untrusted public authors.**

Use it if:

- editors are trusted admins,
- you control imported HTML and AI output,
- you implement persistence, media, auth, and server-side authorization,
- you add CSP and HTML sanitization,
- you are comfortable maintaining a young pre-1.0 codebase.

Do not use it as-is if:

- anonymous or untrusted users can author or import HTML,
- you need a managed CMS with a supported security process,
- you cannot vendor/fork and maintain the source.

---

## 9. Production checklist

- [ ] Add your SvelteKit app to the pnpm workspace and use `workspace:*` dependencies.
- [ ] Add `ssr.noExternal: [/^@builder\//]` to your Vite config.
- [ ] Import only from package roots.
- [ ] Use `parseBuilderPackage` on all stored and incoming project JSON.
- [ ] Implement persistence with optimistic concurrency (`versionToken`) and revisions.
- [ ] Implement media upload/storage/CDN and `resolveAssetUrl`.
- [ ] Enforce auth and permissions on every server endpoint, not just in the UI.
- [ ] Scope projects and media to the current user/workspace.
- [ ] Sanitize authored/imported HTML or restrict authoring to trusted admins.
- [ ] Add a strict Content Security Policy.
- [ ] Keep AI keys server-side or use short-lived browser keys; consider disabling AI initially.
- [ ] Keep editor packages out of published/runtime routes.
- [ ] Verify runtime routes do not load editor chunks.
- [ ] Commit a lockfile and install with `--frozen-lockfile` in CI.
- [ ] Run `pnpm check`, `pnpm test`, `pnpm embed:validate`, and `pnpm audit` in CI.
- [ ] Pin the upstream commit and track upstream changes.
- [ ] Add monitoring for save/publish errors and media failures.

---

## 10. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Unknown file extension ".ts"` / HTTP 500 on SSR | Add `ssr.noExternal: [/^@builder\//]` to your Vite config. |
| Editor opens with no document | The project must contain at least one document and `activeDocumentId` must exist. |
| Runtime route loads editor code | The published route imported `@builder/editor-svelte`. Use `@builder/runtime-svelte` only. |
| Dynamic values are blank | Check the binding source/path and the `bindingContext` (`loadData`, `record`, `collections`). |
| Media URLs are broken | Implement `resolveAssetUrl` in the editor and runtime media adapters. |
| Publish button hidden or blocked | Check `permissions.publish` and server-side authorization. |
| AI create fails | Check `useAi`, the AI settings adapter, base URL, API key, model, and debug transcript. |
| HTML import rejects input | It needs non-empty HTML and a browser `DOMParser`. |
| Elementor import shows compatibility widgets | Unsupported widgets are intentionally preserved as `compat-widget` nodes with diagnostics. |
| Save conflict | Handle the 409 and choose `reload`, `overwrite`, or `keep-local`. |
| Demo edits disappear after restart | The demo uses in-memory storage. Implement real persistence. |
| Playwright E2E cannot start | Run `pnpm exec playwright install`. |

---

## 11. Command cheat sheet

```bash
# install
pnpm install

# full demo at http://localhost:5173
pnpm dev

# minimal embedding demo at http://localhost:5175
pnpm --filter @builder/embed-smoke-host dev

# quality gates
pnpm check
pnpm test
pnpm test:e2e
pnpm embed:validate
pnpm audit

# install Playwright browsers if needed
pnpm exec playwright install
```

---

## 12. Reference documents

- `README.md` — project overview and scripts.
- `docs/builder-documentation.md` — full architecture, schema, SDK, runtime, imports, AI, extensions, troubleshooting.
- `docs/sdk-embedding.md` — focused embedding guide.
- `apps/embed-smoke-host` — working minimal host integration.
- `apps/reference-studio` — full demo and development studio.
