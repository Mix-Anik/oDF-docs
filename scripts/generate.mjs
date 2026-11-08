// Generates the pages that come from the engine repo (oDFe-upstream), into docs/plugins/ (not committed):
//   api/       the API reference: the engine says what its API is as data (gen_api.py --json), the types come from its headers
//   examples/  the hand-written pages of content/examples with the source of the SDK examples put in
// How it all looks is decided here (render-*.mjs); what it says comes from the engine, so it cannot be out of date.
//   PYTHON     the interpreter to use (default: the first Python 3 found)
//   ODFE_DIR   where the engine repo is checked out (default: the sibling folder; CI sets it)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ApiPage, registerApi } from './render-api.mjs';
import { Notes } from './notes.mjs';
import { renderExamples } from './render-examples.mjs';
import { parseHeader, registerTypes, TypesPage } from './render-types.mjs';
import { Linker } from './text.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = resolve(process.env.ODFE_DIR ?? resolve(root, '../oDFe-upstream'));
const apiDir = resolve(engine, 'code/plugin_api');
const data = resolve(root, '.api-data');
const apiOut = resolve(root, 'docs/plugins/api');
const examplesOut = resolve(root, 'docs/plugins/examples');
const guidesOut = resolve(root, 'docs/plugins/guides');

if (!existsSync(resolve(apiDir, 'gen_api.py'))) {
	console.error(`gen_api.py not found in ${apiDir}\nCheck out oDFe-upstream and set ODFE_DIR to it.`);
	process.exit(1);
}

/** Runs `gen_api.py --json` with the first interpreter that really is Python 3. On Windows `python` can be the Microsoft Store
 * stub that only prints a hint, and version managers (pyenv) install .bat shims that only a shell finds, so each one is
 * tried both ways. */
function exportApi() {
	const candidates = [process.env.PYTHON, 'python3', 'python', 'py'].filter(Boolean);
	const shells = process.platform === 'win32' ? [false, true] : [false];
	for (const python of candidates) {
		for (const shell of shells) {
			const probe = spawnSync(python, ['--version'], { encoding: 'utf8', shell });
			if (probe.status !== 0 || !/^Python 3/.test(probe.stdout + probe.stderr)) continue;
			// with a shell the path has to be quoted (spaces); without one the quotes would become part of it
			const r = spawnSync(python, ['gen_api.py', '--json', shell ? JSON.stringify(data) : data], { cwd: apiDir, stdio: 'inherit', shell });
			if (r.status !== 0) process.exit(r.status ?? 1);
			return;
		}
	}
	console.error('Python 3 not found (set PYTHON to it)');
	process.exit(1);
}

const MODULES = [
	{ kind: 'client', position: 1 },
	{ kind: 'server', position: 3 },
];

exportApi();
rmSync(apiOut, { recursive: true, force: true });
rmSync(examplesOut, { recursive: true, force: true });
rmSync(guidesOut, { recursive: true, force: true });
mkdirSync(apiOut, { recursive: true });

// first everything that can be linked to, then the pages
const loaded = MODULES.map(({ kind, position }) => {
	const api = JSON.parse(readFileSync(join(data, kind + '.json'), 'utf8'));
	const source = api.module + '_types.h';
	const types = parseHeader(readFileSync(join(apiDir, 'include', source), 'utf8'));
	const linker = new Linker();
	registerApi(api, kind + '.mdx', linker);
	registerTypes(types, kind + '-types.mdx', linker);
	return { kind, position, api, types, source, linker };
});

const notes = new Notes(resolve(root, 'content/param-notes.txt'));

for (const { kind, position, api, types, source, linker } of loaded) {
	const cap = kind[0].toUpperCase() + kind.slice(1);
	const pages = [
		[kind + '.mdx', new ApiPage(api, kind + '.mdx', linker, notes).render({ title: `${cap} plugin API`, kind, position, typesFile: kind + '-types.mdx' })],
		[kind + '-types.mdx', new TypesPage(types, kind + '-types.mdx', linker).render({ title: `${cap} types and constants`, kind, position: position + 1, source })],
	];
	for (const [name, text] of pages) {
		writeFileSync(join(apiOut, name), text);
		console.log('wrote api/' + name);
	}
}

notes.check();
renderExamples(resolve(root, 'content/examples'), resolve(apiDir, 'sdk/examples'), examplesOut);
renderExamples(resolve(root, 'content/guides'), resolve(apiDir, 'sdk/examples'), guidesOut);
