# Security

This document describes the security model for the builder packages and the safe defaults hosts should keep in production.

## Threat model

Builder content is untrusted input. Treat all of the following as potentially hostile:

- Pasted HTML and imported templates.
- AI-generated HTML, URLs, attributes, and CSS.
- Host-provided binding values rendered through `{@html}` or URL attributes.
- Uploaded media and remote asset URLs.
- Documents authored in the editor and later published by a different runtime.

The primary risks are stored/reflected XSS, tabnabbing, unsafe media uploads, leaking provider credentials from browser storage, and hosts accidentally granting editor capabilities they did not intend to expose.

## HTML sanitization

`@builder/security` is the shared sanitizer used by the HTML importer and the Svelte runtime. The default profile is `rich`; use `inline` for rich-text fields that should only contain phrasing content.

```ts
import { sanitizeBuilderHtml, sanitizeBuilderUrl } from '@builder/security';

const html = sanitizeBuilderHtml( untrustedHtml );
const href = sanitizeBuilderUrl( untrustedUrl );
```

The sanitizer:

- Removes `script`, `style`, `link`, `meta`, `base`, `template`, `noscript`, `object`, `embed`, `applet`, `frame`, and `frameset` elements.
- Removes `on*` event handler attributes, `srcdoc`, `formaction`, and `ping`.
- Blocks `javascript:`, `vbscript:`, `file:`, `filesystem:`, and unsafe `data:` URLs.
- Allows only `data:image/(gif|jpeg|jpg|png|webp);base64,...` for images.
- Adds `rel="noopener noreferrer"` to links that open with `target="_blank"`.
- Sanitizes `srcset` candidates and final runtime attribute maps.

The runtime sanitizes rendered HTML, URLs, and resolved node attributes by default. `trustedHtml: true` is an explicit opt-out intended only for content that has already been sanitized or is fully controlled by the host. Do not enable it for author or AI content.

```svelte
<BuilderRenderer
	project={project}
	activeDocumentId={documentId}
	trustedHtml={false}
/>
```

CSS imported from HTML has `@import`, `expression(...)`, `behavior`, `-moz-binding`, and executable `url(...)` values removed. Custom CSS should still be reviewed if it can reference host-controlled selectors or assets.

## Permissions

Editor permissions are default-deny. An omitted permission is denied, and the reason is reported back to the host:

```ts
const editor = createBuilderEditor( project );
editor.can( 'publish' ); // false
editor.getPermission( 'publish' ).reason; // This host does not allow publish.
```

Grant only the capabilities the host actually implements:

```ts
const editor = createBuilderEditor( project, {
	permissions: {
		editProject: true,
		publish: 'Publishing is limited to reviewers.',
		useAi: false,
	},
} );
```

`{ allowAll: true }` is available for trusted demos and first-party editors. Prefer an explicit permission map in production. Permission checks happen before state mutation, so denied actions should not partially update the document.

## AI credentials

The browser AI settings adapter does **not** persist API keys or secret headers by default:

```ts
const settings = createBrowserAiSettingsAdapter( defaults );
```

By default, `apiKey` is stripped and headers matching `authorization`, `api-key`, `api_key`, `token`, `secret`, or `cookie` are removed before writing to `localStorage`. Loading also ignores persisted secrets and falls back to explicitly supplied in-memory defaults.

Persisting browser-side provider keys is opt-in and should be treated as a deliberate risk:

```ts
const settings = createBrowserAiSettingsAdapter( defaults, {
	persistApiKey: true,
} );
```

For production, prefer a server-side proxy that holds provider credentials and authenticates editor requests. Use `redactAiSettings` for logs and diagnostics.

## Media uploads

The browser media adapter validates file size, MIME type, and optional image dimensions before accepting an upload:

```ts
const editor = createBuilderEditor( project, {
	permissions: { uploadMedia: true },
	media: {
		maxUploadSize: 5 * 1024 * 1024,
		allowedMimeTypes: [ 'image/png', 'image/jpeg', 'image/webp' ],
		allowSvg: false,
		minImageWidth: 320,
		minImageHeight: 200,
		maxImageWidth: 6000,
		maxImageHeight: 6000,
	},
} );
```

SVG is disabled by default because it can contain scripts and external references. Serve uploaded files from a separate origin or CDN, set a restrictive `Content-Type`, and use `Content-Disposition: attachment` for untrusted downloads. Do not trust client-reported MIME types as your only server-side validation.

## Content Security Policy

Published pages should use a strict CSP. A nonce-based example is included in `apps/embed-smoke-host`:

- `apps/embed-smoke-host/src/hooks.server.ts` generates a per-request nonce, adds it to script/style tags, and sends the CSP header.
- `apps/embed-smoke-host/src/routes/published/[documentId]/+page.server.ts` forwards the nonce to the page.
- The published page passes `nonce={data.nonce}` to `BuilderRenderer`.

Recommended baseline directives:

```text
default-src 'self';
script-src 'self' 'nonce-<nonce>';
style-src 'self' 'nonce-<nonce>';
img-src 'self' data: https:;
font-src 'self' data: https:;
connect-src 'self';
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
```

`BuilderRenderer` emits its generated stylesheet inside a `<style>` element only when `renderStylesheet` is true. Pass the request nonce so the generated stylesheet satisfies `style-src`. If your deployment requires a separate stylesheet, set `renderStylesheet={false}` and publish the compiled CSS from `compileDocumentAssets` through your own asset pipeline.

Avoid `'unsafe-inline'` for scripts. If you must use inline styles, prefer a nonce over allowing arbitrary inline CSS.

## Reporting

Please report suspected vulnerabilities privately to the maintainers rather than opening a public issue with exploit details. Include the affected package, a minimal reproduction, and the expected impact.
