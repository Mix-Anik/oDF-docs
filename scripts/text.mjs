// What the renderers share: escaping for MDX, the comments of the headers as sentences, and links between the pages.

export const slug = (name) => name.toLowerCase();
export const code = (text) => '`' + text + '`';
export const cap1 = (text) => text.charAt(0).toUpperCase() + text.slice(1);
export const badge = (kind, text) => `<span className="badge badge--${kind}">${text}</span>`;

/** Text that is not code, safe for MDX (no tags, no expressions) and for markdown (no emphasis, no table breaks). */
export const esc = (text) =>
	text
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('{', '&#123;')
		.replaceAll('}', '&#125;')
		.replaceAll('*', '\\*')
		.replaceAll('_', '\\_')
		.replaceAll('|', '\\|');

/** The names a page of one module (client or server) can link to: functions, handler types, structures, constants. */
export class Linker {
	constructor() {
		this.targets = new Map(); // name -> { file, anchor, kind }
	}

	add(name, file, kind, anchor = slug(name)) {
		this.targets.set(name, { file, anchor, kind });
	}

	has(name) {
		return this.targets.has(name);
	}

	isType(name) {
		return this.targets.get(name)?.kind === 'type';
	}

	/** The link to a name from the page `from` (a link inside the page when it is on it). */
	href(name, from) {
		const t = this.targets.get(name);
		return t.file === from ? '#' + t.anchor : `${t.file}#${t.anchor}`;
	}

	link(name, from, text = code(name)) {
		return `[${text}](${this.href(name, from)})`;
	}
}

// a call like Name( args ), a path like \key\value, or any other word
const WORDS = /(?<call>\b[A-Za-z_][A-Za-z0-9_]*(?:\(\s[^()]*\s\)|\(\)))|(?<path>(?:\\[A-Za-z0-9_]+){2,})|(?<word>\b[A-Za-z_][A-Za-z0-9_]*\*?)/g;

/** A word of the comments that is code. A name of a single word (Print, Trace) is also an ordinary word, so it only counts as
 * one in a call: Print( text ). */
function isCode(word, call, linker) {
	return word.endsWith('*') || word.includes('_') || word === 'NULL' || (call && linker.has(word)) || /[a-z][A-Z]/.test(word);
}

/** A sentence of the comments: code-like words become code, names that have a page become links. `own` is the name the
 * text is about (not linked to itself). */
export function inline(text, linker, from, own) {
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
		if (!isCode(base, m.groups.call !== undefined, linker)) out += esc(name);
		else if (linker.has(base) && base !== own && !name.endsWith('*')) out += linker.link(base, from, code(name));
		else out += code(name);
	}
	return out + esc(text.slice(pos));
}

/** Lines of comment (a blank line ends a paragraph) as paragraphs of inline text. */
export function prose(lines, linker, from, own) {
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
	return paras.map((p) => inline(p, linker, from, own)).join('\n\n');
}

/** A C type for a table cell; a structure in it is a link to its description: `const` [`odfcPolyVert_t`](...) `*` */
export function typeCell(type, linker, from) {
	const name = (type.match(/\b[A-Za-z_]\w*\b/g) ?? []).find((w) => linker.isType(w));
	if (!name) return code(type);
	const at = type.indexOf(name);
	const before = type.slice(0, at).trim();
	const after = type.slice(at + name.length).trim();
	return [before && code(before), linker.link(name, from), after && code(after)].filter(Boolean).join(' ');
}
