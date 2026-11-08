// The architecture figures of the plugin system, as inline SVG so they follow the theme of the site (colours are CSS variables,
// see .dg in src/css/custom.css). Coordinates are on a grid of 2 px; every box of a figure sits on the same rows.
import React from 'react';

function Figure({ label, caption, viewBox, children }) {
	const [, , w, h] = viewBox.split(' ');
	return (
		<figure className="dg">
			<svg viewBox={viewBox} width={w} height={h} role="img" aria-label={label}>
				<defs>
					<marker id="dg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
						<path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
					</marker>
				</defs>
				{children}
			</svg>
			<figcaption>{caption}</figcaption>
		</figure>
	);
}

/** A box with a bold title and lines of muted text under it. */
function Box({ x, y, w, h, title, lines = [], cls = '' }) {
	return (
		<g>
			<rect className={'box ' + cls} x={x} y={y} width={w} height={h} rx="6" />
			<text className="t" x={x + 12} y={y + 24}>{title}</text>
			{lines.map((l, i) => (
				<text key={i} className="m" x={x + 12} y={y + 42 + i * 17}>{l}</text>
			))}
		</g>
	);
}

/** An arrow along points, with an optional label above its first horizontal part. */
function Arrow({ d, dashed, label, lx, ly, anchor = 'middle' }) {
	return (
		<g>
			<path className={'arrow' + (dashed ? ' dashed' : '')} d={d} markerEnd="url(#dg-arrow)" />
			{label && <text className="m" x={lx} y={ly} textAnchor={anchor}>{label}</text>}
		</g>
	);
}

export function RuntimeDiagram() {
	return (
		<Figure
			viewBox="0 0 960 428"
			label="A plugin runs in a sandbox. Every call it makes into the engine, and every call the engine makes into it, goes through generated glue code that checks pointers, capabilities and the cheat rule."
			caption="A plugin never touches the engine directly: the generated glue is the only way across the sandbox border, in both directions."
		>
			{/* the two zones */}
			<rect className="zone sandbox" x="24" y="44" width="240" height="264" rx="10" />
			<text className="z accent" x="38" y="64">SANDBOX</text>
			<rect className="zone" x="356" y="44" width="588" height="264" rx="10" />
			<text className="z" x="370" y="64">ENGINE (oDFe)</text>

			{/* the plugin */}
			<rect className="box" x="40" y="76" width="208" height="224" rx="6" />
			<text className="t" x="52" y="100">Your plugin</text>
			<text className="m" x="52" y="118">C code compiled to a .qvm</text>
			<line className="rule" x1="52" y1="132" x2="236" y2="132" />
			<text x="52" y="154">Sees only its own memory</text>
			<text x="52" y="172">No files, no network,</text>
			<text x="52" y="188">no system calls</text>
			<text x="52" y="212">Step budget on every call</text>
			<text className="m" x="52" y="228">5M per call, 100M to start</text>
			<text x="52" y="252">A fault stops the plugin;</text>
			<text x="52" y="268">the game goes on</text>

			{/* the generated glue */}
			<rect className="box accent" x="374" y="76" width="200" height="224" rx="6" />
			<text className="t" x="386" y="100">Generated glue</text>
			<text className="m" x="386" y="118">generated from the .api files</text>
			<text className="h" x="386" y="148">Imports: plugin calls</text>
			<text x="386" y="166">pointers, sizes checked</text>
			<text x="386" y="184">capability granted?</text>
			<text x="386" y="202">cheat rule enforced</text>
			<line className="rule" x1="386" y1="216" x2="562" y2="216" />
			<text className="h" x="386" y="238">Exports: engine calls</text>
			<text x="386" y="254">OnInit, OnFrame, ...</text>
			<text x="386" y="270">arguments are copied into</text>
			<text x="386" y="286">the plugin's I/O buffer</text>

			{/* the engine */}
			<rect className="box" x="684" y="76" width="248" height="156" rx="6" />
			<text className="t" x="696" y="100">Engine functions</text>
			<text className="h" x="696" y="124">Client plugins</text>
			<text className="m" x="696" y="142">snapshots, traces, player state,</text>
			<text className="m" x="696" y="158">drawing, cvars, commands, demos</text>
			<text className="h" x="696" y="182">Server plugins</text>
			<text className="m" x="696" y="200">clients, chat commands, events,</text>
			<text className="m" x="696" y="216">HTTP, file store, login result</text>
			<Box x={684} y={244} w={248} h={56} title="Engine main loop" lines={['frame, map load, events, chat']} />

			{/* calls */}
			<Arrow d="M248,176 H374" label="plugin calls" lx={311} ly={168} />
			<Arrow d="M574,176 H684" label="if checks pass" lx={629} ly={168} />
			<Arrow d="M684,262 H574" dashed label="frame, events" lx={629} ly={254} />
			<Arrow d="M374,262 H248" dashed label="engine calls" lx={311} ly={254} />

			{/* what feeds the system */}
			<Box x={24} y={348} w={240} h={64} title="plugins/name.qvm" lines={['in the home path', 'checked when it is loaded']} />
			<Arrow d="M144,348 V310" label="loaded at start" lx={154} ly={334} anchor="start" />
			<Box x={374} y={348} w={200} h={64} title="Capability grants" lines={['server: sv_plugins', 'client: all of them']} />
			<Arrow d="M474,348 V302"label="grants" lx={484} ly={334} anchor="start" />
			<Box x={684} y={348} w={248} h={64} title="Game module (the mod)" lines={['cgame (client) or game (server)', 'hands data to the engine']} />
			<Arrow d="M808,348 V310" label="trap_ODF_*, trap_Event" lx={798} ly={334} anchor="end" />
		</Figure>
	);
}

