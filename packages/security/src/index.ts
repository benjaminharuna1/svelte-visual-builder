import DOMPurify, { type Config, type ElementHook, type UponSanitizeAttributeHookEvent } from 'isomorphic-dompurify';

export type BuilderHtmlSanitizeProfile = 'inline' | 'rich' | 'svg';

export interface BuilderHtmlSanitizeOptions {
	profile?: BuilderHtmlSanitizeProfile;
	allowSvg?: boolean;
	allowDataImages?: boolean;
	allowStyleAttributes?: boolean;
	trusted?: boolean;
}

export interface BuilderUrlSanitizeOptions {
	allowDataImages?: boolean;
	allowRelative?: boolean;
}

const INLINE_TAGS = [
	'a',
	'abbr',
	'b',
	'br',
	'cite',
	'code',
	'em',
	'i',
	'mark',
	'small',
	'span',
	'strong',
	'sub',
	'sup',
	'u',
];

const FORBIDDEN_TAGS = [
	'applet',
	'base',
	'embed',
	'frame',
	'frameset',
	'link',
	'meta',
	'noscript',
	'object',
	'script',
	'style',
	'template',
];

const FORBIDDEN_ATTRIBUTES = new Set(['formaction', 'ping', 'srcdoc']);
const URL_ATTRIBUTES = new Set(['action', 'cite', 'data', 'href', 'poster', 'src', 'xlink:href']);
const SAFE_URL_PROTOCOLS = new Set(['blob:', 'http:', 'https:', 'mailto:', 'tel:']);
const SAFE_DATA_IMAGE = /^data:image\/(?:gif|jpe?g|png|webp);base64,[a-z0-9+/=\s]+$/i;
const EXPLICIT_PROTOCOL = /^[a-z][a-z0-9+.-]*:/i;

let activeOptions: BuilderHtmlSanitizeOptions = {};
let hooksRegistered = false;

function registerHooks(): void {
	if (hooksRegistered) {
		return;
	}
	hooksRegistered = true;

	DOMPurify.addHook('uponSanitizeAttribute', (_node, data: UponSanitizeAttributeHookEvent) => {
		const name = data.attrName.toLowerCase();
		if (name.startsWith('on') || FORBIDDEN_ATTRIBUTES.has(name)) {
			data.keepAttr = false;
			return;
		}
		if (name === 'style' && activeOptions.allowStyleAttributes === false) {
			data.keepAttr = false;
			return;
		}
		if (URL_ATTRIBUTES.has(name)) {
			const safeUrl = sanitizeBuilderUrl(data.attrValue, {
				allowDataImages: activeOptions.allowDataImages,
			});
			if (!safeUrl) {
				data.keepAttr = false;
				return;
			}
			data.attrValue = safeUrl;
			return;
		}
		if (name === 'srcset') {
			const safeSrcset = sanitizeBuilderSrcset(data.attrValue, {
				allowDataImages: activeOptions.allowDataImages,
			});
			if (!safeSrcset) {
				data.keepAttr = false;
				return;
			}
			data.attrValue = safeSrcset;
		}
	});

	const afterSanitizeAttributes: ElementHook = (node) => {
		const tag = node.tagName.toLowerCase();
		if ((tag === 'a' || tag === 'area') && node.getAttribute('target')?.toLowerCase() === '_blank') {
			node.setAttribute('rel', mergeLinkRel(node.getAttribute('rel')));
		}
	};
	DOMPurify.addHook('afterSanitizeAttributes', afterSanitizeAttributes);
}

export function sanitizeBuilderHtml(html: string, options: BuilderHtmlSanitizeOptions = {}): string {
	if (!html || options.trusted) {
		return html;
	}

	registerHooks();
	activeOptions = options;
	try {
		return DOMPurify.sanitize(html, buildSanitizeConfig(options));
	} finally {
		activeOptions = {};
	}
}

