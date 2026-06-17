# Risks

Living register of risks to the integrity, accuracy, and continued operation of `skolk.github.io`. This is a static Jekyll site, not a software product. The "build" is the test. Risks here are about content drift, broken outputs, and operational hiccups, not runtime correctness.

Format:

- **ID**: short stable handle.
- **Title**: one-line risk name.
- **Impact**: 1-5 numeric severity (1 cosmetic, 5 site-down / reputational). Categorical word (Low/Medium/High) kept in parens for humans; the number is what the project-cycle decay model reads.
- **Likelihood**: 1-5 numeric (1 rare, 5 expected to recur). Categorical word in parens.
- **Confidence**: 0-100, how well-characterized and current this row is. Feeds the decay model: `confidence_now = max(50, confidence - 1.67 * days_since(last_verified))`.
- **Last verified**: ISO date the row was last checked against reality.
- **Description**: what could go wrong.
- **Trigger / signal**: how we'd notice.
- **Mitigation**: how we keep it from biting.
- **Contract refs**: automated checks that cover this risk, if any. "none" where the Jekyll build itself is the only contract.
- **Status**: Open / Watching / Mitigated.

Scoring scale: Low=1, Medium=3, High=5 for both impact and likelihood. The project-cycle risk model scores each row as `confidence_now = max(50, confidence - 1.67 * days_since(last_verified))` then `risk_score = impact * likelihood * (1 - confidence_now/100)`. Confidence is treated as coverage/understanding, so a higher confidence and a fresher `last_verified` lower the residual score; let a row's `last_verified` age and its score climbs as the model loses faith that the assessment still holds.

---

## R-001: Broken-link rot

- **Impact**: 3 (Medium)
- **Likelihood**: 5 (High)
- **Confidence**: 70
- **Last verified**: 2026-06-17
- **Description**: Internal slugs change, posts get renamed or deleted, external links die. Markdown links can develop malformed syntax (unclosed parens, missing brackets) from copy-paste edits. The site builds successfully but a visitor hits a dead end.
- **Trigger / signal**: 404s in GitHub Pages logs (not currently monitored), reader complaints, or periodic manual sweep.
- **Mitigation**: Run the broken-link scan in this stabilization cycle. Schedule a quarterly sweep. Consider adding `html-proofer` to a GitHub Actions workflow if maintenance burden grows.
- **Contract refs**: none. No automated link check exists; the scan is manual.
- **Status**: Open. The June 2026 scan (zero broken links) predates ~20 posts added since (2025 + 2026 recaps, trip-reports, intention-calendar, book list with ~61 Goodreads + 16 Wikipedia links). The "zero broken links" claim no longer covers the deployed site. No automated check exists; the quarterly-sweep / html-proofer mitigation is aspirational (no CI, no calendar) until one lands. Re-verify next cycle.

## R-002: Image bitrot

- **Impact**: 1 (Low)
- **Likelihood**: 3 (Medium)
- **Confidence**: 85
- **Last verified**: 2026-06-17
- **Description**: Images in `images/` and `images/blog_posts/` are referenced by absolute paths. If files are renamed, moved, or deleted (cleanup, accidental git checkout), posts go imageless. Some posts depend on hotlinked external images (Drive, S3 buckets, third-party CDNs) that may evaporate.
- **Trigger / signal**: Broken image icon on a page. Visual inspection during the next sweep.
- **Mitigation**: Keep all post images in `images/blog_posts/`. Avoid hotlinking. Verify image refs as part of the broken-link sweep cadence.
- **Contract refs**: `bin/lint` check #4 (image references resolve) runs on every lint/pre-commit.
- **Status**: Watching. The "72 refs" figure is stale (June 2026); as of 2026-06-17 there are ~81 distinct `/images/blog_posts/` references across posts/pages against 76 files. `lint` check #4 verifies refs resolve on every run, so "Watching" is defensible, but re-count and re-date each cycle. Fixed 2026-06-17: a missing `/images/me.jpg` used as favicon + `og:image` in `_includes/head.html` shipped broken on every page; repointed to `/images/favicon.png`.