export function SourceDiagram() {
	return (
		<Figure
			viewBox="0 0 960 352"
			label="The API is written once in the .api files. gen_api.py generates the headers for plugins, the checked dispatcher of the engine and the data for this reference from it."
			caption="One description of the interface produces both sides of it and this reference, so none of them can disagree."
		>
			<Box x={24} y={140} w={210} h={84} title="client.api, server.api" lines={['the one description of the', 'interface, in the engine repo']} cls="accent" />
			<text className="m" x="24" y="252">tests/plugin_api checks that</text>
			<text className="m" x="24" y="269">the generated files are current</text>
			<Arrow d="M234,182 H256" />
			<rect className="box" x="256" y="162" width="104" height="40" rx="6" />
			<text className="t" x="308" y="187" textAnchor="middle">gen_api.py</text>

			<Arrow d="M360,182 H385 V80 H410" />
			<Arrow d="M360,182 H410" />
			<Arrow d="M360,182 H385 V300 H410" />

			<Box x={410} y={45} w={240} h={70} title="include/odfc.h, odfs.h" lines={['plugin side: declarations,', 'syscall stubs, entry points']} />
			<Box x={410} y={147} w={240} h={70} title="generated/*_plugin_api.inc" lines={['engine side: argument checks,', 'import table, export calls']} />
			<Box x={410} y={265} w={240} h={70} title="client.json, server.json" lines={['data for this API reference', '(gen_api.py --json)']} />

			<Arrow d="M650,80 H700" />
			<Arrow d="M650,182 H700" label="built in" lx={675} ly={174} />
			<Arrow d="M650,300 H700" />

			<Box x={700} y={45} w={236} h={70} title="odf-build" lines={['your plugin.c + these headers', 'gives name.qvm']} />
			<Box x={700} y={147} w={236} h={70} title="Engine" lines={['dispatcher and export calls', 'loads name.qvm at startup']} />
			<Box x={700} y={265} w={236} h={70} title="oDF-docs (this site)" lines={['generate.mjs renders the', 'reference on every build']} />
			<Arrow d="M818,115 V147" label="name.qvm" lx={828} ly={135} anchor="start" />
		</Figure>
	);
}
