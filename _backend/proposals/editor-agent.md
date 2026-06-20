# Proposal: an Editor agent for `/run-project-cycle`

> Status: proposal, for Sean to accept/reject. Read-only by design (proposes, never rewrites
> posts). Would run as an additional parallel agent in the cycle, like the existing
> sprint-tracker / prd-auditor / risk-auditor. Authored 2026-06-20 from the editorial-queue work.

## Why

The cycle today audits the *repo* (scope, risks, drift). It says nothing about the **writing**:
what to publish next, what's good vs unfinished, what's close, and how the pieces connect. The
goal is an article-a-week cadence fed from four sources (ideas, trip reports, backlog edits,
improvements). The Editor agent is the brain that turns that pile into a weekly pick.

## The five jobs (Sean's framing)

1. **What should we be writing?** Rank `_backend/EDITORIAL_QUEUE.md` (Ready · Want · Worth, Decay
   breaks ties) and surface this week's pick + next 4. This is what `_backend/bin/ondeck` already
   computes; the agent presents it with judgment.
2. **What's good vs unfinished?** Grade every published-but-flagged post against a readiness
   rubric (below). Separate "ship-worthy" from "needs work" from "scaffolding."
3. **What needs more work before we put it out?** For each near-ready piece, name the *one* gap
   between it and publishable (a hero photo, a framing paragraph, a dead link, a thesis).
4. **How do these fit together?** Map thematic threads / series across posts so related pieces
   reinforce instead of scattering (e.g., the Petrichor sailing arc: Baja → Mexico → Van Isle →
   Alaska; the "models" posts: Social Anchors, Comfort Zone, Intention Calendar).
5. **What have you said you want to write about?** Harvest forward-looking intentions already
   written into the corpus ("more to come on…", "I'll come back", `needs-expansion`, stated
   outlines) and promote them into Parked Ideas. (Seed harvest below.)

## Readiness rubric (good vs unfinished)

A post grades on six binary signals; the editor reports the score and the *first missing one*:

- **Has a picture** (inline hero, subject or location). Source: the gap audit; `image_preview` is dead metadata, so inline only.
- **No stub/placeholder language.** Source: `bin/lint` check #10.
- **Has a thesis/framing** (not just a logbook dump). The editor's judgment call.
- **Links resolve** (internal + external). Source: future link-crawl; today a manual read.
- **`reviewed_by_sean: true`.** The human-signoff flag.
- **House style clean** (em-dash ban, label-colons, comma attributions). Source: `bin/lint`.

`6/6` = ship. `4-5/6` = "needs work, here's the one thing." `<4` = backlog, not on deck.

## Inputs (all read-only)

- `_backend/EDITORIAL_QUEUE.md` (the board) and `_backend/bin/ondeck` (the ranker)
- `_posts/`, `_drafts/` (the corpus)
- `_backend/IMAGE_GAPS.md` (picture gaps), `bin/lint` #10 output (stub language)
- `reviewed_by_sean:` flags, `type:`/`categories:` for series grouping

## Output (a cycle section)

Adds an **EDITORIAL / ON DECK** block to the synthesis:

```
THIS WEEK'S PICK   — top of queue, with the one gap to closing it
ON DECK (4)        — next candidates, each with its readiness score
NEEDS WORK         — published/near-ready posts at 4-5/6, + the single missing signal
SERIES MAP         — thematic threads and which entry is missing
INTENTION HARVEST  — "you said you'd write about X" pulled from the corpus
CADENCE            — days since last ship vs the 7-day target
```

## Guarding fixtures (kaizen discipline — no edit without a guard)

- `editor-rank-fixture/`: a seeded queue with known scores; assert the agent's ranking matches
  `ondeck`'s deterministic order (the agent narrates, the script is the source of truth).
- `editor-readiness-fixture/`: seed one 6/6 post and one 4/6 post (missing a hero image); assert
  the agent files them ship vs needs-work and names the missing signal.
- `editor-intention-harvest-fixture/`: seed a post containing "more to come on X and Y"; assert
  both X and Y surface as Parked Ideas and nothing is invented beyond the text.

## Could-not-gate (surfaced, not proposed)

- **Quality of the writing itself** (is the prose *good*?) — subjective; no fixture can guard a
  taste judgment. The editor may comment, but the rubric stays mechanical so the cycle's PASS
  means something. Keep taste in the human's hands.

## Seed: intention harvest (run 2026-06-20)

Pulled from the corpus now, as a worked example of job #5:

- **First-Time-Out-Sailing** → a stated 6-piece sailing series: raising sails; "nouns and verbs on
  a boat"; reading the weather and wind; boat maintenance; trip planning; what gear lives on board.
- **Alaska Petrichor** → its own 6-point outline (boat prep, crew rotations, tide gates, wildlife,
  weather, communities) — a hub-plus-legs candidate.
- **Mexico 2021-22 cruise** → "the full season is still to be written."
- **Greece Kos 2019** → "still in notebooks and on cameras" — decaying, decide write-or-drop.
- **Baja Ha-Ha 2021** → "more to come once I have time to write it properly."
