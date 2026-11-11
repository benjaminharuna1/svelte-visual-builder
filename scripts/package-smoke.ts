import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const packageDirectories = [
	'schema',
	'core',
	'plugin-api',
	'elementor-import',
	'adapter-sveltekit',
	'runtime-svelte',
	'editor-svelte',
].map( ( name ) => path.join( repoRoot, 'packages', name ) );

function run( command: string, args: string[], cwd: string ) {
	console.log( `\n> ${ command } ${ args.join( ' ' ) }` );
	console.log( `  ${ cwd }` );
	return new Promise<void>( ( resolve, reject ) => {
		const child = spawn( command, args, {
			cwd,
			stdio: 'inherit',
			shell: process.platform === 'win32',
		} );
		child.on( 'error', reject );
		child.on( 'close', ( code ) => {
			if ( code === 0 ) {
				resolve();
				return;
			}
			reject( new Error( `${ command } exited with code ${ code }.` ) );
		} );
	} );
}

async function readPackageJsonFromTarball( tarball: string ) {
	const { stdout } = await new Promise<{ stdout: string }>( ( resolve, reject ) => {
		const child = spawn( 'tar', [ '-xOf', tarball, 'package/package.json' ], {
			stdio: [ 'ignore', 'pipe', 'pipe' ],
			shell: process.platform === 'win32',
		} );
		let stdout = '';
		let stderr = '';
		child.stdout.on( 'data', ( chunk ) => {
			stdout += chunk;
		} );
		child.stderr.on( 'data', ( chunk ) => {
			stderr += chunk;
		} );
		child.on( 'error', reject );
		child.on( 'close', ( code ) => {
			if ( code === 0 ) {
				resolve( { stdout } );
				return;
			}
			reject( new Error( `tar exited with code ${ code }: ${ stderr }` ) );
		} );
	} );
	return JSON.parse( stdout ) as {
		name: string;
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
}

function fileSpecifier( appDirectory: string, tarball: string ) {
	const relative = path.relative( appDirectory, tarball ).split( path.sep ).join( '/' );
	return `file:${ relative }`;
}

async function main() {
	const keep = process.argv.includes( '--keep' );
	const workspace = await mkdtemp( path.join( tmpdir(), 'builder-package-smoke-' ) );
	const tarballDirectory = path.join( workspace, 'tarballs' );
	const appDirectory = path.join( workspace, 'app' );

	await mkdir( tarballDirectory, { recursive: true } );

	try {
		await run( 'pnpm', [ 'build:packages' ], repoRoot );

		for ( const packageDirectory of packageDirectories ) {
			await run( 'pnpm', [ 'pack', '--pack-destination', tarballDirectory ], packageDirectory );
		}

		const tarballs = ( await readdir( tarballDirectory ) )
			.filter( ( entry ) => entry.endsWith( '.tgz' ) )
			.map( ( entry ) => path.join( tarballDirectory, entry ) );
		assert.equal( tarballs.length, packageDirectories.length, 'Expected one tarball per package.' );

		const tarballsByPackage = new Map<string, string>();
		for ( const tarball of tarballs ) {
			const packageJson = await readPackageJsonFromTarball( tarball );
			const serialized = JSON.stringify( packageJson );
			assert.equal(
				serialized.includes( 'workspace:' ),
				false,
				`${ packageJson.name } still contains workspace: dependencies after packing.`,
			);
			tarballsByPackage.set( packageJson.name, tarball );
		}

		await cp( path.join( repoRoot, 'packages', 'create-svelte-builder', 'template' ), appDirectory, {
			recursive: true,
			filter: ( source ) => {
				const relative = path.relative( path.join( repoRoot, 'packages', 'create-svelte-builder', 'template' ), source );
				if ( !relative ) {
					return true;
				}
				const segments = relative.split( path.sep );
				return !segments.includes( 'node_modules' )
					&& !segments.includes( '.svelte-kit' )
					&& !segments.includes( 'dist' )
					&& segments[ 0 ] !== 'seeds';
			},
		} );

		await writeFile( path.join( appDirectory, '.npmrc' ), 'allow-scripts=esbuild\n', 'utf8' );

		const packagePath = path.join( appDirectory, 'package.json' );
		const appPackage = JSON.parse( await readFile( packagePath, 'utf8' ) ) as {
			name: string;
			dependencies: Record<string, string>;
			overrides?: Record<string, string>;
		};
		appPackage.name = 'builder-package-smoke';

		const overrides: Record<string, string> = {};
		for ( const [ packageName, tarball ] of tarballsByPackage ) {
			const specifier = fileSpecifier( appDirectory, tarball );
			if ( packageName in appPackage.dependencies ) {
				appPackage.dependencies[ packageName ] = specifier;
			}
			overrides[ packageName ] = specifier;
		}
		appPackage.overrides = overrides;
		await writeFile( packagePath, `${ JSON.stringify( appPackage, null, 2 ) }\n`, 'utf8' );

		await run( 'npm', [ 'install', '--ignore-scripts', '--no-audit', '--no-fund' ], appDirectory );
		await run( 'npm', [ 'run', 'check' ], appDirectory );
		await run( 'npm', [ 'run', 'build' ], appDirectory );

		console.log( '\nPackaging smoke test passed.' );
	} finally {
		if ( keep ) {
			console.log( `\nKept smoke workspace: ${ workspace }` );
		} else {
			await rm( workspace, { recursive: true, force: true } );
		}
	}
}

main().catch( ( error ) => {
	console.error( `\n${ error instanceof Error ? error.message : String( error ) }` );
	process.exitCode = 1;
} );
