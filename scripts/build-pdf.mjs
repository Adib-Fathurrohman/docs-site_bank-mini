// Turns the printable document (/print/ and /en/print/, see
// src/components/print/PrintDocument.astro) into A4 PDFs with a cover, a table of
// contents with page numbers, PDF bookmarks and page numbers in the footer.
// Run after `npm run build`; `npm run pdf` does both.
//
//   node scripts/build-pdf.mjs            both languages
//   node scripts/build-pdf.mjs --lang id  Indonesian only (or --lang en)
//
// Writes pdf/Dokumentasi-Bank-Mini.pdf and pdf/Bank-Mini-Documentation.pdf.
//
// Needs a Chromium-based browser. It uses CHROME_PATH when set, otherwise the first
// installed Chrome, Chromium, Edge or Brave it finds, otherwise Playwright's own
// Chromium (`npx playwright-core install chromium`).
//
// Page numbers: every heading listed in the table of contents carries an invisible
// marker. The first PDF is searched for the markers to learn on which page each
// heading landed; the numbers are written into the table of contents (whose space was
// reserved beforehand, so nothing moves), the markers are removed, and the final PDF
// is printed.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright-core';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
const outDir = join(root, 'pdf');

const documents = {
	id: { path: '/print/', file: 'Dokumentasi-Bank-Mini.pdf', footer: 'Dokumentasi Bank Mini', page: 'Halaman' },
	en: { path: '/en/print/', file: 'Bank-Mini-Documentation.pdf', footer: 'Bank Mini Documentation', page: 'Page' },
};

const langArg = process.argv.indexOf('--lang');
const langs = langArg > -1 ? [process.argv[langArg + 1]] : Object.keys(documents);
for (const lang of langs) {
	if (!documents[lang]) throw new Error(`Unknown --lang "${lang}". Use id or en.`);
}
if (!existsSync(join(dist, 'print/index.html'))) {
	console.error('dist/print/ not found. Run `npm run build` first (or `npm run pdf`).');
	process.exit(1);
}

// ---------- Static server for dist/ ----------

const types = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.mjs': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
	'.woff': 'font/woff',
	'.json': 'application/json',
};

const server = createServer(async (req, res) => {
	let path = normalize(decodeURIComponent(new URL(req.url, 'http://local').pathname));
	if (path.endsWith('/')) path += 'index.html';
	const file = join(dist, path);
	try {
		if (!file.startsWith(dist) || !(await stat(file)).isFile()) throw new Error('not found');
		res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
		res.end(await readFile(file));
	} catch {
		res.writeHead(404).end();
	}
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

// ---------- Browser ----------

function findBrowser() {
	if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
	const candidates = {
		darwin: [
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
			'/Applications/Chromium.app/Contents/MacOS/Chromium',
			'/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
			'/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
		],
		linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
		win32: [
			'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
			'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
		],
	}[process.platform] ?? [];
	return candidates.find((path) => existsSync(path));
}

const executablePath = findBrowser();
const browser = await chromium.launch({ executablePath }).catch((error) => {
	console.error(error.message);
	console.error('\nNo usable browser. Install Chrome, set CHROME_PATH, or run `npx playwright-core install chromium`.');
	server.close();
	process.exit(1);
});

// ---------- PDF ----------

async function pagesOfMarks(pdf) {
	const doc = await getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, verbosity: 0 }).promise;
	const pages = new Map();
	for (let n = 1; n <= doc.numPages; n++) {
		const { items } = await (await doc.getPage(n)).getTextContent();
		const text = items.map((item) => item.str ?? '').join('').replace(/\s+/g, '');
		for (const [mark] of text.matchAll(/ZQMARK\d+ZQ/g)) if (!pages.has(mark)) pages.set(mark, n);
	}
	return { pages, count: doc.numPages };
}

function pdfOptions({ footer, page }) {
	const style = "font-family: Helvetica, Arial, sans-serif; font-size: 8px; color: #6b7480;";
	return {
		format: 'A4',
		printBackground: true,
		outline: true,
		tagged: true,
		margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
		displayHeaderFooter: true,
		headerTemplate: '<span></span>',
		footerTemplate: `<div style="${style} width: 100%; padding: 0 16mm; display: flex; justify-content: space-between;">
			<span>${footer}</span><span>${page} <span class="pageNumber"></span> / <span class="totalPages"></span></span>
		</div>`,
	};
}

try {
	await mkdir(outDir, { recursive: true });
	const context = await browser.newContext({ colorScheme: 'light' });

	for (const lang of langs) {
		const doc = documents[lang];
		const page = await context.newPage();
		await page.goto(origin + doc.path, { waitUntil: 'networkidle' });

		// Wait for the page script, every Mermaid diagram and the web fonts.
		await page.waitForFunction(
			() =>
				document.documentElement.dataset.printReady === 'true' &&
				[...document.querySelectorAll('pre.mermaid')].every((pre) => pre.querySelector('svg')),
			null,
			{ timeout: 60_000 },
		);
		await page.evaluate(() => document.fonts.ready);
		const diagrams = await page.locator('pre.mermaid svg').count();

		// Reserve room for the page numbers, then print once to find where headings land.
		await page.evaluate(() => {
			document.querySelector('.print-toc')?.setAttribute('data-paged', '');
			for (const el of document.querySelectorAll('.toc-page')) el.textContent = '000';
		});
		await page.emulateMedia({ media: 'print' });
		const first = await pagesOfMarks(await page.pdf(pdfOptions(doc)));

		const missing = await page.evaluate((pages) => {
			const missing = [];
			for (const el of document.querySelectorAll('.toc-page')) {
				const n = pages[el.dataset.target];
				if (!n) missing.push(el.closest('a')?.textContent?.trim());
				el.textContent = n ? String(n) : '';
			}
			document.querySelectorAll('.pdf-mark').forEach((mark) => mark.remove());
			return missing;
		}, Object.fromEntries(first.pages));
		if (missing.length) console.warn(`[${lang}] no page number found for: ${missing.join('; ')}`);

		const pdf = await page.pdf(pdfOptions(doc));
		const final = await getDocument({ data: new Uint8Array(pdf), isEvalSupported: false, verbosity: 0 }).promise;
		if (final.numPages !== first.count) {
			console.warn(`[${lang}] page count changed between passes (${first.count} → ${final.numPages}); check the table of contents.`);
		}

		const target = join(outDir, doc.file);
		await writeFile(target, pdf);
		const entries = await page.locator('.toc-item').count();
		console.log(
			`[${lang}] ${target.replace(root, '')}: ${final.numPages} pages, ${entries} table of contents entries, ${diagrams} diagrams.`,
		);
		await page.close();
	}
} finally {
	await browser.close();
	server.close();
}
