import { createBuilderPackage, createDocument, createNode, createThemeAssignment } from '@builder/schema';
import type { BuilderPackage } from '@builder/schema';

export const starterProjectId = 'starter';
export const starterDocumentId = 'home';

function createPlanCard( title: string, price: string, body: string, featured = false ) {
	return createNode( {
		type: 'container',
		name: title,
		layout: { display: 'flex', direction: 'column', gap: '0.75rem' },
		styles: {
			base: {
				padding: '28px',
				backgroundColor: featured ? '#0f172a' : '#ffffff',
				color: featured ? '#f8fafc' : '#0f172a',
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
				type: 'heading',
				props: { text: price, level: 'h2', align: 'left' },
			} ),
			createNode( {
				type: 'paragraph',
				props: { text: body },
			} ),
			createNode( {
				type: 'button',
				props: { text: 'Choose plan', href: '/published/home' },
			} ),
		],
	} );
}

export function createStarterProject(): BuilderPackage {
	const page = createDocument( 'page', 'Pricing', 'home' );
	page.id = starterDocumentId;
	page.status = 'published';
	page.root = [
		createNode( {
			id: 'starter-hero',
			type: 'container',
			name: 'Pricing hero',
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
					props: { text: 'Simple pricing', level: 'h1', align: 'left' },
				} ),
				createNode( {
					type: 'paragraph',
					props: { text: 'Start free, upgrade when your team is ready.' },
				} ),
			],
		} ),
		createNode( {
			id: 'starter-plans',
			type: 'container',
			name: 'Plans',
			layout: { display: 'grid', columns: 'repeat(3, minmax(0, 1fr))', gap: '1rem', width: '100%' },
			styles: {
				base: { padding: '24px 0' },
				states: {},
				breakpoints: {},
				stateBreakpoints: {},
				customCss: '',
			},
			children: [
				createPlanCard( 'Starter', '$0', 'For personal projects and experiments.' ),
				createPlanCard( 'Team', '$29', 'For growing teams that ship together.', true ),
				createPlanCard( 'Scale', '$99', 'For organizations with advanced needs.' ),
			],
		} ),
	];

	const project = createBuilderPackage( 'Svelte Builder Pricing', [ page ], [
		createThemeAssignment( {
			documentId: page.id,
			slot: 'page',
			status: 'published',
			pathname: '/published/home',
			label: 'Pricing',
		} ),
	] );
	project.meta = {
		starterTemplate: 'pricing',
	};
	return project;
}
