// Renders the API data of the engine (client.json / server.json, written by `gen_api.py --json`) into MDX pages for the
// reference section. Everything about how it looks is decided here; the engine only says what the API is.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PAGES = [
	{ file: 'client', title: 'Client plugin API', kind: 'client', position: 1 },
	{ file: 'server', title: 'Server plugin API', kind: 'server', position: 2 },
];

const WRAP = 100; // a signature longer than this gets a line for each parameter

const slug = (name) => name.toLowerCase();
const code = (text) => '`' + text + '`';
const cap1 = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** Text that is not code, safe for MDX (no tags, no expressions) and for markdown (no emphasis, no table breaks). */
const esc = (text) =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('{', '&#123;')
		.replaceAll('}', '&#125;')
		.replaceAll('*', '\\*')
		.replaceAll('_', '\\_')
		.replaceAll('|', '\\|');

const badge = (kind, text) => `<span className="badge badge--${kind}">${text}</span>`;

// a call like Name( args ), a path like \key\value, or any other word
const WORDS = /(?<call>\b[A-Za-z_][A-Za-z0-9_]*\(\s[^()]*\s\))|(?<path>(?:\\[A-Za-z0-9_]+){2,})|(?<word>\b[A-Za-z_][A-Za-z0-9_]*\*?)/g;

class Page {
	constructor(data) {
		this.api = data;
		this.names = new Set([...data.funcs.map((f) => f.name), ...data.handlers.map((h) => h.name)]);
		this.restricted = new Set(data.caps.filter((c) => c.restricted).map((c) => c.name));
	}

	/** A word of the comments that is code. A name of a single word (Print, Trace) is also an ordinary word, so it only
	 * counts as one in a call: Print( text ). */
	isCode(word, call) {
		return word.endsWith('*') || word.includes('_') || word === 'NULL' || (call && this.names.has(word)) || /[a-z][A-Z]/.test(word);
	}

	/** A sentence of the comments: code-like words become code, names of functions links. */
	inline(text, own) {
		let out = '';
		let pos = 0;
		for (const m of text.matchAll(WORDS)) {
			out += esc(text.slice(pos, m.index));
			pos = m.index + m[0].length;
			if (m.groups.path) {
				out += code(m.groups.path);
				continue;
			}
			const name = m.groups.call ?? m.groups.word;
			const base = name.match(/^[A-Za-z0-9_]*/)[0];
			if (!this.isCode(base, m.groups.call !== undefined)) out += esc(name);
			else if (this.names.has(base) && base !== own && !name.endsWith('*')) out += `[${code(name)}](#${slug(base)})`;
			else out += code(name);
		}
		return out + esc(text.slice(pos));
	}

	prose(lines, own) {
		const paras = [];
		let cur = [];
		for (const line of lines) {
			if (line.trim()) cur.push(line.trim());
			else if (cur.length) {
				paras.push(cur.join(' '));
				cur = [];
			}
		}
		if (cur.length) paras.push(cur.join(' '));
		return paras.map((p) => this.inline(p, own)).join('\n\n');
	}

	// -- parameters ---------------------------------------------------------------------------------------------------

	paramNote(p) {
		const note = [];
		if (p.kind === 'str') note.push('string');
		else if (p.kind === 'strv') note.push(`${code(p.count)} strings`);
		else if (p.kind === 'fn') note.push(`handler, see [${code(p.ctype)}](#${slug(p.ctype)})`);
		else if (p.kind === 'ptrin' || p.kind === 'ptrout') {
			const direction = p.kind === 'ptrin' ? 'the engine reads it' : 'the engine writes it';
			const size = typeof p.count === 'number' ? String(p.count) : code(p.count);
			let what;
			if (p.buffer) what = `${p.cstr ? 'string buffer' : 'buffer'} of ${size} bytes`;
			else if (p.count === null) what = 'one value';
			else what = `${size} values`;
			note.push(`${what}, ${direction}`);
		}
		if (p.nullable) note.push('may be `NULL`');
		return note.join(', ');
	}

	paramTable(params) {
		if (!params.length) return [];
		const rows = params.flatMap((p) =>
			p.kind === 'i64'
				? [
						[p.name + 'Lo', 'unsigned', 'low half of a 64 bit number'],
						[p.name + 'Hi', 'unsigned', 'high half'],
					]
				: [[p.name, p.cType, this.paramNote(p)]],
		);
		const lines = rows.map(([n, t, note]) => `| ${code(n)} | ${code(t)} | ${note.replaceAll('|', '\\|')} |`);
		return ['| Parameter | Type | Notes |', '|---|---|---|', ...lines, ''];
	}

	// -- pieces -------------------------------------------------------------------------------------------------------

	signature(c, name, typedef) {
		const list = c.params.map((p) => (p.type.endsWith('*') ? p.type : p.type + ' ') + p.name);
		const head = typedef ? `typedef ${c.ret} ( *${name} )(` : `${c.ret} ${name}(`;
		if (!list.length) return `${head} void );`;
		const one = `${head} ${list.join(', ')} );`;
		return one.length <= WRAP ? one : `${head}\n${list.map((i) => '\t' + i).join(',\n')}\n);`;
	}