## R-003: Jekyll build break on push

- **Impact**: 5 (High)
- **Likelihood**: 1 (Low)
- **Confidence**: 90
- **Last verified**: 2026-06-17
- **Description**: A bad change to `_config.yml`, a malformed front matter block, an unsupported Liquid tag, or a plugin version drift can break the GitHub Pages build. The site goes stale or shows the last successful build forever, with no obvious signal unless you check the Actions tab.
- **Trigger / signal**: Email from GitHub about a failed Pages build. The site itself shows old content, easy to miss.
- **Mitigation**: Build locally with `bundle exec jekyll serve` before pushing risky changes (config, layouts, new plugins). Push small commits, not big batches, so a break is easy to bisect. Watch for the GitHub Pages build email.
- **Contract refs**: `.githooks/pre-commit` now runs `_backend/bin/build` after lint, so a build-breaking commit is blocked at commit time (real errors block; iCloud-timeout exit 124 warns, see R-010).
- **Status**: Open. Likelihood scored Low going forward *because* the new pre-commit gate now catches it, but note it MATERIALIZED twice this session. MATERIALIZED 2026-06-17: a `where_exp` compound-`or` condition in `_pages/trip-reports.html` (introduced in `7df2a24`) threw a Liquid syntax error and failed the build. GitHub Pages kept serving the last good build, silently dropping every commit since `7df2a24`. `lint` passed throughout because it never builds. Fixed (`post.region == empty`). New mitigation in place: `.githooks/pre-commit` now runs a real `./_backend/bin/build` after lint, distinguishing a genuine build error (blocks the commit) from an iCloud-eviction timeout (exit 124, warns but allows). This is the exact silent-failure mode the risk describes, now with a gate that catches it. See R-010 for the iCloud-eviction build hang that is the upstream cause: when the build appears to hang, pushing without building is the workaround that let `7df2a24` and `f52248e` reach origin unbuilt.

## R-004: Accessibility regressions

- **Impact**: 3 (Medium)
- **Likelihood**: 5 (High)
- **Confidence**: 85
- **Last verified**: 2026-06-17
- **Description**: New posts and pages drop alt text, use poor heading hierarchy, low-contrast colors, or rely on color alone to convey meaning. The site grows without anyone explicitly checking a11y. Already materialized: as of 2026-06-17 roughly 100 `<img>` tags across posts ship with no `alt` text, and the recent build-photo posts (tiny house, Green Light, intention calendar) added more bare `<img width="100%">` tags. Likelihood promoted from Medium to High to reflect that this is happening, not hypothetical.
- **Trigger / signal**: Reader feedback. A formal audit. Lighthouse score drift.
- **Mitigation**: Ensure every `<img>` has alt text. Use semantic headings (one H1 per page, descending levels). Run Lighthouse on the home page and `/sailing` once a quarter. Avoid color-only signaling in layouts. `lint` check #4 verifies image refs resolve but does NOT check for alt text, the clearest current coverage gap; consider adding an alt-text check to `bin/lint`.
- **Contract refs**: partial. `bin/lint` check #4 covers image-ref resolution only, not alt-text presence (the coverage gap).
- **Status**: Open. The ~100 alt-less `<img>` backlog is the largest concrete instance; remediation not yet started.

## R-005: Stale facts

- **Impact**: 3 (Medium)
- **Likelihood**: 5 (High)
- **Confidence**: 70
- **Last verified**: 2026-06-17
- **Description**: Numbers age. "X years sailing", "Y miles", "currently working at Z" all drift from reality without anyone updating them. Internal contradictions appear when one page is updated but a sibling page is not (e.g., `about.md` says "40+ people" while `sailing.md` says "Nearly 40"). The `/now` page goes stale within weeks.
- **Trigger / signal**: Sean's discomfort reading the page. External question that exposes the gap. The staleness audit in this cycle found six medium-priority and three low-priority items.
- **Mitigation**: Quarterly staleness sweep across `_pages/*.md`. Update `/now` monthly at minimum. Cross-check counts across `about.md`, `sailing.md`, and `projects.md` whenever any of them are touched.
- **Contract refs**: none. No automated freshness check.
- **Status**: Open. See `NEXT_STEPS.md` for the open items from the June 2026 audit. Mitigation is partly aspirational: TODO.md:114 notes the `/now` "Last updated" line goes stale on every edit, TODO.md:125 notes `/now` still ships placeholder copy, and the site runs months behind LinkedIn by Sean's own note. No monthly cadence is currently enforced.

