# VISION — long-term path for skolk.github.io

Internal planning doc. Not published.

## What this site wants to be

A working personal site — a tool for thinking, a public log, a portfolio. Not a brochure. Things change here; old entries stay; nothing is preserved in amber but nothing is hidden either. The path forward is closer to a *workshop* than a *blog*.

## Inspirations

Three reference sites the structure should grow toward:

- **[xxiivv.com](https://xxiivv.com)** — Devine Lu Linvega's personal site. Calendar-grid log, "left of bang" journaling, a deeply interlinked wiki, custom tooling, ASCII/glyph aesthetic. *This is the personal-site model.*
- **[kokorobot.ca](https://kokorobot.ca)** — Rek Bell's personal site. Lunar/cycle-driven logs, weaving and textile work, separate identity from Devine. *This is the partner-with-their-own-thing model.*
- **[100r.co](https://100r.co)** — Hundred Rabbits, their joint life/boat/project. Hand-drawn navigation, shared workflow, devine-and-rek-as-a-unit. *This is the collaborative-with-Kate model.*

What they share: file-based, owner-built, no analytics theatre, no SaaS rot, content shaped to the maker's hand. They aren't templates — they're outputs of long-running practice.

## Personal vs. collaborative

There are two distinct things that probably want two distinct sites:

1. **skolk.github.io (personal)** — Sean's log, projects, sailing trips, mountaineering, climate work, writing. Equivalent to xxiivv.com or kokorobot.ca.
2. **A joint site with Kate (TBD domain)** — shared projects, shared travel, shared work. Equivalent to 100r.co.

Today everything lives here. That's fine as a starting point — split later when the joint site has enough mass to need its own home. Cross-link both ways when it happens.

## Phases

### Phase 0 — Now (Q2 2026)

- Squarespace content has been pulled in and restored from source where it had drifted.
- Site is on Jekyll + hack.css. Adequate. Not aspirational.
- Navigation: Home / About / Log / Sailing / Projects / Mountaineering.

### Phase 1 — Sharpen the current site (next 1–2 months)

Don't rebuild yet. Make what's here work.

- Audit & rewrite any LLM-puffed posts (see TODO.md).
- Settle naming: "Projects" instead of "Making". Done.
- Surface posts on `/sailing`, `/projects`, `/mountaineering` automatically (Projects done; others pending).
- Add an "Index" or "All" view that lists everything by year — like xxiivv's tree.
- Decide whether to keep `_site/` in git (probably no).
- Add a tiny "now" page (à la nownownow.com) — current focus, current location, current preoccupations.

### Phase 2 — Begin the migration toward a workshop site (next ~6 months)

The xxiivv/kokorobot aesthetic is built, not themed. Plan for:

- **Pick a substrate.** Jekyll is fine but doesn't love wikilinks, bidirectional refs, or calendar-grid views. Candidates:
  - Stay on Jekyll, add custom plugins/Liquid for the calendar + tag-graph views.
  - Move to **Quartz** (Obsidian-aware static site generator — built around bidirectional links and a graph).
  - Custom static generator (more time, more freedom — devine's approach).
- **Build a calendar-grid log view.** One row per year, one cell per post, click into the post.
- **Tag graph.** Each post tagged with topics; tags page lists them with a visual graph.
- **Resume / Journal split.** Long-form essays live separately from quick log entries.
- **First-class images.** Posts should embed image galleries cleanly.

### Phase 3 — Separate the joint site (when ready, no rush)

When there's enough shared output with Kate to warrant a site:

- Register a joint domain.
- Build a parallel structure: "ours" rather than "his" or "hers".
- Cross-link prominently. Kate's solo work links to her site; Sean's solo work stays here; joint things live there.

### Phase 4 — Long-term (years)

- Site as personal infrastructure: ledger of trips, projects, reading, thinking.
- Tools that live on the site, not just words about tools. (xxiivv hosts working software.)
- A clear separation between "current me" and "archive me" — old work doesn't need a content warning, it just needs context.

## Constraints / principles

- **Own the data.** Markdown files in git, no proprietary editors.
- **Build slowly.** This is a 10-year site, not a 10-week one. Iterate when there's a real reason.
- **No analytics.** If something needs measurement, ask a human directly.
- **No comments.** Email, or in person.
- **Old links don't break.** Add `redirect_from` (or stubs) whenever a URL moves.
- **Public by default.** Drafts can stay in `_drafts/` until ready, but the goal is to write things publishable.
- **Hand-built > themed.** Eventually outgrow `hack.css` and write custom CSS that's mine.

## Open questions

- Hand-drawn navigation (à la 100r.co) or text-only (à la xxiivv)? Probably text-only for solo, hand-drawn for joint.
- One site, two identities (folders/sections), or two domains? Two domains, eventually.
- Public knowledge graph or private notes feed into the public site? Public graph; some notes stay in Obsidian.
- Calendar grid: years on rows or columns? (Decide when building it.)