	capBadge(cap) {
		return badge(this.restricted.has(cap) ? 'warning' : 'info', 'capability: ' + cap);
	}

	func(f) {
		const badges = [];
		if (f.kind === 'export') badges.push(badge('success', 'you implement'));
		if (f.cap) badges.push(this.capBadge(f.cap));
		if (f.cheat) badges.push(badge('danger', 'cheats only'));
		if (f.budget === 'init') badges.push(badge('secondary', 'init budget'));
		return this.entry(f.name, badges, this.signature(f.c, f.name, false), f);
	}

	handler(h) {
		return this.entry(h.name, [badge('secondary', 'handler type')], this.signature(h.c, h.typeName, true), h);
	}

	entry(name, badges, signature, item) {
		const o = ['### ' + name, ''];
		if (badges.length) o.push(badges.join(' '), '');
		o.push('```c', signature, '```', '');
		const text = this.prose(item.doc, name);
		if (text) o.push(text, '');
		o.push(...this.paramTable(item.params));
		return o;
	}

	event(e) {
		const o = ['### ' + e.name, ''];
		if (e.cap) o.push(this.capBadge(e.cap), '');
		// the first line repeats the name in quotes, the rest of it is the summary
		const lines = e.doc.map((l, i) => (i === 0 ? l.replace(/^"[^"]*"\s*/, '') : l));
		const summary = [];
		const keys = [];
		const notes = [];
		for (const line of lines) {
			const m = line.trim().match(/^([A-Za-z0-9_]+(?:, [A-Za-z0-9_]+)*)(?:\s{2,}(.+))?$/);
			if (m && summary.length) keys.push([m[1], m[2] ?? '']);
			else if (keys.length) notes.push(line);
			else summary.push(line);
		}
		const text = this.prose(summary);
		if (text) o.push(cap1(text), '');
		if (keys.length) o.push('| Key | Value |', '|---|---|', ...keys.map(([k, d]) => `| ${code(k)} | ${this.inline(d)} |`), '');
		const rest = this.prose(notes);
		if (rest) o.push(rest, '');
		return o;
	}

	// -- page ---------------------------------------------------------------------------------------------------------

	/** 'events (see EventSubscribe). Values are...' -> ['Events', 'See EventSubscribe. Values are...'] */
	splitTitle(text) {
		const m = text.match(/^([^.(]*?)\s*(?:\((.*?)\))?\s*(?:\.\s*(.*))?$/);
		const intro = [m[2] ? cap1(m[2]) + '.' : '', m[3] ?? ''].filter(Boolean).join(' ');
		return [cap1(m[1]), intro];
	}

	render({ title, kind, position }) {
		const api = this.api;
		const o = [
			'---',
			`title: ${title}`,
			`sidebar_label: ${cap1(kind)} API`,
			`sidebar_position: ${position}`,
			`description: Every function, handler and event of the ${kind} plugin API.`,
			'---',
			'',
			`{/* Generated from ${api.source} by scripts/render-api.mjs - do not edit. */}`,
			'',
			`Version ${api.version} of the ${kind} plugin API. Include ${code(api.module + '.h')} in a plugin; the functions and handlers below are what it calls and what it implements. This page is generated from ${code(api.source)} of the engine, which is also what the engine enforces.`,
			'',
		];
		if (api.caps.length) {
			o.push(
				'## Capabilities',
				'',
				'A plugin names the capabilities it needs in its manifest (`caps=`). A function without a capability needs none. Restricted capabilities are only given when named explicitly.',
				'',
				'| Capability | Restricted | Allows |',
				'|---|---|---|',
				...api.caps.map((c) => `| ${code(c.name)} | ${c.restricted ? 'yes' : ''} | ${this.inline(c.doc)} |`),
				'',
			);
		}
		const items = [
			...api.funcs.map((f) => ({ item: f, render: () => this.func(f) })),
			...api.handlers.map((h) => ({ item: h, render: () => this.handler(h) })),
		].sort((a, b) => a.item.seq - b.item.seq);
		const sections = [];
		for (const entry of items) {
			const name = entry.item.section ?? 'functions';
			if (!sections.length || sections.at(-1).name !== name) sections.push({ name, entries: [] });
			sections.at(-1).entries.push(entry);
		}
		for (const s of sections) {
			const [heading, intro] = this.splitTitle(s.name);
			o.push('## ' + heading, '');
			if (intro) o.push(this.inline(intro), '');
			for (const entry of s.entries) o.push(...entry.render());
		}
		if (api.events.length) {
			const [heading, intro] = this.splitTitle(api.eventSection ?? 'events');
			o.push('## ' + heading, '');
			if (intro) o.push(this.inline(intro), '');
			for (const e of api.events) o.push(...this.event(e));
		}
		return o.join('\n').replace(/\n+$/, '') + '\n';
	}
}

export function renderApi(dataDir, outDir) {
	mkdirSync(outDir, { recursive: true });
	for (const page of PAGES) {
		const data = JSON.parse(readFileSync(join(dataDir, page.file + '.json'), 'utf8'));
		writeFileSync(join(outDir, page.file + '.mdx'), new Page(data).render(page));
		console.log('wrote ' + page.file + '.mdx');
	}
}
