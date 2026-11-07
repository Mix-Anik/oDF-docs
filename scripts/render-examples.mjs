// The example pages are written by hand (content/examples/*.md) and show the source of the example plugins of the engine's SDK
// (code/plugin_api/sdk/examples). A line `{{source name.c}}` in a page is replaced by that file, so the code on the site is
// the code the engine's CI builds, and a renamed or removed example breaks the build instead of the page.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function renderExamples(templateDir, sourceDir, outDir) {
	mkdirSync(outDir, { recursive: true });
	for (const name of readdirSync(templateDir).filter((n) => n.endsWith('.md'))) {
		const text = readFileSync(join(templateDir, name), 'utf8').replace(/^\{\{source ([\w.-]+)\}\}\s*$/gm, (_, file) => {
			const source = readFileSync(join(sourceDir, file), 'utf8').replace(/\r/g, '').replace(/\s+$/, '');
			if (source.includes('```')) throw new Error(`${file} has a code fence in it`);
			return '```c title="' + file + '"\n' + source + '\n```';
		});
		writeFileSync(join(outDir, name), text);
		console.log('wrote examples/' + name);
	}
}
