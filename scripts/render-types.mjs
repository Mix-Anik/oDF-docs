// Renders the type headers of the engine (odfc_types.h, odfs_types.h) into a page of structures and constants.
// The headers are plain C of a fixed style (structures of typed fields, #define and enum constants, // comments), read here
// instead of being described twice: the comments in the header are the documentation.
import { cap1, code, inline, prose, slug, typeCell } from './text.mjs';

/** The structures and constants of a header.
 *   structs:    { name, doc: [lines], fields: [{ name, type, dims, doc }], constants: [...] }
 *   constants:  { name, value, doc, group, struct }   (group: the comment above it, struct: the structure it belongs to) */
export function parseHeader(text) {
	const lines = text.replace(/\r/g, '').split('\n');
	const structs = [];
	const constants = [];
	let comment = []; // the // lines right above
	let block = []; // the constants since the last blank line: a structure that follows owns them
	let inBlockComment = false;
	let divider = false; // between two lines of dashes (the title of a part of the file)

	const stripComment = (line) => {
		const at = line.indexOf('//');
		return at < 0 ? [line.trim(), ''] : [line.slice(0, at).trim(), line.slice(at + 2).trim()];
	};

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (inBlockComment) {
			if (line.includes('*/')) inBlockComment = false;
			continue;
		}
		if (line.startsWith('/*')) {
			inBlockComment = !line.includes('*/');
			continue;
		}
		if (!line) {
			comment = [];
			block = [];
			continue;
		}
		if (line.startsWith('// ---')) {
			divider = !divider;
			comment = [];
			block = [];
			continue;
		}
		if (divider) continue;
		if (line.startsWith('//')) {
			comment.push(line.replace(/^\/\/\s?/, ''));
			continue;
		}

		let m = line.match(/^#define\s+(\w+)\s+(.+?)\s*(?:\/\/\s*(.*))?$/);
		if (m) {
			const c = { name: m[1], value: m[2].trim(), doc: m[3] ?? '', group: comment.join(' '), struct: null };
			constants.push(c);
			block.push(c);
			continue;
		}

		if (/^typedef\s+struct\b/.test(line)) {
			const struct = { name: '', doc: comment, fields: [], constants: [] };
			let pending = [];
			for (i++; i < lines.length; i++) {
				const body = lines[i].trim();
				if (body.startsWith('}')) {
					struct.name = body.match(/^}\s*(\w+)\s*;/)[1];
					break;
				}
				if (!body) continue;
				if (body.startsWith('//')) {
					pending.push(body.replace(/^\/\/\s?/, ''));
					continue;
				}
				const [decl, doc] = stripComment(body);
				const f = decl.match(/^(unsigned\s+(?:char|short|int|long)|[A-Za-z_]\w*)\s+(.+?)\s*;$/);
				if (!f) throw new Error(`cannot read the field "${body}" of a structure`);
				for (const part of f[2].split(',')) {
					const n = part.trim().match(/^(\w+)((?:\[[^\]]+\])*)$/);
					if (!n) throw new Error(`cannot read the field "${part}"`);
					struct.fields.push({ name: n[1], type: f[1], dims: n[2], doc: [...pending, doc].filter(Boolean).join(' ') });
				}
				pending = [];
			}
			for (const c of block) c.struct = struct.name;
			structs.push(struct);
			comment = [];
			block = [];
			continue;
		}

		if (/^enum\b/.test(line)) {
			const group = comment.join(' ');
			let next = 0;
			for (i++; i < lines.length; i++) {
				const body = lines[i].trim();
				if (body.startsWith('}')) break;
				const [decl, doc] = stripComment(body);
				const e = decl.match(/^(\w+)\s*(?:=\s*([^,]+?))?\s*,?$/);
				if (!e) continue;
				const value = e[2] ?? String(next);
				if (/^-?\d+$/.test(value)) next = Number(value) + 1;
				constants.push({ name: e[1], value, doc, group, struct: null });
			}
			comment = [];
			block = [];
		}
	}

	// a constant that is the size of an array of a structure belongs to it (ODFC_MAX_SNAPSHOT_ENTITIES)
	for (const s of structs) {
		const dims = s.fields.map((f) => f.dims).join(' ');
		for (const c of constants) if (!c.struct && new RegExp(`\\b${c.name}\\b`).test(dims)) c.struct = s.name;
		s.constants = constants.filter((c) => c.struct === s.name);
	}
	return { structs, constants };
}

