# Changelog

All notable changes to this site are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Fixed
- `_posts/2025-06-20-vanisle-360.md`: front-matter `date:` was `2025-08-15` but filename said `2025-06-20`. Race actually ran June 2025. Aligned front matter to `2025-06-20` so the permalink resolves correctly.
- `_posts/2026-02-23-Coastal-Systems.md`: front-matter `date:` was `2026-02-22` but filename said `2026-02-23`. Aligned front matter to `2026-02-23`. Also fixed category typo `costal` → `coastal`.
- `_pages/404.html`: was a meta-refresh redirect to `https://meawoppl.github.io/` (a different person's GitHub Pages site, leftover from a template fork). Replaced with a custom "Navigation error" page using the default layout, with waypoint links into the site.
- `_posts/2025-07-31-July-2025-Recap.md`: unquoted colon in `short_description` (`out loud: am I…`) broke the YAML front matter and failed the Jekyll build. Quoted the value.
- `_pages/trip-reports.html`: two successive Liquid build errors that each failed the Pages build. First, a `where_exp` with a compound `or`/`nil` condition (`post.region == nil or post.region == ''`), `where_exp`'s single-expression parser can't take `or`; introduced in `7df2a24`. The follow-up fix (`f52248e`) was pushed unbuilt and introduced a second break: a literal `{% if %}` inside a `{% comment %}` block (Liquid still parses tags inside comments). Both resolved by collapsing to one `where_exp: "post", "post.region == empty"` (Liquid `empty` matches nil and `""`). See RISKS.md R-003 / R-010.

### Changed
- Converted the Halfway House project page to a redirect: deleted the stub `_pages/projects/halfway-house.md` and added `_pages/projects/halfway-house.html` (manual meta-refresh to the 2016 post, built via `{% post_url %}`). `/projects` now links straight to the post.
- `_pages/projects/r2ak.md`: rewrote the empty stub into a real project page (boat, human propulsion, route, crew model) drawn from the 2024 trip report.
- `_pages/projects/nairobi-house.md`: dated 2018-2019 and cross-linked to the new 2008 interns house, disambiguating the two Kenya co-living houses.
- `_pages/projects.md`: added the new project pages (Adventure Report under Active Projects; PickNik, Sanivation, the Bus, ORGT, and the 2008 Nairobi interns house under Earlier Major Projects); the Halfway House bullet now points to the post.
- Renamed the REAP project page `_pages/projects/replant-center.md` → `reap.md`; permalink `/projects/replant-center/` → `/projects/reap/`, `project_tag` → `reap`. Left a redirect stub at `_pages/projects/replant-center.html` (manual meta-refresh, `jekyll-redirect-from` is not installed) and updated the link in `projects.md`. "Replant Center" was an erroneous name; the org is REAP Climate Center.
- Moved `RISKS.md`, `NEXT_STEPS.md`, `DECISIONS.md`, `DEFINITION_OF_DONE.md` from repo root to `_backend/` (planning docs belong in the back-end per CLAUDE.md; at root Jekyll copied them as web-reachable static files). Updated path references in `.claude/agents/`.
- Editorial consistency pass on the 2026 recaps (Jan–May), per `_backend/RECAP_CLEANUP_PLAN.md`: Jan/Feb spaced hyphens → comma/colon house style (this entry previously read "→ em-dashes"; corrected, the em-dash is banned site-wide and the conversion was reversed by the `80365d1` sweep); Feb label bullets → colon style (Travel reworded); link parity (March "Warm Data" and Feb "Future Food Institute" now linked, matching the Apr/May convention); removed `reviewed_by_sean: false` from the Jan/Feb recaps.

### Added
- Seven `/projects` pages from Sean's life-in-projects walkthrough: `petrichor` (SV Petrichor), `sanivation`, `adventure-report`, `gt-outdoor-rec` (ORGT), `the-bus` (Bessy), `picknik`, and `nairobi-interns-house` (2008). Drafts with confirmed date ranges; each carries a commented-out photo slot (`/images/projects/<slug>.jpg`) and `Needs Sean's input` flags where detail is still pending.
- `_backend/LIFE_IN_PROJECTS.md`, the chronological spine of Sean's projects mapping each life chapter to existing pages versus gaps, with a pointer added from `TODO.md`.
- `_backend/archive/squarespace-2024-docx/`: converted the original Squarespace blog export (`SeanAKolk-SquareSpace-2024.docx`, moved out of `_drafts/`) to markdown via pandoc (`SeanAKolk-SquareSpace-2024.md`, ~1100 lines of original post copy). This `.md` is the source-of-truth **text** for migrating remaining original posts into `_posts/`; it is an artifact, not for direct publication. **Image note, so we never redo this:** the docx embeds 71 images named `imageN.jpg`, but they are renumbered and re-encoded copies of the same photo set already in `images/blog_posts/` and `_backend/archive/squarespace-2024/images/`. They share no byte, name, or dimension match (Squarespace re-exported them), so they cannot be auto-deduped, and they were deliberately NOT re-imported. The `.docx` and its extracted `media/` are kept locally but gitignored (~50MB, redundant); only the text `.md` is committed.
- `CLAUDE.md`, project notes for AI-assisted work (stack, commands, conventions).
- `CHANGELOG.md`, this file.
- `_archive/`, top-level folder for historical reference material not published by Jekyll. Includes `README.md`.
- `_backend/`, top-level folder for active planning material (TODO, VISION, scratch notes). Includes `README.md`.
- `_drafts/`, Jekyll-native location for posts in progress. Includes `README.md`.
- `.gitignore`, covers `_site/`, `.DS_Store`, `vendor/bundle/`, `.jekyll-cache/`, editor cruft.
- `_pages/`, standalone pages now live here (about, log, sailing, mountaineering, projects, portfolio, making, now, tags). Opted in via `include: [_pages]` in `_config.yml`.
- `/now` page, current focus and preoccupations (placeholder copy; needs filling in).
- `/tags` page, category index with post counts, anchored sections per category.
- Footer links to `/feed.xml`, `/now`, `/tags`.
- `bin/lint`, static pre-commit checks (filenames, front matter, comma-categories, image refs, permalinks, tracked artifacts).
- `bin/lint` check #9: em-dash (U+2014) detection in published files, both the literal character and rendered entities (`&mdash;`/`&#8212;`/`&#x2014;`), scoped to the deployed surface (posts/pages/layouts/includes/`index.html`). Enforces the site-wide em-dash ban that was previously sweep-by-hand (RISKS.md R-008).
- `.githooks/pre-commit`, calls `bin/lint --staged`, then a real `bin/build`. Opt in per clone with `git config core.hooksPath .githooks`. Exit-124 (iCloud-stall timeout) warns but allows the commit; any other build failure blocks it.
- `_backend/bin/build`, guarded `jekyll build` with a portable hard timeout (default 180s `BUILD_TIMEOUT`, no coreutils needed). Prevents the iCloud-eviction hang (RISKS.md R-010) from wedging the terminal: a stall fails fast (exit 124) with a `brctl download` / move-out-of-`~/Documents` remedy. `build-push.sh` now builds via `bin/build` and pushes only on a green build.

### Fixed
- 9 broken image references caught by `./bin/lint`. 3 swapped to real inline images (Seychelles, goal-setting, tiny-house). The other 6 were placeholder paths for posts whose photos were never added; commented out as `# image_preview (TODO: add photo): …` until the originals get dropped in.
- 8 posts converted from `categories: a, b, c` (comma-separated, which Jekyll parsed as junk category strings like `"sailing,"` and leaked URLs like `_site/sailing,/`) to YAML list syntax `categories: [a, b, c]`.
- `_posts/2026-02-23-Coastal-Systems.md`: trailing whitespace in front matter (`layout: post ` had a trailing space breaking the layout lookup); typo in `short_description` (`Intelegence` → `Intelligence`).
- 3 post filenames violating the `YYYY-MM-DD-Title-With-Dashes.md` convention renamed via `git mv`:
  - `2016-01-15-Freezing People.md` → `2016-01-15-Freezing-People.md` (space → dash)
  - `2022-2-6-helloworld.md` → `2022-02-06-helloworld.md` (zero-padded)
  - `2022-5-30-onebag.md` → `2022-05-30-onebag.md` (zero-padded)

### Changed
- Moved `_posts/SeanAKolk Square Space 2024 /` → `_archive/squarespace-2024/` (also dropped the trailing space in the folder name).
- Moved `TODO.md` and `VISION.md` → `_backend/` so they live with the rest of the planning material.
- Renamed `making.md` → `projects.md` (permalink `/making` → `/projects`); kept `making.html` as a redirect stub so old links still resolve.
- Fixed missing leading slashes on `log` and `portfolio` permalinks (now `/log`, `/portfolio`).
- Renamed posts to normalize filenames (spaces → dashes, missing extension/dash fixed, typo corrected):
  - `2018-07-14-Sailing the Adriatic.md` → `2018-07-14-Sailing-the-Adriatic.md`
  - `2019-03-15-Aspiring Mountaineer.md` → `2019-03-15-Aspiring-Mountaineer.md`
  - `2020-09-30goal_setting_post.md` → `2020-09-30-goal_setting_post.md`
  - `2025-05-27-Finding Your Gaps.md` → `2025-05-27-Finding-Your-Gaps.md`
  - `2026-02-23-Costal-Systems` → `2026-02-23-Coastal-Systems.md`
  - `2016-01-15-Freezing People.md` → `2016-01-15-Freezing-People.md`
  - `2022-2-6-helloworld.md` → `2022-02-06-helloworld.md` (zero-padded)
  - `2022-5-30-onebag.md` → `2022-05-30-onebag.md` (zero-padded)

### Removed
- Stopped tracking `_site/` (build output, Pages rebuilds it).
- Stopped tracking `vendor/bundle/` (Ruby deps).
- Stopped tracking every `.DS_Store` in the repo.
- Deleted `projects_page.md`, stale duplicate of `projects.md` (same `permalink: /projects`).
- Deleted `docs.md` and `examples.html`, leftover theme demo pages.
- Deleted `_posts/2014-12-20-Maker-Projects.md`, stale draft from the `/making` → `/projects` rename, never a real post (no `title:`/`date:` front matter, body was an about-style HTML page).

## 2026-05-21
### Added
- Restored blog posts from Squarespace source and wired up images (commit `58df568`).
