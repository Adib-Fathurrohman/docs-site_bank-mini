// Copies the backend's docs/API_SUMMARY.json into src/data/api-summary.json.
// BACKEND_DIR defaults to ../bank-mini-laravel.
import { copyFile, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const backend = resolve(root, process.env.BACKEND_DIR ?? '../bank-mini-laravel');
const source = join(backend, 'docs/API_SUMMARY.json');
const target = join(root, 'src/data/api-summary.json');

await copyFile(source, target);
const { route_count, generated_from_commit } = JSON.parse(await readFile(target, 'utf8'));
console.log(`Copied ${source} (${route_count} routes, commit ${generated_from_commit}).`);
