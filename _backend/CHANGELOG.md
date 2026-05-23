# Changelog

All notable changes to this site are recorded here. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Added
- `CLAUDE.md` — project notes for AI-assisted work (stack, commands, conventions).
- `CHANGELOG.md` — this file.
- `_archive/` — top-level folder for historical reference material not published by Jekyll. Includes `README.md`.
- `_backend/` — top-level folder for active planning material (TODO, VISION, scratch notes). Includes `README.md`.
- `_drafts/` — Jekyll-native location for posts in progress. Includes `README.md`.
- `.gitignore` — covers `_site/`, `.DS_Store`, `vendor/bundle/`, `.jekyll-cache/`, editor cruft.
- `_pages/` — standalone pages now live here (about, log, sailing, mountaineering, projects, portfolio, making, now, tags). Opted in via `include: [_pages]` in `_config.yml`.
- `/now` page — current focus and preoccupations (placeholder copy; needs filling in).
- `/tags` page — category index with post counts, anchored sections per category.
- Footer links to `/feed.xml`, `/now`, `/tags`.
- `bin/lint` — static pre-commit checks (filenames, front matter, comma-categories, image refs, permalinks, tracked artifacts).
- `.githooks/pre-commit` — calls `bin/lint --staged`. Opt in per clone with `git config core.hooksPath .githooks`.

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
- Stopped tracking `_site/` (build output — Pages rebuilds it).
- Stopped tracking `vendor/bundle/` (Ruby deps).
- Stopped tracking every `.DS_Store` in the repo.
- Deleted `projects_page.md` — stale duplicate of `projects.md` (same `permalink: /projects`).
- Deleted `docs.md` and `examples.html` — leftover theme demo pages.
- Deleted `_posts/2014-12-20-Maker-Projects.md` — stale draft from the `/making` → `/projects` rename, never a real post (no `title:`/`date:` front matter, body was an about-style HTML page).

## 2026-05-21
### Added
- Restored blog posts from Squarespace source and wired up images (commit `58df568`).
