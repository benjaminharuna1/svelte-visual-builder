#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';

const templateNames = [ 'minimal', 'blog', 'docs', 'pricing' ];
const scriptDirectory = path.dirname( fileURLToPath( import.meta.url ) );
const templateRoot = path.resolve( scriptDirectory, '..', 'template' );

function printHelp() {
	console.log( `
Create a SvelteKit app powered by the Svelte Visual Builder.

Usage:
  pnpm create svelte-builder [project-name] [options]

Options:
  -t, --template <name>       minimal, blog, docs, or pricing (default: minimal)
  -p, --package-manager <pm>  pnpm, npm, yarn, or bun (default: detected)
      --no-install            Skip dependency installation
  -h, --help                  Show this help

Examples:
  pnpm create svelte-builder my-site
  pnpm create svelte-builder my-blog --template blog
` );
}

function parseArgs( argv ) {
	const options = {
		template: 'minimal',
		install: true,
		projectName: undefined,
		packageManager: undefined,
		help: false,
	};

	for ( let index = 0; index < argv.length; index += 1 ) {
		const arg = argv[ index ];
		if ( arg === '--help' || arg === '-h' ) {
			options.help = true;
			continue;
		}
		if ( arg === '--no-install' ) {
			options.install = false;
			continue;
		}
		if ( arg === '--template' || arg === '-t' ) {
			options.template = argv[ ++index ];
			continue;
		}
		if ( arg.startsWith( '--template=' ) ) {
			options.template = arg.slice( '--template='.length );
			continue;
		}
		if ( arg === '--package-manager' || arg === '-p' ) {
			options.packageManager = argv[ ++index ];
			continue;
		}
		if ( arg.startsWith( '--package-manager=' ) ) {
			options.packageManager = arg.slice( '--package-manager='.length );
			continue;
		}
		if ( arg.startsWith( '-' ) ) {
			throw new Error( `Unknown option: ${ arg }` );
		}
		if ( options.projectName ) {
			throw new Error( `Unexpected argument: ${ arg }` );
		}
		options.projectName = arg;
	}

	return options;
}

async function promptForMissingOptions( options ) {
	if ( options.projectName ) {
		return;
	}
	if ( !input.isTTY ) {
		throw new Error( 'A project name is required when not running interactively.' );
	}

	const readline = createInterface( { input, output } );
	try {
		if ( !options.projectName ) {
			options.projectName = ( await readline.question( 'Project name: ' ) ).trim();
		}
		if ( !options.template ) {
			options.template = ( await readline.question( `Template (${ templateNames.join( ', ' ) }) [minimal]: ` ) ).trim() || 'minimal';
		}
	} finally {
		readline.close();
	}
}

function validateProjectName( projectName ) {
	if ( !/^[a-z0-9][a-z0-9._-]*$/i.test( projectName ) ) {
		throw new Error( 'Project name must start with a letter or number and contain only letters, numbers, dots, underscores, or hyphens.' );
	}
}

function validateTemplate( template ) {
	if ( !templateNames.includes( template ) ) {
		throw new Error( `Unknown template "${ template }". Choose one of: ${ templateNames.join( ', ' ) }.` );
	}
}

function detectPackageManager() {
	const userAgent = process.env.npm_config_user_agent ?? '';
	if ( userAgent.includes( 'pnpm' ) ) {
		return 'pnpm';
	}
	if ( userAgent.includes( 'yarn' ) ) {
		return 'yarn';
	}
	if ( userAgent.includes( 'bun' ) ) {
		return 'bun';
	}
	return 'npm';
}

async function copyTemplate( targetDirectory, template ) {
	await mkdir( targetDirectory, { recursive: true } );

	const entries = await readdir( templateRoot, { withFileTypes: true } );
	for ( const entry of entries ) {
		if ( entry.name === 'seeds' ) {
			continue;
		}
		await cp( path.join( templateRoot, entry.name ), path.join( targetDirectory, entry.name ), {
			recursive: true,
			filter: ( source ) => {
				const relative = path.relative( templateRoot, source );
				if ( !relative ) {
					return true;
				}
				const segments = relative.split( path.sep );
				return !segments.includes( 'node_modules' )
					&& !segments.includes( '.svelte-kit' )
					&& !segments.includes( 'dist' );
			},
		} );
	}

	if ( template !== 'minimal' ) {
		await cp(
			path.join( templateRoot, 'seeds', `${ template }.ts` ),
			path.join( targetDirectory, 'src', 'lib', 'sample-project.ts' ),
		);
	}
}

async function personalizeProject( targetDirectory, projectName ) {
	const packagePath = path.join( targetDirectory, 'package.json' );
	const packageJson = JSON.parse( await readFile( packagePath, 'utf8' ) );
	packageJson.name = projectName.toLowerCase();
	await writeFile( packagePath, `${ JSON.stringify( packageJson, null, 2 ) }\n`, 'utf8' );

	const readmePath = path.join( targetDirectory, 'README.md' );
	const readme = await readFile( readmePath, 'utf8' );
	await writeFile( readmePath, readme.replaceAll( '{{projectName}}', projectName ), 'utf8' );
}

function run( command, args, cwd ) {
	return new Promise( ( resolve, reject ) => {
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

async function main() {
	const options = parseArgs( process.argv.slice( 2 ) );
	if ( options.help ) {
		printHelp();
		return;
	}

	await promptForMissingOptions( options );
	validateProjectName( options.projectName );
	validateTemplate( options.template );

	const targetDirectory = path.resolve( process.cwd(), options.projectName );
	const existing = await readdir( targetDirectory ).catch( () => [] );
	if ( existing.length > 0 ) {
		throw new Error( `Target directory is not empty: ${ targetDirectory }` );
	}

	await copyTemplate( targetDirectory, options.template );
	await personalizeProject( targetDirectory, options.projectName );

	const packageManager = options.packageManager ?? detectPackageManager();
	if ( options.install ) {
		console.log( `\nInstalling dependencies with ${ packageManager }...` );
		await run( packageManager, [ 'install' ], targetDirectory );
	}

	const relativeTarget = path.relative( process.cwd(), targetDirectory ) || '.';
	console.log( `\nCreated ${ options.projectName } with the ${ options.template } template.` );
	console.log( '\nNext steps:' );
	if ( relativeTarget !== '.' ) {
		console.log( `  cd ${ relativeTarget }` );
	}
	if ( !options.install ) {
		console.log( `  ${ packageManager } install` );
	}
	console.log( `  ${ packageManager === 'npm' ? 'npm run dev' : `${ packageManager } dev` }` );
}

main().catch( ( error ) => {
	console.error( `\n${ error.message }` );
	process.exitCode = 1;
} );
