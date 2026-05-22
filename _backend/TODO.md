# TODO

Running backlog for the site. `/run-cycle` reads this, appends new items, and avoids duplicating existing ones.

Format: each item is one bullet. Optional tags in `[brackets]` — `[quick]`, `[medium]`, `[project]`, `[content]`, `[infra]`, `[design]`.

## Active

### Content fidelity
- [ ] Merge or delete one of `2014-11-10-one-small-step.md` and `2014-11-20-Taking-Action-Environmental-Issues.md` — same Gasland / micro-adventures topic. [content] [quick]
- [ ] Spot-check posts with no Squarespace source — fidelity unknown, possibly LLM-puffed. [content] [project]
  - `2012-08-20-Boatless-Sailing.md`
  - `2012-12-15-sanivation-post.md`
  - `2014-06-15-Building-a-Storytelling-Community.md`
  - `2014-12-20-Maker-Projects.md`
  - `2016-08-15-tiny-house-post.md`
  - `2017-05-15-AuxBoard.md`
  - `2017-06-15-social-anchors-post.md`
  - `2018-05-20-Intention.md`
  - `2022-5-30-onebag.md`
  - `2024-06-20-r2ak2024.md`
  - `2025-01-15-access-to-tools.md`
  - `2025-05-27-Finding-Your-Gaps.md`
  - `2025-06-15-yutori.md`
  - `2025-06-20-vanisle-360.md`
- [ ] Verify orphan post dates (only `2014-06-30-pods-in-pods` has a real date from the source). [content] [quick]
- [ ] Reconcile Nairobi Lamp date — `/projects` says "(2011)", post is dated 2018-06-15. [content] [quick]
- [ ] Audit `_posts/` for missing or malformed front matter. [content] [quick]

### Site structure / nav
- [ ] Mirror the `/projects` auto-listing pattern onto `/sailing` and `/mountaineering`. [design] [medium]
- [ ] Refresh `about_page.md` to reflect 2026 context (Astraeus, REAP, Space ROS). [content] [medium]
- [ ] Verify portfolio entries in `_portfolio/` link to underlying posts where they exist. [content] [medium]
- [ ] `/log` could show short_description / image previews — currently just title + date. [design] [medium]

### Infrastructure / repo hygiene
- [ ] Resolve Dependabot vulnerabilities — 4 alerts (1 critical, 3 high). [infra] [quick]
- [ ] Consider installing `jekyll-redirect-from` so `redirect_from:` frontmatter works (currently using a manual stub at `making.html`). [infra] [quick]

### Design / aesthetic (see VISION.md)
- [ ] Settle on direction before sinking time into theming. [design] [project]
- [ ] Decide on substrate for the next phase: stay on Jekyll + plugins, or move to something graph-aware (Quartz, custom, etc.). [design] [project]

## Done

(Move completed items here with a date.)

- 2026-05-22: `.gitignore` added; `_site/`, `vendor/bundle/`, `.DS_Store` untracked.
- 2026-05-22: front-end / back-end divide established (`_backend/`, `_drafts/`, `_archive/` with READMEs).
- 2026-05-22: renamed `making.md` → `projects.md` (`/making` → `/projects`); kept `/making` redirect.
- 2026-05-22: moved Squarespace export out of `_posts/` into `_archive/squarespace-2024/`.
- 2026-05-22: normalized 5 post filenames (spaces → dashes, missing extension, typo fix).
- 2026-05-22: added `CLAUDE.md`, `CHANGELOG.md`, `VISION.md`, `TODO.md`, `/run-cycle` command.
- 2026-05-21: restored blog posts from Squarespace source and wired up images (commit `58df568`).
- 2026-05-21: split Seychelles post — extracted Brain Slicing Robots and Nairobi Lamp into their own posts.
- 2026-05-21: hid `2022-2-6-helloworld.md` via `published: false`.
- 2026-05-21: overrode hack.css dark-mode pseudo-elements that rendered literal `##`/`===` over headings.
- 2026-05-21: re-categorized 7 orphan posts (log → topical) so they surface on `/projects`.
