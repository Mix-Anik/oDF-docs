// Generates the API reference pages (docs/plugins/api/): asks the engine repo (oDFe-upstream) for its API as data
// (gen_api.py --json), then renders the pages with render-api.mjs.
//   PYTHON     the interpreter to use (default: the first Python 3 found)
//   ODFE_DIR   where the engine repo is checked out (default: the sibling folder; CI sets it)
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderApi } from './render-api.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const engine = resolve(process.env.ODFE_DIR ?? resolve(root, '../oDFe-upstream'));
const apiDir = resolve(engine, 'code/plugin_api');
const data = resolve(root, '.api-data');
const out = resolve(root, 'docs/plugins/api');

if (!existsSync(resolve(apiDir, 'gen_api.py'))) {
	console.error(`gen_api.py not found in ${apiDir}\nCheck out oDFe-upstream and set ODFE_DIR to it.`);
	process.exit(1);
}

// The first interpreter that really is Python 3. On Windows `python` can be the Microsoft Store stub that only prints a hint,
// and version managers (pyenv) install .bat shims that only a shell finds, so each one is tried both ways.
const candidates = [process.env.PYTHON, 'python3', 'python', 'py'].filter(Boolean);
const shells = process.platform === 'win32' ? [false, true] : [false];
for (const python of candidates) {
	for (const shell of shells) {
		const probe = spawnSync(python, ['--version'], { encoding: 'utf8', shell });
		if (probe.status !== 0 || !/^Python 3/.test(probe.stdout + probe.stderr)) continue;
		// with a shell the path has to be quoted (spaces); without one the quotes would become part of it
		const r = spawnSync(python, ['gen_api.py', '--json', shell ? JSON.stringify(data) : data], { cwd: apiDir, stdio: 'inherit', shell });
		if (r.status !== 0) process.exit(r.status ?? 1);
		renderApi(data, out);
		process.exit(0);
	}
}
console.error('Python 3 not found (set PYTHON to it)');
process.exit(1);
