// Checks that the API reference matches the backend's routes.
//
// 1. Every route in src/data/api-summary.json is documented with <Endpoint> in both
//    languages, and every <Endpoint> refers to a route that exists.
// 2. If the backend repository is available (BACKEND_DIR, default ../bank-mini-laravel),
//    the summary is compared with the live `php artisan route:list --json`.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const summary = JSON.parse(await readFile(join(root, 'src/data/api-summary.json'), 'utf8'));
const key = (method, path) => `${[method].flat().join('|')} ${path}`;
const routes = new Set(summary.endpoints.map((e) => key(e.method, e.path)));

async function endpointsIn(dir) {
	const found = new Map();
	for (const name of await readdir(dir)) {
		if (!name.endsWith('.mdx')) continue;
		const text = await readFile(join(dir, name), 'utf8');
		for (const [, method, path] of text.matchAll(/<Endpoint\s+method="([^"]+)"\s+path="([^"]+)"/g)) {
			found.set(key(method.split('|'), path), name);
		}
	}
	return found;
}

const problems = [];
for (const [label, dir] of [['id', 'src/content/docs/api'], ['en', 'src/content/docs/en/api']]) {
	const documented = await endpointsIn(join(root, dir));
	for (const route of routes) if (!documented.has(route)) problems.push(`[${label}] not documented: ${route}`);
	for (const [route, file] of documented) if (!routes.has(route)) problems.push(`[${label}] ${file}: unknown route ${route}`);
}

const backend = resolve(root, process.env.BACKEND_DIR ?? '../bank-mini-laravel');
if (existsSync(join(backend, 'artisan'))) {
	const live = JSON.parse(execFileSync('php', ['artisan', 'route:list', '--path=api', '--json'], { cwd: backend, encoding: 'utf8' }));
	const liveRoutes = new Set(
		live.map((r) => key(r.method.replace('GET|HEAD', 'GET').split('|'), '/' + r.uri)),
	);
	for (const route of routes) if (!liveRoutes.has(route)) problems.push(`[backend] in summary but not a live route: ${route}`);
	for (const route of liveRoutes) if (!routes.has(route)) problems.push(`[backend] live route missing from summary: ${route}`);
	console.log(`Compared with ${liveRoutes.size} live routes from ${backend}.`);
} else {
	console.log(`Backend not found at ${backend}; skipped the live route comparison.`);
}

if (problems.length) {
	console.error(problems.join('\n'));
	process.exit(1);
}
console.log(`All ${routes.size} routes are documented in Indonesian and English.`);
