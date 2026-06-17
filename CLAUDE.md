# Project notes for Claude

Personal site for Sean Kolk. Jekyll-based, deployed via GitHub Pages from the `master` branch of `skolk.github.io`.

## Stack
- Jekyll (Ruby), Kramdown markdown, Sass (compressed)
- Hosted at https://skolk.github.io
- Dependencies via Bundler: `Gemfile`, `Gemfile.lock`

## Common commands
- `bundle install`: install Ruby deps
- `bundle exec jekyll serve`: local dev server at http://localhost:4000
- `bundle exec jekyll serve --drafts`: local dev including `_drafts/`
- `bundle exec jekyll build`: write static site to `_site/`
- `./_backend/bin/build`: guarded `jekyll build` with a hard timeout. Prefer over a bare `jekyll build`, it can't hang silently (see iCloud gotcha below).
- `./_backend/build-push.sh`: build (via `bin/build`) + commit + push helper. Only pushes if the build succeeds.
- `./_backend/bin/lint`: fast static checks (filenames, front matter, comma-categories, broken images, permalinks, tracked artifacts). No build required. Exits non-zero on failure.
- `./_backend/bin/lint --staged`: same, plus refuse if `_site/` / `.DS_Store` / vendor cruft is staged.

## Pre-commit hook
Tracked at `.githooks/pre-commit`. Opt in once per clone:
```
git config core.hooksPath .githooks
```
Bypass for a single commit with `SKIP_LINT=1 git commit ...`.

## Front-end / back-end divide

Everything Jekyll *publishes* lives in the front-end. Everything that's for thinking, planning, archiving, or repo tooling lives in the back-end. Jekyll skips any top-level directory starting with `_` that isn't a known collection, so `_backend/` and `_drafts/` are auto-excluded from builds.

### Front-end (deployed)
- `_posts/`: blog posts. Filename: `YYYY-MM-DD-Title-With-Dashes.md`. No spaces, no missing dashes.
- `_layouts/`, `_includes/`, `_sass/`: Jekyll theme bits.
- `_portfolio/`: portfolio collection.
- `_pages/`: standalone pages and shells with explicit permalinks: `about`, `log`, `now`, `tags`, `sailing`, `mountaineering`, `projects`, `portfolio`, `updates`, `articles`, `trip-reports`, `recaps`, the `making` redirect stub, `404.html`, `feed.xml`. Opted into the build via `include: [_pages]` in `_config.yml`.
- `images/`, `css/`: static assets.
- Root: `index.html` (Jekyll entry).

### Back-end (not deployed)
- `_backend/`: **active** working material. Tracked in git. Contains:
  - `TODO.md`, `VISION.md`, `REFERENCE_SITES.md`, `CHANGELOG.md`: planning and history docs.
  - `bin/`: repo tooling (`lint` static-checks script).
  - `build-push.sh`: build + push helper.
  - `archive/`: **historical** reference material (currently `squarespace-2024/`, the original Squarespace export). Read-only by intent.
- `_drafts/`: posts in progress. Built only with `jekyll serve --drafts`. Move to `_posts/` with a `YYYY-MM-DD-` prefix when ready.

### Ignored / never committed (`.gitignore`)
- `_site/` (build output)
- `.jekyll-cache/`, `.jekyll-metadata`
- `vendor/bundle/`, `.bundle/`
- `.DS_Store`
- `.scratch/`: convention for laptop-only scratch space

## Conventions
- **Post filenames:** dashes between words, `.md` extension. No spaces.
- **Front matter:** every post needs `layout: post`, `title:`, `date:`, optional `categories:`, `short_description:`, and `type:`.
- **Post `type:`**: one of `update`, `trip-report`, `recap`, `project`, `article`. Drives which landing page surfaces the post. Orthogonal to `categories:` (which describes topic, e.g. sailing, climate).
  - `update`: short note, observation, work-in-progress. Lives on `/updates`.
  - `trip-report`: long-form account of an expedition, race, or trip. Lives on `/trip-reports`.
  - `recap`: monthly summary post. Lives on `/recaps` (grouped by year).
  - `project`: project-update post. Lives on `/projects` (under "Project Logs").
  - `article`: long-form essay. Lives on `/articles`.
  - `type:` is optional on existing posts (backfill is opportunistic). Untagged posts still appear on `/log`. `_backend/bin/lint` validates the value when present.
- **`/log`**: the firehose. Every post appears here regardless of `type:`.
- **Hidden posts:** add `published: false` to frontmatter rather than deleting.
- **Em-dashes:** do not use. The em-dash character (`—`, U+2014) is banned site-wide. Use a comma for mid-sentence pauses and asides. Use a colon for label-then-description bullets. Use a period to end a thought. This applies to all `_posts/`, `_pages/`, `_layouts/`, `_includes/`, root-level files, and any planning docs in `_backend/`. If a paste introduces an em-dash, replace it. The lint script may grow a check for this; for now, sweep by hand.
- **Label bullets:** for label-then-description list items, separate the label from its description with a colon, e.g. `- **Label**: description`. Applies to book and work attributions too: `- *Title*, Author` (comma, not em-dash).
- **Links:** when linking a named entity (person, org, institution, expedition, concept), prefer the entity's own official website, then Wikipedia, then a stable canonical page, in that order, whichever exists. Books are the exception: link to Goodreads search (`https://www.goodreads.com/search?q=Title+Author`). Avoid linking to ad-driven aggregators or paywalled pages when a primary source is available.
- **Images:** under `images/blog_posts/`, referenced from posts as `/images/blog_posts/<file>`.
- **Renames:** if a URL moves, leave a redirect stub at the old path (see `making.html` for the pattern). `jekyll-redirect-from` is not installed.
- **Changelog:** structural repo changes go in `CHANGELOG.md` (Keep-a-Changelog style). Update on renames, new sections, deletions.
- **`log.html`:** auto-renders all posts in reverse-chrono. It is NOT a changelog.

## Gotchas
- Don't commit `_site/`. It's gitignored now. If a tool re-stages it, drop it.
- The site has both a curated `/projects` page and per-post auto-listing on it. Categories drive which posts appear, so keep them topical (`making`, `fabrication`, etc.), not generic (`log`).
- `hack.css` dark mode adds literal markdown chrome (`##`, `===`) via pseudo-elements. `css/main.scss` overrides them under `body.dark-theme`.
- **iCloud build hang:** this repo lives under `~/Documents`, which macOS syncs to iCloud. iCloud evicts files to dataless placeholders; the first read blocks in the kernel at 0% CPU while macOS re-downloads them, so a bare `jekyll build` can hang indefinitely with no output. A build that hangs at 0% CPU with no output is this, not a slow build. **Fixed on this machine (2026-06-17):** the culprit was the vendored gem tree, Bundler was installing into `vendor/bundle/` inside the synced repo. `.bundle/config` (gitignored) now sets `BUNDLE_PATH: /Users/seankolk/.bundle/skolk-github-io`, outside iCloud, and the in-repo `vendor/` was deleted; gems no longer evict and builds run in ~1.5s. A fresh clone resets to the in-repo default, re-point `.bundle/config` (`bundle install` then verify `bundle show jekyll` resolves outside `~/Documents`) to restore the fix. Backstop: `./_backend/bin/build` hard-times-out any residual stall (exit 124); `brctl download "$(pwd)"` pulls files local as a fallback.
