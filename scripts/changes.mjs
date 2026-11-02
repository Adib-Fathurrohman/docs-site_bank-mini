// Lists what changed in the backend and frontend repositories since the commits the
// documentation was last brought up to date with (src/data/sync-state.json), and
// which documentation pages cite the changed files in their `sources` frontmatter.
//
//   npm run changes               report
//   npm run changes -- --mark     after updating the docs: record the current HEADs
//
// Uncommitted changes in a repository are listed too, since the docs may need to
// follow work that is not committed yet.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const stateFile = join(root, 'src/data/sync-state.json');
const state = JSON.parse(await readFile(stateFile, 'utf8'));
const mark = process.argv.includes('--mark');

// Files that never need documentation.
const noise = /(^|\/)(node_modules|vendor|dist|storage|\.DS_Store|package-lock\.json|composer\.lock)(\/|$)/;

const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).replace(/\n+$/, '');

// Page -> sources, read from the frontmatter of every page.
async function pagesWithSources(dir) {
	const pages = [];
	for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile() || !/\.mdx?$/.test(entry.name)) continue;
		const file = join(entry.parentPath, entry.name);
		const frontmatter = (await readFile(file, 'utf8')).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
		const block = frontmatter.match(/^sources:\n((?:[ \t]+- .*\n?)+)/m)?.[1] ?? '';
		const sources = [...block.matchAll(/- (.+)/g)].map((m) => m[1].trim().replace(/^['"]|['"]$/g, ''));
		// Both languages share a path; report them as one page.
		const path = relative(dir, file);
		const page = path.replace(/^en\//, '');
		pages.push({ page, lang: path === page ? 'id' : 'en', sources });
	}
	return pages;
}

const pages = await pagesWithSources(join(root, 'src/content/docs'));
const cites = (source, file) => source === file || file.startsWith(source.replace(/\/?$/, '/'));

for (const [name, repo] of Object.entries(state)) {
	const dir = resolve(root, repo.dir);
	console.log(`\n## ${name} (${repo.dir})`);
	if (!existsSync(join(dir, '.git'))) {
		console.log(`Not a git repository at ${dir}; skipped.`);
		continue;
	}
	const head = git(dir, 'rev-parse', '--short', 'HEAD');
	const dirty = git(dir, 'status', '--porcelain=v1', '-uall')
		.split('\n')
		.filter(Boolean)
		.map((line) => ({ status: line.slice(0, 2).trim() || 'M', file: line.slice(3).replace(/^.* -> /, '') }));

	if (mark) {
		repo.commit = head;
		console.log(`Recorded ${head}.${dirty.length ? ` Note: ${dirty.length} uncommitted file(s) are not part of that commit.` : ''}`);
		continue;
	}

	console.log(`Documented up to ${repo.commit}; HEAD is ${head}.`);
	const log = git(dir, 'log', '--format=%h %ad %s', '--date=short', `${repo.commit}..HEAD`);
	if (log) console.log(`\nCommits since:\n${log.replace(/^/gm, '  ')}`);

	const committed = git(dir, 'diff', '--name-status', '--no-renames', repo.commit, 'HEAD')
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const [status, file] = line.split('\t');
			return { status, file };
		});
	const changes = new Map();
	for (const change of committed) changes.set(change.file, change.status);
	for (const change of dirty) changes.set(change.file, `${change.status} (uncommitted)`);

	const affected = new Map();
	const unmapped = [];
	for (const [file, status] of changes) {
		if (noise.test(file)) continue;
		const cited = repo.sourcePrefix + file;
		const hits = pages.filter((p) => p.sources.some((source) => cites(source, cited)));
		if (!hits.length) unmapped.push(`  ${status.padEnd(15)} ${file}`);
		for (const { page, lang } of hits) {
			if (!affected.has(page)) affected.set(page, { langs: new Set(), files: new Set() });
			affected.get(page).langs.add(lang);
			affected.get(page).files.add(`${file} [${status}]`);
		}
	}

	if (!changes.size) {
		console.log('No changes.');
		continue;
	}
	console.log(`\nPages citing changed files (${affected.size}, under src/content/docs/ and src/content/docs/en/):`);
	for (const [page, { langs, files }] of [...affected].sort()) {
		console.log(`  ${page} (${[...langs].sort().reverse().join(' + ')})\n    ${[...files].join('\n    ')}`);
	}
	console.log(`\nChanged files no page cites (${unmapped.length}) — check whether they need new or extended docs:`);
	console.log(unmapped.join('\n') || '  none');
}

if (mark) {
	await writeFile(stateFile, JSON.stringify(state, null, 2) + '\n');
	console.log(`\nUpdated ${relative(root, stateFile)}.`);
}
