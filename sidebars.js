// @ts-check
/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
	docs: [
		'intro',
		{
			type: 'category',
			label: 'Plugins',
			link: { type: 'doc', id: 'plugins/overview' },
			items: [
				'plugins/overview',
				{
					type: 'category',
					label: 'API reference',
					items: ['plugins/api/client', 'plugins/api/server'],
				},
			],
		},
	],
};

module.exports = sidebars;
