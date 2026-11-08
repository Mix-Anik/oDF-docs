// The hand-written descriptions of parameters (content/param-notes.txt), for the Notes column of the API reference.
// The .api files of the engine describe a function as a whole; what each parameter is for is said here. A note whose function
// or parameter is gone from the engine fails the build, so a rename cannot leave a stale description behind.
import { readFileSync } from 'node:fs';

export class Notes {
	constructor(file) {
		this.file = file;
		this.map = new Map(); // 'Function.parameter' -> text
		this.used = new Set();
		let key = null;
		readFileSync(file, 'utf8')
			.replace(/\r/g, '')
			.split('\n')
			.forEach((line, i) => {
				if (!line.trim() || line.startsWith('#')) return;
				if (/^\s/.test(line)) {
					if (!key) throw new Error(`${file}:${i + 1}: a continuation line with nothing above it`);
					this.map.set(key, this.map.get(key) + ' ' + line.trim());
					return;
				}
				const m = line.match(/^(\w+\.\w+):\s*(.+)$/);
				if (!m) throw new Error(`${file}:${i + 1}: expected "Function.parameter: text"`);
				if (this.map.has(m[1])) throw new Error(`${file}:${i + 1}: ${m[1]} is described twice`);
				key = m[1];
				this.map.set(key, m[2].trim());
			});
	}

	get(owner, param) {
		const key = `${owner}.${param}`;
		if (!this.map.has(key)) return '';
		this.used.add(key);
		return this.map.get(key);
	}

	/** Called when every page is rendered: a note nobody asked for is for something that does not exist (any more). */
	check() {
		const stale = [...this.map.keys()].filter((k) => !this.used.has(k));
		if (stale.length) throw new Error(`${this.file}: no such function or parameter in the engine API: ${stale.join(', ')}`);
	}
}