/** Makes the structures and constants of a header known to the linker. */
export function registerTypes(parsed, file, linker) {
	for (const s of parsed.structs) linker.add(s.name, file, 'type');
	for (const c of parsed.constants) linker.add(c.name, file, 'const');
}

export class TypesPage {
	constructor(parsed, file, linker) {
		this.parsed = parsed;
		this.file = file;
		this.linker = linker;
	}

	inline(text, own) {
		return inline(text, this.linker, this.file, own);
	}

	constantTable(list) {
		const o = ['| Constant | Value | |', '|---|---|---|'];
		for (const c of list) {
			// a Link with an id: only headings, list items and Links are anchors for the broken anchor check of Docusaurus
			o.push(`| <Link id="${slug(c.name)}" />${code(c.name)} | ${code(c.value.replaceAll('|', '\\|'))} | ${this.inline(c.doc)} |`);
		}
		return [...o, ''];
	}

	struct(s) {
		const o = ['### ' + s.name, ''];
		const text = prose(s.doc, this.linker, this.file, s.name);
		if (text) o.push(text, '');
		o.push('| Field | Type | |', '|---|---|---|');
		for (const f of s.fields) {
			let type = typeCell(f.type, this.linker, this.file);
			if (f.dims) type = this.linker.isType(f.type) ? `${type} ${code(f.dims)}` : code(f.type + f.dims);
			o.push(`| ${code(f.name)} | ${type} | ${this.inline(f.doc, s.name)} |`);
		}
		o.push('');
		if (s.constants.length) o.push('Constants of this structure:', '', ...this.constantTable(s.constants));
		return o;
	}

	/** The comment above a group of constants is what they are used for: "odfcPlayerState_t.pmType", or a sentence. The heading is
	 * the short start of it (the fields, or the part before the first comma), the rest is a line under it. */
	groupHeading(group) {
		if (!group) return ['Other constants', ''];
		const m = group.match(/^(\w+\.\w+(?:, \w+\.\w+)*)(?:,\s*(.*))?$/) ?? group.match(/^([^,]*)(?:,\s*(.*))?$/);
		const heading = /^[a-z]+(\s|$)/.test(m[1]) ? cap1(m[1]) : m[1];
		return [heading.replaceAll('_', '\\_'), m[2] ? cap1(m[2]) : ''];
	}

	render({ title, kind, position, source }) {
		const o = [
			'---',
			`title: ${title}`,
			`sidebar_label: ${cap1(kind)} types`,
			`sidebar_position: ${position}`,
			`description: The structures and constants of the ${kind} plugin API.`,
			'---',
			'',
			"import Link from '@docusaurus/Link';",
			'',
			`{/* Generated from ${source} by scripts/render-types.mjs - do not edit. */}`,
			'',
			`The data the engine and a ${kind} plugin exchange, as declared in ${code(source)}: plain 32 bit integers, floats and fixed size arrays, laid out the same for the engine and for a plugin. The functions that use them are in the [${cap1(kind)} API](${kind}.mdx).`,
			'',
		];
		if (this.parsed.structs.length) {
			o.push('## Structures', '');
			for (const s of this.parsed.structs) o.push(...this.struct(s));
		}
		const loose = this.parsed.constants.filter((c) => !c.struct);
		if (loose.length) {
			o.push('## Constants', '');
			const groups = new Map();
			for (const c of loose) groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
			for (const [group, list] of groups) {
				const [heading, intro] = this.groupHeading(group);
				o.push('### ' + heading, '');
				if (intro) o.push(this.inline(intro), '');
				o.push(...this.constantTable(list));
			}
		}
		return o.join('\n').replace(/\n+$/, '') + '\n';
	}
}