## R-006: Dependency / supply-chain vulnerabilities

- **Impact**: 3 (Medium)
- **Likelihood**: 3 (Medium)
- **Confidence**: 55
- **Last verified**: 2026-06-17
- **Description**: The site builds on a vendored Ruby/Jekyll dependency tree (`Gemfile.lock`, `vendor/bundle/`). Transitive gems develop known CVEs over time. As of the June 2026 cycle there were 4 open Dependabot alerts (1 critical, 3 high) per TODO.md:111; commit `01bac20` bumped Jekyll/kramdown/addressable but it is unconfirmed whether the critical alert is cleared.
- **Trigger / signal**: GitHub Dependabot alerts on the repo. No local audit cadence.
- **Mitigation**: Confirm the current Dependabot alert count; bump flagged gems and re-run `bundle exec jekyll build` to verify the lockfile still resolves. Treat a new critical alert as a release-blocking item.
- **Contract refs**: GitHub Dependabot (external alerting; no local check). Confidence low until the alert count is re-confirmed.
- **Status**: Open. Needs confirmation that `01bac20` cleared the 1 critical / 3 high.

## R-007: Unreviewed / low-fidelity content (LLM-puff)

- **Impact**: 3 (Medium)
- **Likelihood**: 5 (High)
- **Confidence**: 75
- **Last verified**: 2026-06-17
- **Description**: Distinct from R-005 (aging facts): the concern is fabricated or unverified claims published under Sean's name. 23 posts carry `reviewed_by_sean: false`, and TODO.md:11-24 lists ~13 posts with no Squarespace source that may be LLM-puffed (e.g. `2024-06-20-r2ak2024.md`, `2025-06-20-vanisle-360.md`). A reputational, not operational, risk.
- **Trigger / signal**: The `reviewed_by_sean: false` flag is a built-in signal; a reader or Sean noticing an invented detail is the late signal.
- **Mitigation**: Work the spot-check backlog in TODO.md. The R2AK / VanIsle rewrites are the resolution for two of them. Drop the `reviewed_by_sean: false` flag only after a real read. Do not publish new posts with the flag set true-by-omission.
- **Contract refs**: `reviewed_by_sean: false` front-matter flag is a manual signal, not an automated test.
- **Status**: Open. Backlog untouched as of 2026-06-17.

## R-008: Em-dash convention regression

- **Impact**: 1 (Low)
- **Likelihood**: 3 (Medium)
- **Confidence**: 80
- **Last verified**: 2026-06-17
- **Description**: The em-dash (U+2014) is banned site-wide (CLAUDE.md), enforcement is "sweep by hand," and `lint` does not check for it. Regressions recur on paste and on hand-authored templates. The June 2026 site-wide sweep missed `index.html` (8 occurrences on the home page) and `tags.html` used a `&mdash;` entity that rendered the banned glyph.
- **Trigger / signal**: Visual inspection; a future `lint` check.
- **Mitigation**: Add a U+2014 check to `bin/lint` so the gate catches it instead of relying on manual sweeps. Fixed 2026-06-17: `index.html` em-dashes replaced with `&raquo;`/`&middot;`/colon per house style; `tags.html` `&mdash;` replaced with `&raquo;`. Tree is em-dash-clean as of this pass.
- **Contract refs**: none yet. A U+2014 `bin/lint` check is the proposed contract (not implemented).
- **Status**: Watching. Currently clean but untested by automation.

## R-009: Section-index / type-routing drift

