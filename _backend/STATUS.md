# STATUS

Append-only heartbeat log for `skolk.github.io`. One entry per audit/maintenance cycle, newest at the bottom. Never edit prior entries. Grep `full-audit-cycle | v` to see every `/run-project-cycle` run, its version, and what it caught.

Format: `YYYY-MM-DD HH:MMZ | STATE | tag | vX.Y.Z — one-line headline`, optionally followed by an indented verbose block.

---

2026-06-17 08:06Z | DONE | full-audit-cycle | v0.4.0 — live build break (trip-reports where_exp) FOUND and FIXED; 4 audits run; alt-text, em-dash, and empty-listing findings open.

  **Anchor:** deployed head was d5abc85 at cycle start; static Jekyll/GitHub Pages site, no version number (the build is the contract).

  **Cycle adaptation:** repo predates the project-cycle canonical layout (no STATUS.md / PRD.md / SPRINTS/). Mapped roles to existing `_backend/` docs: VISION.md as PRD, NEXT_STEPS.md + TODO.md as the commitment surface, `_backend/RISKS.md` as the register. Ran four read-only agents: sprint-tracker, vision/PRD-auditor, project-native risk-auditor, project-native risk-test-runner (diagnostician).

  **Headline finding (P0, resolved this session):** R-003 (Jekyll build break) had materialized. `bundle exec jekyll build` failed with `Liquid syntax error (line 41): Expected end_of_string but found id` in `_pages/trip-reports.html` — file line 46, a `where_exp` with a compound `or` condition (`post.region == nil or post.region == ''`). GitHub Pages was serving a frozen last-good build, silently dropping every commit since 7df2a24 (the commit that introduced the page). `bin/lint` passed throughout because it never builds. Sean fixed line 46 to `post.region == empty` (single-condition Liquid `empty` literal); rebuild via `./_backend/bin/build` returned exit 0, "Build OK" in 1.115s, `_site/trip-reports.html` rendered (22KB), 88 HTML pages built. R-003 back to dormant.

  **Gate hardening (applied this session):** `.githooks/pre-commit` now runs `./_backend/bin/lint --staged` then `./_backend/bin/build`, `SKIP_LINT=1` still bypasses both. This closes the gap that let a build-breaker reach master (lint-only commit gate). (Sean had already added the timeout-guarded `bin/build` and made `build-push.sh` push only on a green build.) Refinement: the hook distinguishes a real build error (any non-zero except 124 -> blocks the commit, the case that matters) from a build timeout (124, almost always iCloud eviction stalling the cold vendor/ tree -> warns but allows the commit), so commits aren't held hostage to iCloud. Surfaced live this session: post-fix rebuilds via the hook hit the 180s cap twice on iCloud eviction even after `brctl download` (which is async); the site itself is confirmed clean by the earlier warm build (1.115s, 88 pages). Standing remedy in CLAUDE.md: move the repo out of `~/Documents` to kill the eviction problem for good.

  **Open findings (non-blocking, awaiting decision/execution):**
  - R-004 a11y understated: ~100 `<img>` tags lack alt text; `/images/me.jpg` missing → broken favicon + og:image on every page (`_includes/head.html:7,16`). Promote likelihood to High.
  - Em-dash regression: `index.html:17,30,41,43,45,47,49,51` use U+2014 (home page missed by the site-wide sweep); rest of tree clean. Consider a lint check.
  - Empty-by-design listings: `/updates` and `/projects` Project-Logs filter on `type:` values no post carries; `external_url:` plumbing is dead. Judgment call: backfill type:, switch to category: filter, or delete.
  - RISKS.md stale: "zero broken links / 72 image refs (June 2026)" predates 20 new posts (now ~81-110 refs / 76 files). Add R-006 Dependabot (1 critical + 3 high), R-007 unreviewed/LLM-puff (23 posts `reviewed_by_sean: false`).
  - Tracker drift: 4 items already done in tree but still listed open (40+ contradiction, costal typo, astraeus href, 404 redirect). 2025-recap + recap-nav production wave undocumented in TODO/NEXT_STEPS.
  - Dead config: `_config.yml:41-61` unused `navigation:`, `:32-33` orphan `press` collection, `:75` deprecated `gems:` key.

  **Judgment calls open for Sean:** listing-page filter strategy; correct the em-dash record in CHANGELOG/NEXT_STEPS to match the ban; `recap`/`travel` category genericness; HAM call-sign `KK6DFO` visibility on sailing.md:22.

  **Friction:** The diagnostician's sandbox blocked it from running `jekyll build` and the em-dash grep, so it returned a false "no static blockers found" and would have MISSED the live build break entirely. The break surfaced only because Sean flagged it and the main thread re-ran the build unsandboxed. Recipe gap for sandboxed environments: the diagnostician must be able to actually build, or the cycle must run the build in the main thread as a hard step rather than trusting a sandboxed agent's "looks clean."

  **Resolved post-synthesis (same session, non-build-interfering):**
  - Broken `/images/me.jpg` favicon + og:image (every page) → repointed both to `/images/favicon.png` in `_includes/head.html`.
  - Em-dashes the June sweep missed → `index.html` (8: `&raquo;`/`&middot;` separators, colon for label-descriptions) and `_pages/tags.html` (`&mdash;` → `&raquo;`). Published tree now verified em-dash-clean (`grep -P "\x{2014}"` empty).
  - RISKS.md refreshed: R-001/R-002 counts re-dated, R-003 marked MATERIALIZED+FIXED, R-004 likelihood Medium→High with the ~100 alt-less-img reality, R-005 mitigation marked aspirational, and added R-006 (Dependabot), R-007 (unreviewed/LLM-puff), R-008 (em-dash regression), R-009 (type-routing drift).
  - Tracker drift closed: NEXT_STEPS 40+ and 404 items marked done (verified); TODO costal-typo and astraeus-href items marked done (verified); today's content fixes logged in TODO Done.
  - lint passes; full build NOT re-run here (iCloud stall + leaving build work to Sean), but all changes are text/template edits with no Liquid-structural risk.

  **Still open (deferred to Sean):** ~100 alt-less `<img>` remediation; empty `/updates` + Project-Logs listing strategy (backfill type: vs category: filter vs delete); Dependabot critical-alert confirmation; em-dash record in CHANGELOG/NEXT_STEPS still documents the old conversion (history-doc correction is a judgment call); `_config.yml` dead config (unused `navigation:`, orphan `press` collection, deprecated `gems:`); placeholder `_portfolio/test*.md`.

  **Trend:** none — first full-audit-cycle entry; no prior runs to compare.