export function sanitizeBuilderUrl(value: string, options: BuilderUrlSanitizeOptions = {}): string {
	const trimmed = value.trim();
	if (!trimmed) {
		return '';
	}
	if (trimmed.startsWith('#')) {
		return trimmed;
	}
	if (/^(?:javascript|vbscript|file|filesystem):/i.test(trimmed)) {
		return '';
	}
	if (/^data:/i.test(trimmed)) {
		if (options.allowDataImages === false) {
			return '';
		}
		return SAFE_DATA_IMAGE.test(trimmed) ? trimmed : '';
	}
	try {
		const url = new URL(trimmed, 'https://builder.invalid');
		if (SAFE_URL_PROTOCOLS.has(url.protocol)) {
			return trimmed;
		}
	} catch {
		return '';
	}
	if (options.allowRelative !== false && !EXPLICIT_PROTOCOL.test(trimmed)) {
		return trimmed;
	}
	return '';
}

export function sanitizeBuilderSrcset(value: string, options: BuilderUrlSanitizeOptions = {}): string {
	return value
		.split(',')
		.map((candidate) => {
			const parts = candidate.trim().split(/\s+/);
			const url = parts.shift() ?? '';
			const safeUrl = sanitizeBuilderUrl(url, options);
			return safeUrl ? [safeUrl, ...parts].join(' ') : '';
		})
		.filter(Boolean)
		.join(', ');
}

export function sanitizeBuilderAttributes(
	attributes: Record<string, string>,
	options: BuilderUrlSanitizeOptions = {},
): Record<string, string> {
	const sanitized: Record<string, string> = {};
	for (const [name, value] of Object.entries(attributes)) {
		const normalizedName = name.toLowerCase();
		if (normalizedName.startsWith('on') || FORBIDDEN_ATTRIBUTES.has(normalizedName)) {
			continue;
		}
		if (URL_ATTRIBUTES.has(normalizedName)) {
			const safeUrl = sanitizeBuilderUrl(value, options);
			if (safeUrl) {
				sanitized[name] = safeUrl;
			}
			continue;
		}
		if (normalizedName === 'srcset') {
			const safeSrcset = sanitizeBuilderSrcset(value, options);
			if (safeSrcset) {
				sanitized[name] = safeSrcset;
			}
			continue;
		}
		sanitized[name] = value;
	}
	if (sanitized.target?.toLowerCase() === '_blank') {
		sanitized.rel = mergeLinkRel(sanitized.rel ?? null);
	}
	return sanitized;
}

export function sanitizeBuilderCss(css: string): string {
	return css
		.replaceAll(/@import[\s\S]*?;/gi, '')
		.replaceAll(/expression\s*\(/gi, '')
		.replaceAll(/(?:behavior|-moz-binding)\s*:/gi, '')
		.replaceAll(/url\s*\(\s*["']?\s*(?:javascript|vbscript|data:text\/html)[^)]*\)/gi, 'url()');
}

function buildSanitizeConfig(options: BuilderHtmlSanitizeOptions): Config {
	const profile = options.profile ?? 'rich';
	const config: Config = {
		ADD_ATTR: ['target', 'rel'],
		ALLOW_ARIA_ATTR: true,
		ALLOW_DATA_ATTR: true,
		FORBID_ATTR: [...FORBIDDEN_ATTRIBUTES],
		FORBID_TAGS: [...FORBIDDEN_TAGS],
	};
	if (profile === 'inline') {
		config.ALLOWED_TAGS = [...INLINE_TAGS];
		return config;
	}
	config.USE_PROFILES = {
		html: true,
		svg: options.allowSvg !== false,
		svgFilters: options.allowSvg !== false,
	};
	return config;
}

function mergeLinkRel(value: string | null): string {
	const tokens = new Set((value ?? '').split(/\s+/).filter(Boolean));
	tokens.add('noopener');
	tokens.add('noreferrer');
	return [...tokens].join(' ');
}
