import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { docsLoader, i18nLoader } from '@astrojs/starlight/loaders';
import { docsSchema, i18nSchema } from '@astrojs/starlight/schema';

export const collections = {
	// Overrides for Starlight's built-in UI strings (src/content/i18n/<lang>.json).
	i18n: defineCollection({ loader: i18nLoader(), schema: i18nSchema() }),
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				// Backend files and documents a page was written from. Shown under the title.
				sources: z.array(z.string()).optional(),
				// "coming-soon" marks a page whose subject is not built yet.
				status: z.enum(['stable', 'coming-soon']).default('stable'),
			}),
		}),
	}),
};
