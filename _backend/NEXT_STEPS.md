# Next Steps

What's queued up for `skolk.github.io`. Sean owns prioritization. Claude can pick from the unblocked items in an inspection cycle.

Format:

- **Item**: one-line description.
- **Why**: the motivation, in a sentence.
- **Owner**: Sean unless noted.
- **Effort**: S (under 30 min), M (under 2 hr), L (more).
- **Status**: queued / in-flight / done / dropped.

---

## From the June 2026 stabilization audit

### Stale facts (from RISKS.md R-005)

- **Item**: Resolve "40+ people" vs "Nearly 40" inconsistency between `about.md` and `sailing.md`. Pick one number, apply both places.
  - **Why**: Internal contradiction is the kind of thing readers notice.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: done (June 2026 cycle, verified 2026-06-17: `about.md:18,36` and `sailing.md:8,125` all read "40+").

- **Item**: Verify RYA Yachtmaster Offshore (2026) status in `sailing.md` line 22. Currently reads as completed.
  - **Why**: If in-progress vs. in-hand, the framing should change.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

- **Item**: Rename `sailing.md` heading "Recent Highlights (2024-2025)" to include 2026, or extend the year range.
  - **Why**: Mid-2026, "2024-2025" reads as a year out of date.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

- **Item**: Refresh `/now` page. Last updated 2026-05-22.
  - **Why**: `/now` is a commitment to a roughly monthly refresh. Drifting past 30 days defeats the point.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Decide on the gap in `mountaineering.md`. Peaks listed end in 2020. If there are climbs from 2021 to 2026, add them. If not, name the pause.
  - **Why**: Five-year gap in a list is itself a story; readers will infer something.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Verify vessel ownership on `sailing.md` line 16. "Vessels owned" reads present-tense; some entries may be past.
  - **Why**: Catalina 36 sailed Baja Ha-Ha in 2021 and Sea of Cortez in 2022; current status unstated.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

### Site behavior

- **Item**: Decide what `_pages/404.html` should do. It currently meta-refreshes to `https://meawoppl.github.io/`, a different person's site. Almost certainly leftover from a template fork.
  - **Why**: Sending every 404 off-site to a stranger's domain is not the intended UX for `skolk.github.io`.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: done (shipped in `927d406`, verified 2026-06-17: `404.html` is now a proper navigation-error page with valid internal links, no off-site redirect).

- **Item**: Decide how to handle empty listing pages. `updates.html` and `projects.md`'s "Selected Projects" section filter on `type:` front matter that no posts carry, so they always show the empty state. Either tag posts with the matching `type:` or remove the listing.
  - **Why**: An empty listing on a portfolio site looks unfinished.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

### Operational hygiene

- **Item**: Quarterly broken-link and staleness sweep cadence.
  - **Why**: Both link rot and fact drift accumulate silently. The June 2026 audit was clean on links but found nine stale items.
  - **Owner**: Sean (calendar block) and Claude (execution).
  - **Effort**: M each cycle.
  - **Status**: queued.

- **Item**: Confirm `_backend/TODO.md` and `_backend/VISION.md` exist on `master` and that the `/now` page links to them on the correct branch.
  - **Why**: `/now` line 21-22 link there; broken if the files moved or the branch renamed.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

---

## From the June 2026 editor's pass on the log

Full notes: `_backend/EDITORS_PASS_2026-06-LOG.md`. The five-item shortlist:

- **Item**: Delete the Hello World test stub post.
  - **Why**: Scaffolding left in the frame on a live log.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: done (verified 2026-06-22, full-audit-cycle v0.6.0: removed in `3d56316` "Remove placeholder scaffolding"; no `helloworld` file in tree or `git ls-files`).

- **Item**: Draw the calendar-as-a-circle diagram and drop it into "One Step a Day" (goal setting).
  - **Why**: The post already references it ("PDF of Calendar here") and the link is missing. Highest-leverage diagram in the set.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Pull existing SVG route maps from `/sailing` into Seychelles, Dar-Tanga, and Split posts.
  - **Why**: Ties the sailing page to the matching log entries and beats any stock photo.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Add a one-paragraph framing intro to Seychelles, Halfway House, and Freezing People naming the real subject.
  - **Why**: Logbook format buries the thesis; the framing paragraph turns the day-by-day into evidence for a point.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Make two small "model" diagrams: inclusive / exclusive spectrum (Social Anchors), comfort dial (Subnautica).
  - **Why**: Doubles as visual-thinking practice and gives both posts a sticky takeaway image.
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

