// Renders the API data of the engine (client.json / server.json, written by `gen_api.py --json`) into MDX pages for the
// reference section. Everything about how it looks is decided here; the engine only says what the API is.
import { badge, cap1, code, inline, prose, typeCell } from './text.mjs';

const WRAP = 100; // a signature longer than this gets a line for each parameter

/** Makes the functions and handler types of the API known to the linker (they are the targets of links on the page). */
export function registerApi(api, file, linker) {
	for (const f of api.funcs) linker.add(f.name, file, 'func');
	for (const h of api.handlers) linker.add(h.name, file, 'func');
}

export class ApiPage {
	constructor(api, file, linker, notes) {
		this.api = api;
		this.file = file;
		this.linker = linker;
		this.notes = notes;
		this.restricted = new Set(api.caps.filter((c) => c.restricted).map((c) => c.name));
	}

	inline(text, own) {
		return inline(text, this.linker, this.file, own);
	}

	prose(lines, own) {
		return prose(lines, this.linker, this.file, own);
	}

	// -- parameters ---------------------------------------------------------------------------------------------------

	/** A hand-written note (content/param-notes.txt): `code` in it is code, and a name with a page of its own is a link. */
	note(text, own) {
		return text
			.split(/(`[^`]+`)/)
			.map((part) => {
				if (!part.startsWith('`')) return this.inline(part, own);
				const inner = part.slice(1, -1);
				const base = inner.match(/^\w+/)?.[0];
				return base && base !== own && this.linker.has(base) ? this.linker.link(base, this.file, part) : part;
			})
			.join('');
	}

	/** What the engine itself says about a parameter, as far as the type of it does not already (a string needs no note). */
	paramNote(p) {
		const note = [];
		if (p.kind === 'strv') note.push(`${code(p.count)} strings`);
		else if (p.kind === 'fn') note.push(`handler, see ${this.linker.link(p.ctype, this.file)}`);
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

	/** The table of the parameters of `owner` (a function, handler type or export). Its last column is what each is for, then what
	 * the engine says about it; a table where nothing is to be said has no such column. */
	paramTable(params, owner) {
		if (!params.length) return [];
		const cell = (said, engine) => {
			const parts = [said && this.note(said, owner), engine && `<span className="note-engine">${engine.replaceAll('|', '\\|')}</span>`];
			return parts.filter(Boolean).join(' ');
		};
		const rows = params.flatMap((p) => {
			const said = this.notes.get(owner, p.name);
			if (p.kind !== 'i64') return [[p.name, typeCell(p.cType, this.linker, this.file), cell(said, this.paramNote(p))]];
			return [
				[p.name + 'Lo', code('unsigned'), cell(said, 'low half of a 64 bit number')],
				[p.name + 'Hi', code('unsigned'), cell('', 'high half')],
			];
		});
		if (!rows.some((r) => r[2])) return ['| Parameter | Type |', '|---|---|', ...rows.map(([n, t]) => `| ${code(n)} | ${t} |`), ''];
		return ['| Parameter | Type | Description |', '|---|---|---|', ...rows.map(([n, t, d]) => `| ${code(n)} | ${t} | ${d} |`), ''];
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
		o.push(...this.paramTable(item.params, name));
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

	render({ title, kind, position, typesFile }) {
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
			`Version ${api.version} of the ${kind} plugin API. Include ${code(api.module + '.h')} in a plugin; the functions and handlers below are what it calls and what it implements. The structures and constants they use are in [${cap1(kind)} types](${typesFile}). This page is generated from ${code(api.source)} of the engine, which is also what the engine enforces.`,
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
