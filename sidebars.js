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
				'plugins/architecture',
				{
					type: 'category',
					label: 'Examples',
					link: { type: 'doc', id: 'plugins/examples/index' },
					items: [
						'plugins/examples/hello',
						'plugins/examples/speedometer',
						'plugins/examples/hello-server',
						'plugins/examples/best-time',
						'plugins/examples/http-json',
					],
				},
				{
					type: 'category',
					label: 'API reference',
					items: ['plugins/api/client', 'plugins/api/client-types', 'plugins/api/server', 'plugins/api/server-types'],
				},
			],
		},
	],
};

module.exports = sidebars;