---

## From the June 2026 recap editorial scan

Full plan: `_backend/RECAP_CLEANUP_PLAN.md`.

- **Item**: Editorial consistency pass on the five 2026 recaps (Jan–May), dash style (Jan/Feb spaced hyphens normalized to comma/colon house style, no em-dashes, per the site-wide ban), label-bullet colons, link parity (March Warm Data, Feb Future Food Institute), Reading-section format, and `reviewed_by_sean` flag removal.
  - **Why**: Jan/Feb were written after the Mar–May standardization and drifted from the house style and link conventions.
  - **Owner**: Claude (execution), Sean (judgment calls).
  - **Effort**: M.
  - **Status**: done (June 2026 cycle, also fixed a YAML build break in the July 2025 recap surfaced during verification).

---

## Build tooling / iCloud (from RISKS.md R-010, ADR-003)

- **Item**: End iCloud eviction of the gem tree (root cause of the build hang).
  - **Why**: `bin/build`'s timeout only stops the hang; the build stayed slow (a 286s materialization-bound build) while `vendor/` lived inside iCloud-synced `~/Documents`.
  - **Owner**: Sean / Claude.
  - **Effort**: S.
  - **Status**: done 2026-06-17. Instead of relocating the whole repo (more invasive), moved only the gem path: `.bundle/config` now sets `BUNDLE_PATH` to `~/.bundle/skolk-github-io` (outside iCloud) and the in-repo `vendor/` was deleted. Build back to ~1.4s, no stalls. See RISKS.md R-010 and ADR-003. Note: laptop-local (`.bundle/config` is gitignored), so re-apply on a fresh clone.

- **Item**: Re-run `./_backend/bin/build` once `vendor/` is warm (fully materialized) to confirm a clean exit-0 build, not just a timeout-allowed commit.
  - **Why**: The pre-commit hook lets a 124 timeout through, so a green build should be confirmed manually after the iCloud download settles. The warm build on 2026-06-17 was clean (1.0s, 171 files), re-confirm after any large vendor change.
  - **Owner**: Sean or Claude.
  - **Effort**: S.
  - **Status**: queued.

---

## From the 2026-06-22 full-audit-cycle (v0.6.0)

Full report in `_backend/STATUS.md` (entry `2026-06-22 16:57Z`). Sean owns execution; queued for "later."

### Done this session (uncommitted)

- **Item**: Remove stray tool-call tags (`</content>` / `</invoke>`) leaked into two published files.
  - **Why**: They render as literal garbage text on the live page (`/projects/petrichor/`, reported by Sean) and on the tiny-house post.
  - **Owner**: Claude (fix made), Sean (commit).
  - **Effort**: S.
  - **Status**: in-flight. Fixes applied to `_pages/projects/petrichor.md` and `_posts/2016-08-15-tiny-house-post.md`, but UNCOMMITTED, master HEAD `9c4279c` still ships the tags until committed. A third file, `_posts/2026-05-20-bahamas-green-coco-expeditions.md`, is also dirty (a clean content rewrite, no stray tags).

### Ranked next actions

- **Item**: Commit the 3 dirty working-tree files so the stray-tag removal reaches master.
  - **Why**: The P0 defect Sean reported is live until committed.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

