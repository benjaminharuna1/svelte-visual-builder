import { describe, expect, it } from 'vitest';

import {
	sanitizeBuilderAttributes,
	sanitizeBuilderCss,
	sanitizeBuilderHtml,
	sanitizeBuilderSrcset,
	sanitizeBuilderUrl,
} from '../src/index';

describe('builder security', () => {
	it('removes scripts, event handlers, and unsafe embedded content', () => {
		const result = sanitizeBuilderHtml(
			'<p onclick="alert(1)">Hello <script>alert(1)</script><strong>world</strong></p><iframe srcdoc="<script>alert(1)</script>"></iframe>',
		);

		expect(result).toContain('<p>Hello');
		expect(result).toContain('<strong>world</strong>');
		expect(result).not.toMatch(/script|onclick|srcdoc/i);
	});

	it('blocks executable URLs and unsafe data URLs', () => {
		expect(sanitizeBuilderUrl('javascript:alert(1)')).toBe('');
		expect(sanitizeBuilderUrl('vbscript:msgbox(1)')).toBe('');
		expect(sanitizeBuilderUrl('data:text/html,<script>alert(1)</script>')).toBe('');
		expect(sanitizeBuilderUrl('ftp://example.com/file.png')).toBe('');
		expect(sanitizeBuilderUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
		expect(sanitizeBuilderUrl('mailto:hello@example.com')).toBe('mailto:hello@example.com');
		expect(sanitizeBuilderUrl('/relative/path')).toBe('/relative/path');
	});

	it('allows safe image data URLs', () => {
		const image = 'data:image/png;base64,iVBORw0KGgo=';

		expect(sanitizeBuilderUrl(image)).toBe(image);
		expect(sanitizeBuilderHtml(`<img src="${image}" alt="Pixel">`)).toContain(image);
	});

	it('adds safe rel attributes to new-window links', () => {
		const result = sanitizeBuilderHtml('<a href="https://example.com" target="_blank">Example</a>');

		expect(result).toContain('rel="noopener noreferrer"');
	});

	it('strips unsafe form and link attributes', () => {
		const result = sanitizeBuilderHtml(
			'<form action="javascript:alert(1)"><button formaction="javascript:alert(1)" ping="https://evil.test">Go</button></form>',
		);

		expect(result).not.toMatch(/javascript:|formaction|ping/i);
	});

	it('uses a stricter inline profile for rich text fields', () => {
		const result = sanitizeBuilderHtml('<h1>Title</h1><p>Body <em>copy</em></p><div>Block</div>', {
			profile: 'inline',
		});

		expect(result).toContain('Body <em>copy</em>');
		expect(result).not.toMatch(/<h1|<p|<div/i);
	});

	it('sanitizes srcset candidates and attribute bags', () => {
		expect(sanitizeBuilderSrcset('https://example.com/a.png 1x, javascript:alert(1) 2x')).toBe(
			'https://example.com/a.png 1x',
		);

		expect(
			sanitizeBuilderAttributes({
				href: 'javascript:alert(1)',
				target: '_blank',
				onclick: 'alert(1)',
				title: 'Safe',
			}),
		).toEqual({
			target: '_blank',
			title: 'Safe',
			rel: 'noopener noreferrer',
		});
	});

	it('removes CSS import and executable CSS constructs', () => {
		const result = sanitizeBuilderCss(
			'@import url("https://evil.test/a.css"); .a { width: expression(alert(1)); behavior: url(x); background: url(javascript:alert(1)); }',
		);

		expect(result).not.toMatch(/@import|expression|behavior|javascript:/i);
		expect(result).toContain('.a');
	});
});
