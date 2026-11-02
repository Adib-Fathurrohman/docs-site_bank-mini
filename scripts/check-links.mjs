// Checks every internal link in the built site (dist/): the target page must exist
// and, when the link has a #fragment, the target page must contain that id.
// Run after `npm run build`.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;

async function htmlFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = await Promise.all(
		entries.map((entry) => {
			const path = join(dir, entry.name);
			if (entry.isDirectory()) return entry.name === '_astro' || entry.name === 'pagefind' ? [] : htmlFiles(path);
			return entry.name.endsWith('.html') ? [path] : [];
		}),
	);
	return files.flat();
}

// URL path -> file in dist.
function fileFor(pathname) {
	const clean = decodeURIComponent(pathname);
	if (clean.endsWith('/')) return join(dist, clean, 'index.html');
	if (clean.endsWith('.html')) return join(dist, clean);
	return join(dist, clean, 'index.html');
}

const ids = new Map();
async function idsOf(file) {
	if (!ids.has(file)) {
		const html = await readFile(file, 'utf8');
		ids.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
	}
	return ids.get(file);
}

const files = await htmlFiles(dist);
const problems = [];
let checked = 0;

for (const file of files) {
	const html = await readFile(file, 'utf8');
	const page = '/' + relative(dist, file).replace(/index\.html$/, '');
	for (const [, href] of html.matchAll(/<a\s[^>]*href="([^"]+)"/g)) {
		if (/^(https?:|mailto:|tel:|javascript:)/.test(href)) continue;
		const url = new URL(href, 'http://local' + page);
		if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/pagefind/')) continue;
		checked++;
		const target = url.pathname === page && !url.hash ? file : fileFor(url.pathname);
		if (!existsSync(target)) {
			problems.push(`${page}: missing page ${url.pathname}`);
			continue;
		}
		if (url.hash.length > 1) {
			const id = decodeURIComponent(url.hash.slice(1));
			if (!(await idsOf(target)).has(id)) problems.push(`${page}: missing anchor ${url.pathname}${url.hash}`);
		}
	}
}

if (problems.length) {
	console.error([...new Set(problems)].join('\n'));
	console.error(`\n${problems.length} broken link(s) out of ${checked} checked.`);
	process.exit(1);
}
console.log(`All ${checked} internal links in ${files.length} pages are valid.`);
