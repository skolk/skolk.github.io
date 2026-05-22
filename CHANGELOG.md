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

### Changed
- Moved `_posts/SeanAKolk Square Space 2024 /` → `_archive/squarespace-2024/` (also dropped the trailing space in the folder name).
- Moved `TODO.md` and `VISION.md` → `_backend/` so they live with the rest of the planning material.
- Renamed `making.md` → `projects.md` (permalink `/making` → `/projects`); kept `making.html` as a redirect stub so old links still resolve.
- Renamed posts to normalize filenames (spaces → dashes, missing extension/dash fixed, typo corrected):
  - `2018-07-14-Sailing the Adriatic.md` → `2018-07-14-Sailing-the-Adriatic.md`
  - `2019-03-15-Aspiring Mountaineer.md` → `2019-03-15-Aspiring-Mountaineer.md`
  - `2020-09-30goal_setting_post.md` → `2020-09-30-goal_setting_post.md`
  - `2025-05-27-Finding Your Gaps.md` → `2025-05-27-Finding-Your-Gaps.md`
  - `2026-02-23-Costal-Systems` → `2026-02-23-Coastal-Systems.md`

### Removed
- Stopped tracking `_site/` (build output — Pages rebuilds it).
- Stopped tracking `vendor/bundle/` (Ruby deps).
- Stopped tracking every `.DS_Store` in the repo.

## 2026-05-21
### Added
- Restored blog posts from Squarespace source and wired up images (commit `58df568`).