- **Item**: Refresh `/now` (still `2026-05-22`, now 30+ days stale).
  - **Why**: Only dated commitment on the site, breached past the 30-day threshold. (Carried from the June stabilization audit, still open.)
  - **Owner**: Sean.
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Reconcile the tracker + document the talk-file wave.
  - **Why**: 4th consecutive cycle where shipped work outran the tracker. `_backend/talks/` (`9c4279c`, README + 3 talk files + 2 Alaska drafts) has zero CHANGELOG/TODO/CLAUDE entry; the recap `post_url` fix (`08636b5`) is undocumented in CHANGELOG; portfolio test stubs (`TODO.md:46`) were deleted in `3d56316` but still listed open.
  - **Owner**: Claude (execution), Sean (review).
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Re-stamp `RISKS.md` per-row and fix register honesty.
  - **Why**: All 10 rows carry a uniform `last_verified: 2026-06-17` so the decay model can't discriminate. R-008 under-claims (em-dash lint shipped as `bin/lint:158-171` check #9); R-006 describes the deleted `vendor/bundle/` tree; R-009 is half-stale (the `/projects` auto-list it describes is gone). R-001's recap-404 instance is resolved (`08636b5`) but the systemic risk is unchanged. Decide whether to append R-015 (permalink collision, verified resolved) and R-016 (`redirect_from` inert, by-design) or drop them, prior STATUS entries cite R-011..R-016 but the file ends at R-010.
  - **Owner**: Claude (execution), Sean (judgment).
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Document the three shipped subsystems in `CLAUDE.md` + fix the em-dash line.
  - **Why**: `CLAUDE.md` has no spec for the `_pages/projects/*` 16-page detail system + its front-matter vocab (`subtitle`/`project_tag`/`status`∈{draft,active,seeking-partners}/`reviewed_by_sean`/`last_updated`/`dates`), the `/library` page, or the `_backend/talks/` system. `CLAUDE.md:66` still says em-dash is "sweep by hand" though `bin/lint` #9 enforces it.
  - **Owner**: Claude (execution), Sean (review).
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Clean dead config in `_config.yml`.
  - **Why**: `gems:` (`:75`) is deprecated and warns on every build; the `navigation:` block (`:41-61`) is unused (the template hardcodes the menu and disagrees with it); the `press:` collection (`:32-34`) is an orphan with no `_press/`.
  - **Owner**: Sean.
  - **Effort**: S.
  - **Status**: queued.

- **Item**: Stand up an automated broken-link crawl (R-001, worst untested risk).
  - **Why**: `bin/lint` checks image refs + permalink uniqueness only; ~77 external links and all hardcoded internal links are ungated. R-001 has ranked top-3 every cycle and materialized once. A likely-dead external link was found: `_posts/2020-09-30-goal_setting_post.md:189` points at the defunct `seanakolk.com` (replace with the on-site Seychelles post).
  - **Owner**: Sean (decide html-proofer GitHub Action vs manual cadence), Claude (execution).
  - **Effort**: M.
  - **Status**: queued.

- **Item**: Chip away at alt-text debt.
  - **Why**: 76 of 93 live `<img>` tags lack `alt=` (~18% covered). Worst offenders: `goal_setting_post.md` (26), `dar-tanga-post.md` (8), `Freezing-People.md` (6). `tiny-house-post.md` is the fully-captioned model to follow.
  - **Owner**: Claude (execution), Sean (review).
  - **Effort**: L (incremental).
  - **Status**: queued.

### Decisions needed from Sean (judgment calls)

- **Post-type registry**: `type:update` / `type:project` are in the CLAUDE.md contract + lint allow-list but produced by zero posts, so `/updates` is permanently empty and `/projects`'s documented auto-list is dead. Retire both types, or start producing them?
- **`/library` is orphaned**: shipped but linked from nowhere (not in nav/footer). Add to nav, or leave intentionally unlisted?
- **Talk-file naming**: the README claims strict `YYYY-MM-DD-slug.md`, 1:1 with posts, but live files use a `-prep` suffix and one undated name. Tighten the files, or relax the README?

---

## Open prompts for Sean

- Should the broken-link sweep become a GitHub Action (e.g., `html-proofer`) instead of a manual cycle? Worth the overhead?
- Is there appetite to convert listing pages from `type:`-filtered to `category:`-filtered, which posts already carry?
- HAM call sign `KK6DFO` is published on `sailing.md` line 22. Public-record info, but confirm it should stay.

---

## How this file is used

- New items get added at the bottom of the appropriate section.
- Items move to `## Done` at the bottom (kept for memory, not deleted).
- Items dropped without action move to `## Dropped` with a one-line reason.
