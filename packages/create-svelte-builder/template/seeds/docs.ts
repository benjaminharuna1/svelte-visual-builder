import { createBuilderPackage, createDocument, createNode, createThemeAssignment } from '@builder/schema';
import type { BuilderPackage } from '@builder/schema';

export const starterProjectId = 'starter';
export const starterDocumentId = 'home';

function createDocSection( title: string, body: string ) {
	return createNode( {
		type: 'container',
		name: title,
		layout: { display: 'flex', direction: 'column', gap: '0.5rem' },
		children: [
			createNode( {
				type: 'heading',
				props: { text: title, level: 'h2', align: 'left' },
			} ),
			createNode( {
				type: 'paragraph',
				props: { text: body },
			} ),
		],
	} );
}

export function createStarterProject(): BuilderPackage {
	const page = createDocument( 'page', 'Docs', 'home' );
	page.id = starterDocumentId;
	page.status = 'published';
	page.root = [
		createNode( {
			id: 'starter-hero',
			type: 'container',
			name: 'Docs hero',
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
					props: { text: 'Documentation', level: 'h1', align: 'left' },
				} ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Everything you need to build and publish with the visual builder.' },
				} ),
			],
		} ),
		createNode( {
			id: 'starter-docs-layout',
			type: 'container',
			name: 'Docs layout',
			layout: { display: 'grid', columns: '240px minmax(0, 1fr)', gap: '2rem', width: '100%' },
			styles: {
				base: { padding: '32px 0' },
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			children: [
				createNode( {
					type: 'container',
					name: 'Docs navigation',
					layout: { display: 'flex', direction: 'column', gap: '0.75rem' },
					children: [
						createNode( { type: 'heading', props: { text: 'On this page', level: 'h3', align: 'left' } } ),
						createNode( { type: 'paragraph', props: { text: 'Installation' } } ),
						createNode( { type: 'paragraph', props: { text: 'Editor basics' } } ),
						createNode( { type: 'paragraph', props: { text: 'Publishing' } } ),
					],
				} ),
				createNode( {
					type: 'container',
					name: 'Docs content',
					layout: { display: 'flex', direction: 'column', gap: '1.5rem' },
					children: [
						createDocSection( 'Installation', 'Add the builder packages to a SvelteKit app and start the dev server.' ),
						createDocSection( 'Editor basics', 'Drag blocks onto the canvas, edit content, and preview the result.' ),
						createDocSection( 'Publishing', 'Save a draft, publish a revision, and open the published route.' ),
					],
				} ),
			],
		} ),
	];

	const project = createBuilderPackage( 'Svelte Builder Docs', [ page ], [
		createThemeAssignment( {
			documentId: page.id,
			slot: 'page',
			status: 'published',
			pathname: '/published/home',
			label: 'Docs',
		} ),
	] );
	project.meta = {
		starterTemplate: 'docs',
	};
	return project;
}