- **Impact**: 1 (Low)
- **Likelihood**: 3 (Medium)
- **Confidence**: 70
- **Last verified**: 2026-06-17
- **Description**: The `type:`-driven landing pages (`/trip-reports`, `/recaps`, `/updates`, `/articles`, `/projects` Project-Logs) silently drop or mis-route a post if its `type:` is wrong or absent. `lint` validates the `type:` value when present but cannot tell that a post which *should* be a trip-report simply isn't tagged, so it vanishes from its section while still appearing on `/log`. Separately, `/updates` and Project-Logs filter on `type:` values no post carries, so they render permanently empty.
- **Trigger / signal**: An expected post missing from its section page; a permanently empty listing.
- **Mitigation**: When adding a post, set `type:` deliberately. Decide the empty-listing question (backfill `type:`, switch the pages to `category:` filters, or remove them). The Trip Reports section (`7df2a24`) and recap navigation make this newly load-bearing.
- **Contract refs**: partial. `bin/lint` validates the `type:` *value* when present, but cannot detect a post that should carry a `type:` and doesn't.
- **Status**: Open.

## R-010: iCloud eviction silently hangs the local build

- **Impact**: 3 (Medium)
- **Likelihood**: 5 (High)
- **Confidence**: 90
- **Last verified**: 2026-06-17
- **Description**: The repo lives under `~/Documents`, which macOS syncs to iCloud. iCloud evicts files, including the vendored gems under `vendor/bundle/`, to dataless placeholders. The first read of an evicted file blocks in the kernel (`read()`) at 0% CPU while macOS re-downloads it, so a bare `bundle exec jekyll build` can hang indefinitely with no output, no error, just a wedged process. Diagnosed 2026-06-17 via process sampling + a Ruby backtrace watchdog: the build was parked loading a Rouge syntax-highlighter lexer (`rouge/lexer.rb:532`), which kramdown lazy-requires the first time it converts a code span, so `require "jekyll"` alone (0.3s) never tripped it. This is not a slow build (a slow build burns CPU); it is a blocked read. The real damage is second-order: because the build appears to "take forever," the tempting workaround is to push without building, which is exactly how the build-breakers in `7df2a24` and `f52248e` reached origin (see R-003). So this risk is the upstream cause of R-003's silent-failure mode.
- **Trigger / signal**: `jekyll build` emits the config/Source/Destination lines, prints `Generating...`, then produces no further output while `ps -o %cpu` shows ~0%. Reading `vendor/` is slow (seconds-to-minutes for 14MB instead of milliseconds). `brctl status` (when not "Access denied") shows a download backlog.
- **Mitigation**: Build through `./_backend/bin/build`, which runs `jekyll build` under a portable 180s hard timeout, so a stall fails fast (exit 124) with a clear remedy instead of hanging the terminal. `.githooks/pre-commit` treats exit 124 as warn-not-block so commits aren't held hostage to iCloud, while a real build error still blocks. Pull files local on demand with `brctl download "$(pwd)"` (asynchronous and unreliable from a sandboxed shell). Permanent fix: relocate the repo out of `~/Documents` (e.g. `~/Developer`) or disable iCloud "Desktop & Documents Folders" sync, see ADR-003 and the `NEXT_STEPS.md` build-tooling item. Documented in CLAUDE.md (Gotchas).
- **Contract refs**: `_backend/bin/build` (180s hard timeout, exit 124 on stall) + `.githooks/pre-commit` exit-124 handling. These cap the symptom, not the cause.
- **Status**: Open. The hang-forever symptom is mitigated by `bin/build`'s timeout (a stall now fails in 180s, not never). The root cause persists by choice: Sean elected to keep the repo in `~/Documents` and rely on the watchdog rather than relocate (2026-06-17, ADR-003). Observed live multiple times this session, including after `brctl download`. Re-evaluate if the watchdog stops being enough.

---

## How this file is used

- New risks get appended with the next ID in sequence.
- Impact, likelihood, confidence, last-verified, and status are revisited during inspection cycles. Bump `last_verified` to the review date whenever you re-check a row, that resets the decay model.
- Mitigations should be concrete actions, not aspirations.
- If a risk is permanently mitigated (e.g., we add a CI check that catches it forever), move it to a `## Mitigated risks (archive)` section at the bottom rather than deleting.