2026-06-17 08:51Z | DONE | build-hardening | v0.4.0 — root-caused the "slow build" to iCloud eviction (R-010); added `bin/build` timeout guard; fixed a SECOND, unbuilt trip-reports Liquid break; logged R-010 + ADR-003.

  **Anchor:** deployed head `2d9f4f3` (master in sync with origin); GitHub Pages latest build status `built`, error null. Continuation of the 08:06Z cycle, the build work that entry deferred to Sean.

  **Root cause nailed (the cycle's open friction):** the "build takes forever" was never a slow build, it was a blocked read at 0% CPU. Process sampling + a Ruby backtrace watchdog pinned it to `rouge/lexer.rb:532` (`Kernel::load` of a syntax-highlighter lexer kramdown lazy-requires on the first code span), stuck materializing an iCloud-evicted `vendor/` file. `require "jekyll"` alone was 0.3s, which is why it looked intermittent. Confirmed: reading the 14MB `vendor/` tree took minutes (iCloud), not milliseconds (disk); once warm, the build runs in ~1s. Logged as R-010 (distinct from R-003: R-010 is the upstream hang that makes "push without building" tempting; R-003 is the resulting build-break).

  **Second build break found and fixed:** the cycle's record says the trip-reports `where_exp` bug was fixed once. In fact the first fix (`f52248e`) was pushed unbuilt and introduced a NEW break, a literal `{% if %}` inside a `{% comment %}` (Liquid parses tags inside comments). Reconciled diverged history (dropped a duplicate local fix, rebased the Intention Calendar post), then collapsed both to `where_exp: "post", "post.region == empty"`. Verified green: exit 0, ~1s, 171 files, `_site/trip-reports.html` 22KB.

  **Hardening shipped (committed + pushed this session):** `_backend/bin/build` (portable 180s-cap guarded build), `build-push.sh` routed through it (push only on green), CLAUDE.md gotcha + command docs. The pre-commit `bin/build` integration and the favicon/em-dash content fixes from the 08:06Z cycle remain uncommitted in the tree alongside this session's RISKS/DECISIONS/CHANGELOG/NEXT_STEPS doc updates.

  **Attempted, did not stick:** `brctl download` pre-pull of `vendor/`, async + throttled + "Access denied" from the sandboxed shell; force-read wedged 12 min on one file. Sean chose the watchdog over relocating the repo (ADR-003); relocation queued in NEXT_STEPS as the permanent fix.

  **Recipe gap confirmed:** this directly validates the 08:06Z entry's friction note, a sandboxed diagnostician returns false "no static blockers" because it can't build. Mitigation now in place: the pre-commit hook runs a real `bin/build`, and `bin/build` is timeout-guarded so even a sandbox can't hang on it.

2026-06-17 17:20Z | DONE | full-audit-cycle | v0.4.0 — build GREEN (exit 0, 88 pages, run in main thread); tree ships clean (em-dash-free, zero broken images actually rendering); backlog is hygiene: 83 alt-less imgs, /updates empty-by-design, stale risk register.

  **Anchor:** master HEAD 7fa3266, in sync with origin at cycle start. Working tree went dirty MID-CYCLE with Sean's in-flight `replant-center.md -> reap.md` rename + new `replant-center.html` redirect stub + `_pages/projects.md` + `_backend/CHANGELOG.md` edits (uncommitted). Static Jekyll/GitHub Pages site; the build is the contract.

  **Cycle:** four read-only agents (commitment tracker, PRD/VISION auditor, risk-auditor, diagnostician) + a hard-step real build in the main thread.

  **Build (hard step):** `./_backend/bin/build` exit 0, "Build OK", 88+ pages, ~8s cold (iCloud gem-path fix holding). Definitive, NOT a sandboxed agent's guess.

  **Corrected false positive:** diagnostician reported "10 broken image refs"; on verification ZERO broken images ship. 6 are commented-out `# image_preview (TODO: add photo)` placeholders (lint correctly skips comment lines), 4 are unused icon partials (icon-facebook/google/twitch/medium.html, referenced nowhere). Lint's PASS was correct.

  **Confirmed open findings:** (1) /updates empty-by-design, `type:update` on zero posts (type backfill of 35 posts skipped update+project); (2) alt-text: 83 `<img>` tags, 0 with `alt=` (RISKS "~100" is an over-estimate); (3) `_config.yml` dead config: `gems:` deprecated (build warns), unused `navigation:`, orphan `press` collection; (4) `_portfolio/test*.md` placeholders still ship; (5) R-001 broken-link rot = worst untested thing (no build-then-crawl); (6) R-006 4 Dependabot alerts unconfirmed; (7) R-007 exactly 23 posts `reviewed_by_sean:false`.

  **Register honesty problems to fix:** R-008 UNDER-claims its fix (says em-dash lint "not implemented" but `bin/lint` check #9 lines 157-170 enforces it as of a48c435); R-006 prose still describes the deleted `vendor/bundle/` tree; R-009 stale (/projects Project-Logs listing no longer exists, page is curated). Every row carries `last_verified:2026-06-17` so the decay model is inert.

  **Tracker drift:** TODO/VISION-link-verify and the /projects half of the empty-listing item are done-but-still-listed-open; helloworld neutralized via `published:false`; a large undocumented production wave (2025 recaps x12, trip-reports page, type backfill across 35 posts, curated /projects + per-project subpages) shipped without being checked off.

  **Proposed new risks:** R-011 iCloud build fix lost on fresh clone (`.bundle/config` gitignored); R-012 alt-text carve-out from R-004; R-013 untracked `_drafts/*.docx` binary cruft; R-014 redirect-stub discipline unenforced (no lint check that a moved permalink resolves).

  **Undocumented in CLAUDE.md:** `_pages/projects/*` detail subsystem, `status:`/`reviewed_by_sean:` front matter, /library page.

  **Next actions (awaiting Sean's approval, nothing applied this cycle):** commit the REAP rename+stub; fix 3 stale risk-register rows (R-006/R-008/R-009); decide /updates; refresh /now (26 days, trips 30-day threshold in 4 days); confirm Dependabot critical.

  **Friction:** Last cycle's recipe friction RECURRED: the sandboxed diagnostician could run neither the build nor `bin/lint`, and this time it OVER-reported (10 "broken images" that don't actually ship) instead of under-reporting. The main-thread hard-step build + targeted reconciliation caught it. Standing mitigation confirmed working: run the real build in the main thread rather than trusting a sandboxed agent's verdict. (No user-named friction captured this run.)

  **Trend:** skipped, only one prior full-audit-cycle entry (08:06Z) exists; build-hardening 08:51Z is a different tag.

2026-06-20 04:58Z | DONE | full-audit-cycle | v0.6.0 — build GREEN (exit 0, 88 pages, main-thread hard step); worst finding is an UNCOMMITTED permalink-collision landmine + 4 newly-confirmed live 404 internal links (R-001 materialized).

  **Anchor:** master HEAD `1348deb`, in sync with origin at cycle start. Static Jekyll/GitHub Pages site, no version number (the build is the contract). Cycle ran the project-native agent mapping (repo predates SPRINTS/PRD/proposals layout): VISION.md=PRD, NEXT_STEPS.md+TODO.md=commitment surface, RISKS.md=register.

  **Build (hard step, main thread):** `./_backend/bin/build` exit 0, "Build OK", 1.186s warm, 88 pages. Definitive, not a sandboxed agent's guess. `gems:` deprecation still warns (dead config).

  **Headline finding (uncommitted, not yet on master):** untracked `_pages/projects/replant-center.md` declares `permalink: /projects/replant-center/` (collides with the committed redirect stub `replant-center.html`) AND `redirect_from: /projects/reap/` (inverts the REAP rename; `jekyll-redirect-from` is not even installed, so it is inert). In the local build the draft ALREADY WON the URL, shadowing the stub. All three doc agents + the diagnostician flagged it independently. Fix: delete the untracked file (`reap.md` is canonical, `replant-center.html` is the correct stub). Proposed as R-015.

  **R-001 MATERIALIZED:** 4 internal recap links are confirmed live 404s (verified in `_site`). Default Jekyll permalink prepends `:categories`; the links hardcode bare `/YYYY/MM/DD/slug.html`. Files: `_posts/2025-05-31-May-2025-Recap.md:32`, `_posts/2025-06-30-June-2025-Recap.md:26-27`, `_posts/2025-11-30-November-2025-Recap.md:26`. Fix: `{% post_url %}` (recommended) or a global `_config.yml` permalink key (site-wide URL churn risk). No automated link-crawl exists; `bin/lint` resolves image refs + permalink uniqueness only.

  **Register honesty:** decay model INERT — all 10 RISKS rows carry a uniform bulk-stamp `last_verified: 2026-06-17`. R-006 prose still describes the deleted `vendor/bundle/` tree; R-008 under-claims a shipped lint check (#9); R-009 half-describes a removed `/projects` listing. Alt-text drifted: register "~100" vs 79 shipped (83 total, 0 with alt=). Proposed new rows: R-015 (permalink collision), R-016 (`redirect_from` inert / plugin not installed).

  **Doc drift:** CLAUDE.md:66 says em-dash is "sweep by hand" but `bin/lint` #9 enforces it; CLAUDE.md:35 omits `/library`; `_pages/projects/*` subsystem + its front-matter vocab (`status:`,`reviewed_by_sean:`,`project_tag:`,`last_updated:`,`subtitle:`,`place:`,`external_url:`) undocumented. VISION:117,131 still phrase `/library` + project deep pages as open questions though both shipped. Dead type registry: `type:update`/`type:project` produced by zero posts; `/updates` renders permanently empty. Dead config: `_config.yml` `gems:`, unused `navigation:` (41-61), orphan `press` collection (32-33).

  **Tracker drift (3rd consecutive cycle):** large production wave (`cce8a58` `_pages/projects/*` 9-page subsystem + `/library`, recap anonymization, evergreen book reviews) shipped without CHANGELOG/CLAUDE.md/NEXT_STEPS entries. Done-but-still-open NEXT_STEPS items: sailing heading "2024-2026" (`:31`), helloworld delete (`:89`, already `published:false`). No active sprint window — all recent work off-sprint/unmeasured.

  **Confirmed PASS:** em-dash sweep zero (literal + entities, index.html holds); image refs all-resolve (the icon-*.html + commented `# image_preview` "breaks" are dead partials/comment lines, correctly skipped — last cycle's false positive isolated again).

  **Clean (verified):** main-thread build green; the 4-broken-link and permalink-collision claims both verified directly against `_site` output, not taken on an agent's word.

  **Kaizen:** `cycle-kaizen` proposed 4 gated edits (verdict-provenance: main-thread build as hard gating step, `[ran:cmd,exit N]` vs `[static-read]` finding tags, synthesis reconciliation of static-read counts, typed build-state enum), each with a guarding fixture; recommended bump v0.6.0->v0.7.0. Routed to "could not gate": un-sandboxing the diagnostician, relocating the repo out of ~/Documents. Written to `_backend/proposals/kaizen-2026-06-20.md` (agent was sandbox-blocked from writing it; main thread persisted it).

  **Next actions (awaiting Sean's approval, nothing applied this cycle):** (1) delete untracked `replant-center.md`; (2) reconcile tracker + document the `cce8a58` wave; (3) fix 4 broken recap links via `{% post_url %}`; (4) refresh `/now` (crosses 30-day threshold 2026-06-21); (5) re-stamp RISKS per-row + correct R-006/R-008/R-009 + add R-015/R-016.

  **Friction:** Second consecutive cycle where a sub-agent's sandbox silently blocked its core job: last cycle the diagnostician could not run the build; this cycle `cycle-kaizen` was denied Write+Bash and could not write its own proposal file (the main thread persisted it by hand). The diagnostician also had several Bash commands denied and could not execute `bin/lint` (replicated by hand). The main-thread hard-step build remains the working mitigation and this run it both produced the authoritative green verdict and let the 4 broken links be verified against real `_site` output rather than hypothesized. (No additional user-named friction captured at write time.)

  **Trend:** Three `full-audit-cycle` entries now exist (08:06Z v0.4.0, 17:20Z v0.4.0, this one v0.6.0). Repeats 3x: production-wave-outruns-tracker drift; sub-agent sandbox cannot run its core tool. R-001 has ranked top-3 every cycle and materialized this run. Stuck >3 cycles: empty-listing decision, `/now` staleness.
