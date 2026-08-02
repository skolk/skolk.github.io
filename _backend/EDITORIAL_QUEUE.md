# Editorial queue — what's on deck to write

The single ranked board for the article-a-week cadence. Every candidate (idea, trip
report, backlog edit, improvement) lands here as one row. `_backend/bin/ondeck` reads the
**## Queue** table, ranks it, and prints this week's pick. `/run-project-cycle` surfaces the
same in its ON DECK section.

## Scoring: Ready · Want · Worth (+ Decay)

- **Ready** (1-5): how close to shippable. Full outline = 4-5; raw notebooks = 2; bare idea = 1.
- **Want** (1-5): how much you want to write it *now*. Energy is the completion predictor. Fill the `?`s, this axis reorders the board.
- **Worth** (1-5): leverage. Ties to current work (Astraeus / Island Lab / REAP), evergreen value, or portfolio signal.
- **Decay** (0-2): memory/relevance rot. 0 = evergreen, 1 = fading, 2 = write-soon-or-drop. Breaks ties upward.

**Rank = Ready + Want + Worth, descending; Decay breaks ties.** Type is one of:
`idea` · `trip-report` · `edit` · `improvement`. A slow writing week can still ship an
`edit` or `improvement` and keep the streak alive.

Keep `Next action` free of `|` characters (it's a table cell).

## Queue

| Candidate | Type | Ready | Want | Worth | Decay | Next action |
|---|---|---|---|---|---|---|
| Alaska Petrichor trip report | trip-report | 4 | ? | 4 | 1 | Write from the existing 6-point outline; add hero photo |
| Wire image heroes (batch) | improvement | 5 | ? | 2 | 0 | Drop photos per IMAGE_GAPS.md, Claude wires the inline imgs |
| Van Isle 360 trip report | trip-report | 3 | ? | 3 | 1 | Expand the race recap; add vanisle360.jpg |
| R2AK 2024 trip report | trip-report | 3 | ? | 3 | 1 | Flesh out prep/build/route framing; add r2ak2024.jpg |
| Bahamas Green Coco trip report | trip-report | 3 | ? | 2 | 1 | Write the account; add a location photo |
| Baja Ha-Ha 2021 trip report | trip-report | 2 | ? | 3 | 1 | Write from memory while it lasts; add Petrichor photo |
| Mexico 2021-22 cruise trip report | trip-report | 2 | ? | 2 | 1 | Write the Sea of Cortez season; add a photo |
| Greece Kos 2019 trip report | trip-report | 2 | ? | 2 | 2 | Recover from notebooks soon or drop; add kos-dodecanese.jpg |
| De-stub the 3 stub trip reports | edit | 3 | ? | 2 | 1 | Remove stub lines once each has real content |
| Pride Before Protocol | idea | 4 | ? | 5 | 1 | Why Italy loves its tomatoes and not its seagrass; campaign plus protocol split; draw the two-column pride/action diagram |
| The Invitation Is the Work | idea | 3 | ? | 4 | 0 | Ten years of travel; going somewhere versus being invited somewhere; short and personal |
| Palinuro | idea | 3 | ? | 3 | 1 | The helmsman who was the price of passage, watchtowers, a storm, two people calibrating sensors; needs the watchtower-storm photo |
| What to Step Into | idea | 2 | ? | 3 | 0 | When to step in, let it run, deconstruct, construct; small mental model with a decision diagram |
| What Gets Left | idea | 2 | ? | 4 | 0 | Regenerative versus extractive presence, from the Blue Era fishermen-politician arguments; wait for Pollica protocol results |
| The banjo player | idea | 2 | ? | 2 | 2 | Churches into music halls, ballads folded into modern music; need the name; Adventure Report material too |
| Pollica full report | trip-report | 3 | ? | 5 | 1 | Expand from July recap and month notes: coastal mapping, sensors, governance history with Future Food Institute |
| PNW Climate Week short write-up | idea | 2 | ? | 3 | 2 | Short post: trivia night, future of food event with Nice Industries, Maritime Blue and Sound Experience threads |
| Ulva and the Islandness gathering | trip-report | 2 | ? | 4 | 1 | Archaeology, foraging, finding your trip; carried from June and July recaps |
| Governance of Italy essay | idea | 2 | ? | 3 | 1 | Principalities, industry, why the young people leave, what can be done |
| Boston 2026 trip log | trip-report | 2 | ? | 3 | 1 | A few days going deep on agentic AI; write while fresh |
| Barra and the Hebrides | trip-report | 2 | ? | 3 | 1 | Viking and French farmers, island versus inland; carried from June recap |
| Dudu Kouaté in Bristol | idea | 2 | ? | 2 | 1 | The percussion set and a smaller kind of life; carried from June recap |

## Parked ideas

Raw one-liners, unscored. Graduate to the Queue (with scores) when they firm up.

- (add idea here) — one line on the angle
- (add idea here)

## Recently shipped

Append when you publish, newest at the bottom. Cadence is also computed from git history.

- 2026-06-20 — Halfway House: embedded 15 build photos with alt text (improvement)
- 2026-06-20 — Fixed 4 broken recap links (edit)
