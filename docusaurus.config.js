// @ts-check
const { themes } = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'oDF',
	tagline: 'Documentation for the oDFs mod and the oDFe engine',
	favicon: 'img/favicon.svg',
	url: 'https://mix-anik.github.io',
	baseUrl: '/oDF-docs/',
	organizationName: 'Mix-Anik',
	projectName: 'oDF-docs',
	trailingSlash: false,
	onBrokenLinks: 'throw',
	onBrokenAnchors: 'throw',

	// Hand-written pages are plain markdown (C code and braces are not JSX); the generated API pages are .mdx.
	markdown: { format: 'detect' },

	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					routeBasePath: '/',
					sidebarPath: './sidebars.js',
					editUrl: 'https://github.com/Mix-Anik/oDF-docs/edit/master/',
				},
				blog: false,
				theme: { customCss: './src/css/custom.css' },
			}),
		],
	],

	themes: [
		[
			'@easyops-cn/docusaurus-search-local',
			{ hashed: true, docsRouteBasePath: '/', indexBlog: false },
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			colorMode: { respectPrefersColorScheme: true },
			navbar: {
				title: 'oDF',
				items: [
					{ type: 'docSidebar', sidebarId: 'docs', position: 'left', label: 'Docs' },
					{ href: 'https://github.com/Mix-Anik/oDFs', label: 'oDFs', position: 'right' },
					{ href: 'https://github.com/Mix-Anik/oDFe-upstream', label: 'oDFe', position: 'right' },
				],
			},
			footer: { style: 'dark', copyright: 'oDF documentation' },
			prism: {
				theme: themes.github,
				darkTheme: themes.dracula,
				additionalLanguages: ['c', 'bash'],
			},
		}),
};

module.exports = config;
