# Project notes for Claude

Personal site for Sean Kolk — Jekyll-based, deployed via GitHub Pages from the `master` branch of `skolk.github.io`.

## Stack
- Jekyll (Ruby), Kramdown markdown, Sass (compressed)
- Hosted at https://skolk.github.io
- Dependencies via Bundler — `Gemfile`, `Gemfile.lock`

## Common commands
- `bundle install` — install Ruby deps
- `bundle exec jekyll serve` — local dev server at http://localhost:4000
- `bundle exec jekyll serve --drafts` — local dev including `_drafts/`
- `bundle exec jekyll build` — write static site to `_site/`
- `./build-push.sh` — build + push helper

## Front-end / back-end divide

Everything Jekyll *publishes* lives in the front-end. Everything that's for thinking, planning, or archiving lives in the back-end. Jekyll skips any top-level directory starting with `_` that isn't a known collection, so the `_backend/`, `_drafts/`, and `_archive/` folders are auto-excluded from builds.

### Front-end (deployed)
- `_posts/` — blog posts. Filename: `YYYY-MM-DD-Title-With-Dashes.md`. No spaces, no missing dashes.
- `_layouts/`, `_includes/`, `_sass/` — Jekyll theme bits
- `_portfolio/` — portfolio collection
- `images/`, `css/` — static assets
- Top-level standalone pages: `index.html`, `about_page.md`, `log.html`, `sailing.md`, `projects.md`, `mountaineering.md`, `portfolio.html`, `projects_page.md`, `making.html` (redirect stub → `/projects`)

### Back-end (not deployed)
- `_backend/` — **active** working material: `TODO.md`, `VISION.md`, scratch notes, planning. Tracked in git.
- `_drafts/` — posts in progress. Built only with `jekyll serve --drafts`. Move to `_posts/` with a `YYYY-MM-DD-` prefix when ready.
- `_archive/` — **historical** reference material. Currently holds `squarespace-2024/` (original Squarespace export). Read-only by intent.

### Ignored / never committed (`.gitignore`)
- `_site/` (build output)
- `.jekyll-cache/`, `.jekyll-metadata`
- `vendor/bundle/`, `.bundle/`
- `.DS_Store`
- `.scratch/` — convention for laptop-only scratch space

## Conventions
- **Post filenames:** dashes between words, `.md` extension. No spaces.
- **Front matter:** every post needs `layout: post`, `title:`, `date:`, optional `categories:` and `short_description:`.
- **Hidden posts:** add `published: false` to frontmatter rather than deleting.
- **Images:** under `images/blog_posts/`, referenced from posts as `/images/blog_posts/<file>`.
- **Renames:** if a URL moves, leave a redirect stub at the old path (see `making.html` for the pattern). `jekyll-redirect-from` is not installed.
- **Changelog:** structural repo changes go in `CHANGELOG.md` (Keep-a-Changelog style). Update on renames, new sections, deletions.
- **`log.html`:** auto-renders all posts in reverse-chrono. It is NOT a changelog.

## Gotchas
- Don't commit `_site/` — it's gitignored now. If a tool re-stages it, drop it.
- The site has both a curated `/projects` page and per-post auto-listing on it. Categories drive which posts appear — keep them topical (`making`, `fabrication`, etc.), not generic (`log`).
- `hack.css` dark mode adds literal markdown chrome (`##`, `===`) via pseudo-elements. `css/main.scss` overrides them under `body.dark-theme`.
