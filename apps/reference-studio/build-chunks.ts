export const INITIAL_CLIENT_CHUNK_BUDGET_BYTES = 350 * 1024;

function toNormalizedId( id: string ) {
	return id.replaceAll( '\\', '/' );
}

function matchesBuilderSource( normalizedId: string, packageName: string ) {
	return normalizedId.includes( `/node_modules/@builder/${ packageName }/` )
		|| normalizedId.includes( `/packages/${ packageName }/` );
}

function matchesAnyNodeModule( normalizedId: string, packageNames: string[] ) {
	return packageNames.some( ( packageName ) => normalizedId.includes( `/node_modules/${ packageName }` ) );
}

function matchesBuilderModule( normalizedId: string, packageName: string, moduleName: string ) {
	return matchesBuilderSource( normalizedId, packageName )
		&& (
			normalizedId.includes( `/src/lib/${ moduleName }.ts` )
			|| normalizedId.includes( `/dist/lib/${ moduleName }.js` )
		);
}

export function createBuilderManualChunks( isSsrBuild: boolean ) {
	if ( isSsrBuild ) {
		return undefined;
	}

	return ( id: string ) => {
		const normalizedId = toNormalizedId( id );

		if (
			matchesBuilderModule( normalizedId, 'editor-svelte', 'ai' )
			|| matchesBuilderModule( normalizedId, 'editor-svelte', 'ai-tools' )
		) {
			return 'builder-ai';
		}

		if ( matchesBuilderSource( normalizedId, 'editor-svelte' ) ) {
			return 'builder-editor';
		}

		if ( matchesBuilderSource( normalizedId, 'runtime-svelte' ) ) {
			return 'builder-runtime';
		}

		if ( matchesBuilderSource( normalizedId, 'core' ) ) {
			return 'builder-core';
		}

		if ( matchesBuilderSource( normalizedId, 'schema' ) ) {
			return 'builder-schema';
		}

		if ( matchesBuilderSource( normalizedId, 'plugin-api' ) ) {
			return 'builder-plugin-api';
		}

		if ( matchesBuilderSource( normalizedId, 'elementor-import' ) ) {
			return 'builder-import';
		}

		if ( normalizedId.includes( '/node_modules/' ) ) {
			if ( matchesAnyNodeModule( normalizedId, [ '@dnd-kit', '@dnd-kit/core', '@dnd-kit/modifiers', '@dnd-kit/sortable', '@dnd-kit/svelte' ] ) ) {
				return 'vendor-dnd';
			}

			if ( matchesAnyNodeModule( normalizedId, [ 'bits-ui', 'paneforge', '@floating-ui', '@tanstack', '@zag-js' ] ) ) {
				return 'vendor-shell';
			}

			if ( matchesAnyNodeModule( normalizedId, [ '@tiptap', 'prosemirror-', 'orderedmap', 'rope-sequence', 'w3c-keyname' ] ) ) {
				return 'vendor-richtext';
			}

			return 'vendor-base';
		}

		return undefined;
	};
}
