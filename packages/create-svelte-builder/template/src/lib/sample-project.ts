import { createBuilderPackage, createDocument, createNode, createThemeAssignment } from '@builder/schema';
import type { BuilderPackage } from '@builder/schema';

export const starterProjectId = 'starter';
export const starterDocumentId = 'home';

export function createStarterProject(): BuilderPackage {
	const page = createDocument('page', 'Home', 'home');
	page.id = starterDocumentId;
	page.status = 'published';
	page.root = [
		createNode({
			id: 'starter-hero',
			type: 'container',
			name: 'Starter hero',
			layout: { display: 'flex', direction: 'column', gap: '1rem', width: '100%' },
			styles: {
				base: {
					padding: '48px',
					backgroundColor: '#f8fafc',
					borderRadius: '12px',
				},
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			children: [
				createNode({
					type: 'heading',
					props: { text: 'Svelte Builder Starter', level: 'h1', align: 'left' },
				}),
				createNode({
					type: 'paragraph',
					props: {
						text: 'Edit this page in the visual builder, then open the published route to see the rendered result.',
					},
				}),
				createNode({
					type: 'button',
					props: {
						text: 'View published page',
						href: '/published/home',
					},
				}),
				createNode({
					type: 'image',
					props: {
						src: '/api/media/starter-logo',
						alt: 'Starter media asset',
					},
					styles: {
						base: {
							width: '160px',
							height: '90px',
							objectFit: 'cover',
							borderRadius: '8px',
						},
						states: {},
						breakpoints: {},
						stateBreakpoints: {},
						customCss: '',
					},
				}),
			],
		}),
	];

	const project = createBuilderPackage(
		'Svelte Builder Starter',
		[page],
		[
			createThemeAssignment({
				documentId: page.id,
				slot: 'page',
				status: 'published',
				pathname: '/published/home',
				label: 'Home',
			}),
		],
	);
	project.media = [
		{
			id: 'starter-logo',
			kind: 'image',
			url: '/api/media/starter-logo',
			alt: 'Starter sample image',
			title: 'Starter sample',
			meta: {
				mimeType: 'image/svg+xml',
				source: 'host',
			},
		},
	];
	project.meta = {
		starterFixture: true,
	};
	return project;
}
