# Bank Mini UKK — documentation site

Technical documentation for **E-Teller Bank Mini Sekolah**, built with
[Astro](https://astro.build) and [Starlight](https://starlight.astro.build).
Indonesian is the primary language (served at `/`), English the secondary one
(served at `/en/`).

The content documents the Laravel backend in `../bank-mini-laravel`. It was written
from the backend code and the documents in its `docs/` folder at commit `9111950`.
The client apps (React staff web app, Expo customer app) are not finished, so their
section only holds a status page for now.

## Requirements

- Node.js 22.23.4 or newer (required by Astro 7)
- npm 9.6.5 or newer

## Commands

Run from this folder.

| Command | Does |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server at http://localhost:4321 with live reload |
| `npm run build` | Static production build into `dist/`, including the search index |
| `npm run preview` | Serve `dist/` locally (search only works in a build, not in `dev`) |
| `npm run check:links` | Check every internal link and `#anchor` in `dist/` (run after a build) |
| `npm run check:api` | Check that every API route is documented in both languages, and compare the route summary with the backend's live routes |
| `npm run sync:api` | Copy the backend's `docs/API_SUMMARY.json` into `src/data/` |
| `npm run changes` | List backend/frontend changes since the docs were last synced, and the pages that cite the changed files (`-- --mark` records the current commits) |
| `npm run validate` | `build` + `check:links` + `check:api` |
| `npm run pdf` | `build`, then the whole documentation as PDF in `pdf/` (see below) |

`check:api` and `sync:api` look for the backend at `../bank-mini-laravel`; set
`BACKEND_DIR` to use another path. The live route comparison runs
`php artisan route:list` and is skipped when the backend is not found.

## PDF

`npm run pdf` writes `pdf/Dokumentasi-Bank-Mini.pdf` (Indonesian) and
`pdf/Bank-Mini-Documentation.pdf` (English): A4, a cover, a table of contents with
page numbers and links, then every page in sidebar order, numbered by section
(1, 1.1, 1.2, …), with PDF bookmarks and page numbers in the footer. For one
language, run `node scripts/build-pdf.mjs --lang id` (or `en`) after a build.

The PDF is printed from `/print/` and `/en/print/`
(`src/components/print/PrintDocument.astro`), which hold the whole documentation on
one page; the page order comes from `src/sidebar.mjs`, so new pages are included
automatically. Printing needs a Chromium-based browser: the script uses `CHROME_PATH`
when set, otherwise an installed Chrome, Chromium, Edge or Brave, otherwise
Playwright's Chromium (`npx playwright-core install chromium`).

## Keeping the docs in sync

`src/data/sync-state.json` records the backend and frontend commits the docs were last
updated to (also shown on the PDF cover). `npm run changes` lists everything that
changed since then and which pages cite the changed files in their `sources`.

In Claude Code, the project skill `/update-docs` (`.claude/skills/update-docs/`) runs
the whole update: find the changes, update both languages, validate, record the new
sync point, and rebuild the PDF.

## Deployment

Production: **https://docs-bank.rumput.tech**, a static build served by nginx on the
`rumput.tech` VPS from `/var/www/rumput/bank-mini/docs/current` (versioned folders in
`releases/`, `current` is a symlink switched only after the release passed its checks).

1. Commit, bump `version` in `package.json`, tag and push: `git tag -a v0.2.2 -m "Docs v0.2.2"`,
   `git push origin main v0.2.2`.
2. Build the artifact (static build with `SITE_URL`, link and API checks, secret scan):
   `deploy/build-release.sh 0.2.2` → `dist-release/rumput-bank-mini-docs-v0.2.2.tar.gz` + `.sha256`.
3. Publish it: `gh release create v0.2.2 dist-release/rumput-bank-mini-docs-v0.2.2.tar.gz
   dist-release/rumput-bank-mini-docs-v0.2.2.tar.gz.sha256 --verify-tag --title "Docs v0.2.2"`.
4. On the VPS: `/var/www/rumput/bank-mini/bin/deploy-docs.sh 0.2.2 <sha256>` (downloads,
   verifies the checksum, checks the build, switches `current`; nothing is restarted).
   Rollback: `/var/www/rumput/bank-mini/bin/rollback-docs.sh <older version>`.

The server copies of the scripts and the nginx vhost are in `deploy/server/`; after editing
them, copy them to `/var/www/rumput/bank-mini/bin/` and `/etc/nginx/sites-available/` again.
The HTTPS certificate is Let's Encrypt (certbot webroot `/var/www/rumput/bank-mini/tmp/acme`,
renewed by certbot's timer).

For any other static host, `SITE_URL=https://… npm run build` and serve `dist/`.

## Project structure

```text
docs-site/
├── .claude/skills/update-docs/   Claude Code skill: update the docs after code changes
├── astro.config.mjs              Starlight config: locales, theme, code blocks
├── public/favicon.svg
├── scripts/
│   ├── build-pdf.mjs             /print/ → pdf/*.pdf with page-numbered table of contents
│   ├── changes.mjs               backend/frontend changes since the last sync → affected pages
│   ├── check-api.mjs             API reference ↔ backend routes
│   ├── check-links.mjs           internal links and anchors in dist/
│   └── sync-api-summary.mjs      copies API_SUMMARY.json from the backend
└── src/
    ├── assets/logo.svg
    ├── components/
    │   ├── Endpoint.astro        method + path + access header for API pages
    │   ├── EndpointIndex.astro   table of all routes, generated from api-summary.json
    │   ├── Mermaid.astro         client-side Mermaid diagram (follows light/dark mode)
    │   ├── overrides/
    │   │   └── PageTitle.astro   breadcrumbs, "coming soon" status, source list
    │   └── print/                the printable document used for the PDF
    ├── pages/print.astro         /print/ (and pages/en/print.astro for /en/print/)
    ├── content/
    │   ├── docs/                 Indonesian pages (root locale)
    │   │   └── en/               English pages, same file names
    │   └── i18n/id.json          overrides for Starlight's Indonesian UI strings
    ├── content.config.ts         adds `sources` and `status` to the page frontmatter
    ├── data/api-summary.json     copy of the backend's docs/API_SUMMARY.json
    ├── data/sync-state.json      backend/frontend commits the docs are synced to
    ├── plugins/table-wrap.mjs    wraps Markdown tables so they fill the width and scroll on phones
    ├── sidebar.mjs               sidebar groups (used by the site and the PDF)
    └── styles/theme.css          colors, typography, tables, sidebar
```

## Writing content

Each page exists twice with the same path: `src/content/docs/<section>/<page>.mdx`
(Indonesian) and `src/content/docs/en/<section>/<page>.mdx` (English). The language
switcher maps between them, so keep the file names identical.

Frontmatter used by this site:

```yaml
---
title: Setor tunai
description: One sentence for search results and link previews.
sidebar:
  order: 4                 # position inside its sidebar group
sources:                   # backend files the page was written from (shown under the title)
  - app/Services/TransactionService.php
status: coming-soon        # optional; marks a page whose subject is not built yet
---
```

Rules for content:

- Describe only what the backend actually does. Check routes, form requests, services
  and resources; when a document and the code disagree, the code wins and the
  difference goes into `reference/known-limitations.mdx`.
- Do not translate identifiers: API paths, fields, enum values, class names and code
  stay as they are. Backend messages stay in Indonesian in both languages, because
  that is what the API returns.
- Label example responses as coming from the demo database, and write tokens as
  `<token>`.
- Mark features that do not exist as not available instead of describing them.

### API endpoints

Use the `Endpoint` component with the exact method and path from
`src/data/api-summary.json`:

```mdx
import Endpoint from '../../../components/Endpoint.astro';

<Endpoint method="POST" path="/api/teller/deposits" roles="teller" />
<Endpoint method="PUT|PATCH" path="/api/admin/settings" roles="admin" />
```

When the backend adds or changes routes: regenerate `docs/API_SUMMARY.json` in the
backend (`python3 tools/build_api_summary.py`), run `npm run sync:api`, document the
change, and run `npm run check:api`.

### Diagrams

Diagrams are Mermaid source inside the page:

```mdx
import Mermaid from '../../../components/Mermaid.astro';

<Mermaid caption="What the diagram shows." chart={`flowchart LR
  A["Teller"] --> B["API"]`} />
```

Mermaid is loaded only on pages that contain a diagram.

## Adding client app documentation later

The **Aplikasi Klien / Client Apps** sidebar group is generated from
`src/content/docs/clients/`. When a client is ready, add pages under
`clients/web/` or `clients/mobile/` (and the same paths under `en/clients/`); they
appear as subgroups automatically, with no config change. Update
`clients/index.mdx` and remove `status: coming-soon` once the section has real content.
Do not document screens or flows before they exist in the app.
