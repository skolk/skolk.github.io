# 2026 Recap Cleanup Plan

Editorial pass to bring the five 2026 monthly recaps (Jan–May) into a single,
consistent style and link convention. Source of the findings: editor's scan,
June 2026. Conventions referenced: `CLAUDE.md` (Links, Label bullets) and
`VISION.md` (Formatting conventions).

Scope: `_posts/2026-01-31` … `_posts/2026-05-31` recaps only. No content/voice
rewrites beyond what each item states.

---

## Phase 1 — Dash style (mechanical, no judgment)

Convention: spaced em-dash (` — `) for sentence dashes; colon for label bullets.
Jan & Feb currently use spaced hyphens (` - `).

- [ ] **January** — convert 9 spaced-hyphen dashes → ` — `:
  - line 18 (×3: `infrastructure -`, `Public infrastructure -`, `can't avoid -`)
  - line 20 (`similar -`), line 22 (`grace -`), line 24 (`else -`)
  - line 26 (`porticoes -`, `medieval Berkeley -`), line 28 (`radiates out -`, `the streams -`)
  - line 39 (`about a city -`)
- [ ] **February** — line 16 (`to walk -`), line 30 (`operational risk -`),
  line 41 (`reading list -`) → ` — `

## Phase 2 — Label-bullet separators

Convention: `- **Label**: description`.

- [ ] **February — Finds**: `**Lara Stein** -` → `**Lara Stein**:`
- [ ] **February — Travel** (needs light rewording, not just punctuation):
  - `**Barcelona** to close out the European loop.` → `**Barcelona**: closing out the European loop.`
  - `**Seattle** in between, catching up…` → `**Seattle**: in between, catching up…`
  - `**British Virgin Islands** for a week of chartering…` → `**British Virgin Islands**: a week of chartering…`
  - › JUDGMENT: confirm rewording is acceptable (changes wording, not meaning).

## Phase 3 — Link consistency

Convention: entity's own site → Wikipedia → canonical; books → Goodreads.

- [ ] **March — Finds**: link `Warm Data labs` → https://www.warmdata.life/
  (April & May already link "Warm Data"; March is the lone unlinked one).
- [ ] **February — Projects**: link `Future Food Institute` → its official site.
- [ ] OPTIONAL (judgment): `Lara Stein` (personal site), `BoatyBall`
  (boatyball.com), Jan `World Economic Forum`. Default: skip unless you want them.
- [ ] Leave plain city/place names unlinked (consistent across set). No change.
- [ ] Leave Feb's *Pluralism vs. Universalism* reading list unlinked (your own
  compilation, not a book). No change.

## Phase 4 — Reading-section format

Currently: March = flat list; April/May = `Currently:` / `Finished:`; Feb = prose.

- [ ] DECIDE the canonical shape. Recommendation: `Currently:` / `Finished:`
  split where there's more than one book; flat list is fine for ≤3 all-finished.
- [ ] Apply to March and February to match April/May (if adopted).

## Phase 5 — January structure

January uses `## Cities, in the order I saw them` + `## Looking ahead`, no
Reading section — an essay, not the standard template.

- [ ] DECIDE: keep January's distinct essay shape (recommended — it's strong and
  intentional), or normalize to Travel/Finds/Writing/Reading. Default: keep.

## Phase 6 — Metadata

- [ ] Remove `reviewed_by_sean: false` from January & February once reviewed
  online (Mar/Apr/May don't carry it; this makes frontmatter uniform).
  › JUDGMENT: confirm you've finished the online review first.

## Phase 7 — Verify & ship

- [ ] `./_backend/bin/lint` — static checks pass
- [ ] `bundle exec jekyll build` — clean build, recaps render on `/recaps`
- [ ] Commit (one focused commit: "Recaps: editorial consistency pass") + push
- [ ] Note the change in `_backend/CHANGELOG.md`

---

## Out of scope (flag only)
- Content accuracy: *City of Stars* — Robert Jackson Bennett (March) — verify the
  author is correct; not a style issue.
- Jan/Feb narrative overlap (both touch Barcelona / the European loop) — by
  design, since the loop spanned the month boundary. No action.

## Decisions needed before execution
1. Phase 2 Travel rewording — OK to lightly reword? (default: yes)
2. Phase 3 optional links — add Lara Stein / BoatyBall / WEF? (default: no)
3. Phase 4 Reading format — adopt Currently/Finished everywhere? (default: yes)
4. Phase 5 January — keep essay shape? (default: keep)
5. Phase 6 — remove `reviewed_by_sean` now? (default: yes, if review done)
