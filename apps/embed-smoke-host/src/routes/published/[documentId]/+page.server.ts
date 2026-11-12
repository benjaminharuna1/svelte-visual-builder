import { readHostProject } from '$lib/server/host-store';

export function load( { params, locals } ) {
	const { project } = readHostProject();
	return {
		documentId: params.documentId,
		project,
		nonce: locals.nonce,
		bindingContext: {
			siteData: { title: 'Embed Smoke Host' },
			record: {
				title: 'Runtime title from host context',
			},
		},
	};
}
