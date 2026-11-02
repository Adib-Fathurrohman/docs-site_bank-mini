---
name: update-docs
description: Bring the Bank Mini documentation site (this Astro/Starlight project) up to date after changes in the Laravel backend (../bank-mini-laravel) or the React staff web app (../bank_mini/front-end), then rebuild the site and the PDF. Use when the user says the backend or frontend changed, asks to update, sync or refresh the docs, to document a new endpoint, screen, migration or feature, or in Indonesian "update docs", "perbarui dokumentasi", "sinkronkan docs", "ada perubahan di back-end/front-end", "dokumentasikan fitur baru".
---

# Update the docs after backend or frontend changes

The documentation describes what the code does. This skill finds what changed since
the docs were last synced, updates the affected pages in **both languages**, checks
everything, regenerates the PDF and records the new sync point.

Read `README.md` in this project first if you have not in this session: it holds the
content rules, frontmatter fields and components this skill relies on.

## 1. Find what changed

```bash
npm run changes
```

`scripts/changes.mjs` reads `src/data/sync-state.json` (the backend and frontend
commits the docs were last synced with) and reports for each repository:

- commits since the sync point, plus uncommitted and untracked files;
- **pages citing changed files**: pages whose `sources` frontmatter lists a changed
  file (both languages share one line, e.g. `api/admin.mdx (id + en)`);
- **changed files no page cites**: possibly new features that need new or extended
  pages; tests, seeders, factories and config often explain behaviour too.

Then read the actual changes, not only the file names:

```bash
git -C ../bank-mini-laravel log --stat <synced>..HEAD
git -C ../bank-mini-laravel diff <synced> -- <path>    # includes uncommitted edits
git -C ../bank_mini diff <synced> -- front-end/<path>
```

If either repository has uncommitted changes, tell the user and ask whether to
document them now or wait until they are committed. Uncommitted work may still change.

## 2. Decide what to update

Map each change to the docs before editing anything. Typical mapping:

| Change | Pages to check |
| --- | --- |
| `routes/api.php`, controllers, form requests, resources | `api/*.mdx` (the role's page), `api/index.mdx`, the matching `workflows/*.mdx`, `roles/*.mdx` |
| Services, business rules | `concepts/*.mdx`, `workflows/*.mdx`, `reference/models-and-services.mdx` |
| Migrations, models | `reference/database-schema.mdx`, `reference/models-and-services.mdx` |
| Auth, middleware, rate limits, tokens | `api/authentication.mdx`, `workflows/authentication.mdx`, `reference/security.mdx`, `concepts/roles-and-permissions.mdx` |
| Exceptions, error messages | `api/errors.mdx`, `reference/error-handling.mdx` |
| `.env.example`, `config/*` | `getting-started/configuration.mdx`, `getting-started/installation.mdx` |
| Backend `docs/*.md` | every page that cites that document |
| Frontend screens, routes, features | `clients/` pages (see section 4) |
| Something the code does differently from a backend document | `reference/known-limitations.mdx` |

Give the user a short plan (pages to change, pages to add, anything you will not
document and why) before large edits.

## 3. Backend API changes

When routes were added, removed or changed:

1. The API summary is generated in the backend: `python3 tools/build_api_summary.py`
   (it fails if `tools/api_summary_meta.json` has no entry for a route). That file is
   in the backend repository: if it is out of date, ask the user before editing or
   regenerating anything there.
2. `npm run sync:api` copies `docs/API_SUMMARY.json` into `src/data/api-summary.json`.
3. Document every new route with `<Endpoint method="..." path="..." roles="..." />`
   in `src/content/docs/api/<page>.mdx` **and** `src/content/docs/en/api/<page>.mdx`,
   with the request fields and rules from the form request, the response shape from
   the resource, and the error messages from the code. Remove sections for routes that
   no longer exist.
4. `src/components/EndpointIndex.astro` decides which API page a path belongs to
   (`pageFor`). Check that new paths land on the page where you documented them.
5. `npm run check:api` must pass: every route documented in both languages and the
   summary equal to the live `php artisan route:list`.

## 4. Frontend changes

The frontend (`../bank_mini/front-end`, React staff web app) is documented under
`src/content/docs/clients/` and `src/content/docs/en/clients/`.

- Document only screens and flows that exist in the code. Read the route config,
  layouts, feature folders and their API calls (`src/api/endpoints/*`); do not
  describe designs from `front-end/docs/design/` as if they were built.
- Put pages under `clients/web/<page>.mdx` (and the mobile app later under
  `clients/mobile/`). Subfolders become sidebar subgroups and PDF sections
  automatically; no config change is needed.
- Cite frontend files in `sources` with the `bank_mini/` prefix, e.g.
  `bank_mini/front-end/src/features/teller/CounterPage.tsx`, so `npm run changes`
  can map later frontend changes to the page.
- Update `clients/index.mdx` (status table, what is built) and remove
  `status: coming-soon` from pages once they describe real, working screens.
- Link a screen to the API endpoints and workflow pages it uses rather than
  repeating the API details.

## 5. Writing rules (both languages)

- Every page exists twice with the same file name: `src/content/docs/<path>.mdx`
  (Indonesian) and `src/content/docs/en/<path>.mdx` (English). Change both in the
  same pass, with the same facts, tables, examples and diagrams.
- The code wins over documents. When a backend document and the code disagree,
  describe the code and note the difference in `reference/known-limitations.mdx`.
- Keep identifiers, paths, field names, enum values and code untranslated. Backend
  messages stay in Indonesian in both languages.
- Add every file you used to the page's `sources` frontmatter; remove sources that
  were deleted.
- New page: frontmatter `title`, `description`, `sidebar.order`, `sources`. It
  appears in the sidebar, the PDF and its table of contents automatically.
- Diagrams use the `Mermaid` component; update them when a flow changes.
- Example responses come from the demo database, tokens are written `<token>`.
- When the backend sync point moves, update the commit mentioned in
  `getting-started/introduction.mdx` (both languages) and in `README.md`.

## 6. Check, record the sync point, rebuild the PDF

```bash
npm run validate     # build + internal links + API coverage
```

Fix every failure before moving on. When the docs match the code, record the new sync
point. This writes the current HEADs into `src/data/sync-state.json`, which is also
shown on the PDF cover:

```bash
npm run changes -- --mark
```

Do not mark while documented work is still uncommitted in a repository unless the
user agrees; the recorded commit would not contain it. Then build the PDFs:

```bash
npm run pdf          # pdf/Dokumentasi-Bank-Mini.pdf and pdf/Bank-Mini-Documentation.pdf
```

It prints the page count of each PDF and warns when a table of contents entry has no
page number.

## 7. Report

Tell the user, briefly: which pages were updated or added, what was not documented
and why (unfinished screens, uncommitted work, unclear behaviour), any code vs
document mismatches you found, and the PDF paths. Do not commit unless asked.
