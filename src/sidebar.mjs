// Sidebar groups, shared by astro.config.mjs (the site) and
// src/components/print/outline.ts (the order of the printable document / PDF).
export const sidebar = [
	{
		label: 'Mulai',
		translations: { en: 'Getting Started' },
		items: [{ autogenerate: { directory: 'getting-started' } }],
	},
	{
		label: 'Konsep',
		translations: { en: 'Concepts' },
		items: [{ autogenerate: { directory: 'concepts' } }],
	},
	{
		label: 'Alur Kerja',
		translations: { en: 'Workflows' },
		items: [{ autogenerate: { directory: 'workflows' } }],
	},
	{
		label: 'Peran & Hak Akses',
		translations: { en: 'Roles & Permissions' },
		items: [{ autogenerate: { directory: 'roles' } }],
	},
	{
		label: 'Referensi API',
		translations: { en: 'API Reference' },
		items: [{ autogenerate: { directory: 'api' } }],
	},
	{
		label: 'Referensi Teknis',
		translations: { en: 'Technical Reference' },
		items: [{ autogenerate: { directory: 'reference' } }],
	},
	{
		// Frontend documentation goes here once the clients are finished.
		// Add pages under clients/web/ and clients/mobile/; they appear as subgroups.
		label: 'Aplikasi Klien',
		translations: { en: 'Client Apps' },
		items: [{ autogenerate: { directory: 'clients' } }],
	},
];
