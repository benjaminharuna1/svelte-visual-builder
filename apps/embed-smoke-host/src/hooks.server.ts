import { randomUUID } from 'node:crypto';

import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const nonce = randomUUID();
	event.locals.nonce = nonce;

	const response = await resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replaceAll('<script', `<script nonce="${nonce}"`).replaceAll('<style', `<style nonce="${nonce}"`),
	});

	response.headers.set(
		'Content-Security-Policy',
		[
			"default-src 'self'",
			`script-src 'self' 'nonce-${nonce}'`,
			`style-src 'self' 'nonce-${nonce}'`,
			"img-src 'self' data: https:",
			"font-src 'self' data: https:",
			"connect-src 'self'",
			"object-src 'none'",
			"base-uri 'self'",
			"frame-ancestors 'none'",
		].join('; '),
	);

	return response;
};
