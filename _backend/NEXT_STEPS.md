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
  - **Status**: queued.

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
  - **Status**: queued.

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
  - **Status**: queued.

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

- **Item**: Editorial consistency pass on the five 2026 recaps (Jan–May) — dash style (hyphen → em-dash in Jan/Feb), label-bullet colons, link parity (March Warm Data, Feb Future Food Institute), Reading-section format, and `reviewed_by_sean` flag removal.
  - **Why**: Jan/Feb were written after the Mar–May standardization and drifted from the house style and link conventions.
  - **Owner**: Claude (execution), Sean (judgment calls).
  - **Effort**: M.
  - **Status**: done (June 2026 cycle — also fixed a YAML build break in the July 2025 recap surfaced during verification).

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
