// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { satteri } from '@astrojs/markdown-satteri';
import { tableWrap } from './src/plugins/table-wrap.mjs';
import { sidebar } from './src/sidebar.mjs';

// Set SITE_URL when deploying (used for the sitemap and canonical links).
const site = process.env.SITE_URL || undefined;

export default defineConfig({
	site,
	markdown: {
		// Astro's default Markdown processor, with tables wrapped for horizontal scrolling.
		processor: satteri({ hastPlugins: [tableWrap] }),
	},
	vite: {
		// Mermaid's chunks are large but loaded only on pages that contain a diagram.
		build: { chunkSizeWarningLimit: 2500 },
	},
	integrations: [
		starlight({
			title: {
				id: 'Dokumentasi Bank Mini',
				en: 'Bank Mini Docs',
			},
			description: 'Technical documentation for E-Teller Bank Mini Sekolah (UKK).',
			logo: { src: './src/assets/logo.svg' },
			favicon: '/favicon.svg',
			defaultLocale: 'root',
			locales: {
				root: { label: 'Bahasa Indonesia', lang: 'id' },
				en: { label: 'English', lang: 'en' },
			},
			customCss: ['@fontsource-variable/inter', './src/styles/theme.css'],
			components: {
				PageTitle: './src/components/overrides/PageTitle.astro',
			},
			tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
			lastUpdated: false,
			pagination: true,
			expressiveCode: {
				themes: ['github-light', 'github-dark-dimmed'],
				styleOverrides: {
					borderRadius: '0.5rem',
					codeFontFamily: 'var(--sl-font-mono)',
					codeFontSize: '0.8125rem',
					frames: { shadowColor: 'transparent' },
				},
			},
			sidebar,
		}),
	],
});
