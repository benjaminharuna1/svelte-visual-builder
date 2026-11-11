import { createBuilderPackage, createDocument, createNode, createThemeAssignment } from '@builder/schema';
import type { BuilderPackage } from '@builder/schema';

export const starterProjectId = 'starter';
export const starterDocumentId = 'home';

function createPostCard( title: string, body: string ) {
	return createNode( {
		type: 'container',
		name: title,
		layout: { display: 'flex', direction: 'column', gap: '0.5rem' },
		styles: {
			base: {
				padding: '24px',
				backgroundColor: '#ffffff',
				border: '1px solid #e2e8f0',
				borderRadius: '12px',
			},
			states: {},
			breakpoints: {},
			stateBreakpoints: {},
			customCss: '',
		},
		children: [
			createNode( {
				type: 'heading',
				props: { text: title, level: 'h3', align: 'left' },
			} ),
			createNode( {
				type: 'paragraph',
				props: { text: body },
			} ),
		],
	} );
}

export function createStarterProject(): BuilderPackage {
	const page = createDocument( 'page', 'Blog', 'home' );
	page.id = starterDocumentId;
	page.status = 'published';
	page.root = [
		createNode( {
			id: 'starter-hero',
			type: 'container',
			name: 'Blog hero',
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
				createNode( {
					type: 'heading',
					props: { text: 'Blog', level: 'h1', align: 'left' },
				} ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Stories, updates, and ideas from the team.' },
				} ),
			],
		} ),
		createNode( {
			id: 'starter-posts',
			type: 'container',
			name: 'Latest posts',
			layout: { display: 'grid', columns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', width: '100%' },
			styles: {
				base: { padding: '24px 0' },
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			children: [
				createPostCard( 'Getting started', 'Set up the builder and publish your first page.' ),
				createPostCard( 'Design tokens', 'Keep spacing, color, and type consistent across pages.' ),
				createPostCard( 'Ship faster', 'Reuse components and templates across your site.' ),
			],
		} ),
	];

	const project = createBuilderPackage( 'Svelte Builder Blog', [ page ], [
		createThemeAssignment( {
			documentId: page.id,
			slot: 'page',
			status: 'published',
			pathname: '/published/home',
			label: 'Blog',
		} ),
	] );
	project.meta = {
		starterTemplate: 'blog',
	};
	return project;
}
