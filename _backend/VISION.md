# Vision

This site is Sean Kolk's **personal blog + portfolio**.

## Purpose
- A long-running journal of ideas, projects, travel, and reflections.
- A portfolio that shows the work behind the writing — making, mountaineering, sailing, building, exploring.
- A signal of who I am and how I think, for people who arrive here on purpose or by accident.

## Audience
- Curious readers and friends.
- Collaborators evaluating fit on a project or expedition.
- Future me, scanning back across years.

## Voice
- Honest, specific, slightly understated.
- Posts can be short. They don't have to be polished essays.
- Show the work, not just the conclusion.

## What belongs here
- Project write-ups (making, building, field work).
- Trip reports (sailing, mountaineering, paragliding, travel).
- Reflections on intention, tools, communities, decisions.
- Portfolio entries that tie back to underlying posts when possible.
- Consulting / professional practice — the SA Strategy and Design era and similar work counts as making, not as résumé fluff. Treat each engagement as a project worth a post.
- Community organizing — Burning Man Ranger, Burners Without Borders Build Lead, Adventure Report, Boatless Sailing. These are recurring multi-year throughlines and deserve more than a line on `/about`.
- Quiet practices — birding, watching, the things that don't generate trip reports but shape how the rest gets noticed.

## What doesn't belong here
- Hot takes on news cycles.
- Generic productivity / self-help content.
- Anything that wouldn't make sense to me to re-read in five years.

## Health signals (what "well-maintained" looks like)
- Posts have complete front matter and working images.
- Filenames follow the convention in `CLAUDE.md`.
- The portfolio reflects current work, not just legacy projects.
- The about / sailing / projects / mountaineering pages stay roughly current.
- Current titles, roles, and active projects on the site match what's actually true — not what was true a year ago.
- The gap between what's lived publicly elsewhere (LinkedIn, Substack, IG) and what's on the site stays small. If it grows past a few months, something's wrong with the cadence.
- New posts go up at a cadence that feels honest — quality over volume.

---

## Long-term direction

The current Jekyll + hack.css setup is adequate, not aspirational. Three reference sites point toward where this could grow:

- **[xxiivv.com](https://xxiivv.com)** — Devine Lu Linvega's personal site. Calendar-grid log, deeply interlinked wiki, custom tooling, ASCII/glyph aesthetic. *The personal-site model.*
- **[kokorobot.ca](https://kokorobot.ca)** — Rek Bell's personal site. Lunar/cycle-driven logs, weaving and textile work, distinct identity from Devine. *The partner-with-their-own-thing model.*
- **[100r.co](https://100r.co)** — Hundred Rabbits, their joint life/boat/project. Hand-drawn navigation, shared workflow. *The collaborative-with-Kate model.*

What they share: file-based, owner-built, no analytics theatre, no SaaS rot, content shaped to the maker's hand. All three are the work of the same two humans — Devine and Rek — split across one solo site each plus one joint. That same split is what Phase 3 imagines for `skolk.github.io` and an eventual joint site with Kate.

Detailed comparison and what each site is signature for: see `_backend/REFERENCE_SITES.md`.

### Personal vs. collaborative

Two distinct sites, eventually:

1. **skolk.github.io (personal)** — this site. Sean's log, projects, sailing, mountaineering, climate work, writing.
2. **A joint site with Kate** — TBD domain. Shared projects, shared travel, shared work.

Today everything lives here. Split later, when the joint side has enough mass to need its own home. Cross-link both ways when it happens.

### Phases

**Phase 0 — Now (Q2 2026).** Squarespace content restored. Site on Jekyll + hack.css. Adequate.

**Phase 1 — Sharpen what's here (next 1–2 months).**
- Audit and rewrite LLM-puffed posts (see TODO).
- Auto-list posts on `/sailing` and `/mountaineering` the way `/projects` does. *(done 2026-05-22.)*
- Add an "Index" or "All" view — everything by year, à la xxiivv's tree.
- Add a `/now` page (à la nownownow.com) — current focus, location, preoccupations.
- **Backfill from external profiles.** Close the gap between what's been posted on LinkedIn / Substack and what's on the site — the 2026-05-22 diff surfaced a year's worth of trip reports, project announcements, and one full Davos series with no site presence. List in TODO; work through it in priority order. Establish a cadence so the gap doesn't reappear.
- **Surface missing identity dimensions** — Burning Man / BWB, birding, the SA Strategy consulting practice. Decide whether each gets a paragraph on an existing page, a section, or its own page.

**Phase 2 — Migrate toward a workshop site (next ~6 months).**
- Pick a substrate: stay on Jekyll + custom Liquid, move to Quartz (Obsidian-aware static generator), or build something custom.
- Calendar-grid log view.
- Tag graph — each post tagged, visual graph of relationships.
- Long-form essays separated from quick log entries.
- First-class image galleries in posts.

**Phase 3 — Separate the joint site.** When there's enough shared output with Kate. Parallel structure, cross-linked.

**Phase 4 — Long-term (years).** Site as personal infrastructure: ledger of trips, projects, reading, thinking. Tools that *live* on the site, not just words about them. Clear separation between "current me" and "archive me."

### Principles

- **Own the data.** Markdown in git, no proprietary editors.
- **Build slowly.** This is a 10-year site, not a 10-week one.
- **No analytics.** If something needs measurement, ask a human directly.
- **No comments.** Email, or in person.
- **Old links don't break.** Redirect stubs whenever a URL moves.
- **Public by default.** Drafts in `_drafts/` until ready, but the goal is to write things publishable.
- **Hand-built > themed.** Eventually outgrow `hack.css` and write CSS that's mine.

### Open questions

- Hand-drawn navigation (100r.co) or text-only (xxiivv)? Probably text-only for solo, hand-drawn for joint.
- One site with two identities, or two domains? Two domains, eventually.
- Calendar grid: years on rows or columns? (Decide when building it.)
- **Cadence**: write on the site first and syndicate to LinkedIn / Substack second, or keep LinkedIn primary and run periodic backfills? The first matches "own the data" better; the second matches actual habit. Pick deliberately rather than letting drift decide.
- **Where do community-organizing roles live?** Burning Man / BWB / Adventure Report / Boatless are durable identity threads. Paragraph on `/about`, section under sailing/projects, or new `/community` page? Decide before writing the first dedicated post.

### Ideas from the reference sites — questions to sit with

These are deliberately question-shaped, not action-shaped. Drawn from `_backend/REFERENCE_SITES.md`. Don't move them to TODO until they've been decided — the point of leaving them here is that the answer isn't obvious yet, and acting too early commits to a shape the site has to live with for years.

**From xxiivv (Devine's wiki-shaped personal OS):**
- Should every long-lived project get a deep page with its own history, instead of a one-line entry on `/projects`? If yes, what's the threshold — every project, or only the ones that span years?
- Should there be a public "tracker" — books read, talks given, mountains climbed, miles sailed? It already half-exists on `/sailing` and `/mountaineering`. Make it primary, or keep it incidental?
- Should bidirectional / incoming links be visible to readers? (xxiivv shows them; most sites don't.) If yes, does that change how posts get written?
- Categories as sigils or glyphs rather than text labels — worth the design work, or theme-creep dressed up?
- Is there a `/how-i-work` or personal-OS page worth writing? Devine's is one of the most-read things on xxiivv; Sean has a process worth surfacing (consulting, grants, sailing-trip planning) but it lives only in his head.

**From kokorobot (Rek's curated portfolio + craft):**
- Curated or exhaustive? xxiivv logs everything; kokorobot chooses. Default to curated until the writing cadence is sustainable, then decide whether exhaustive becomes possible — or whether curated *is* the answer.
- Should repeating page types (trips, projects, talks) get a consistent visual pattern, the way kokorobot's recipe cards do? Or stay text-first?
- Should the site eventually have its own visual identity (typography, colour, sketches) instead of `hack.css`? At what point does that work pay off vs. distract?
- How does a partner-site stay distinct from a joint-site, in voice and visual identity? Rek's answer is clear; ours doesn't exist yet.

**From 100r (the joint life + documentation-as-gift):**
- Should there be a `/toolkit` or `/workshop` page that frames the whole workflow, the way 100r's does? Or is that performative when the workflow isn't yet stable?
- Should there be a `/mirror` or `/library` — what Sean is reading and why? It's low-cost and high-signal, but it commits to keeping it current.
- Is there documentation Sean owes the community he's part of — sailing curriculum, grant-writing tactics, hardware-prototyping practice — that's been useful in person and could be useful written down? What's the *one* thing where this would matter most?
- Manifesto-adjacent voice (100r) vs. honest-and-understated (VISION's current commit). Is there a version of the strong voice that still fits, or is that drift?
- When does the joint site with Kate start to exist? What's the trigger — a number of shared projects, a shared trip, a year together at sea, or just deciding?

**Shared across all three:**
- File-based and owner-built is non-negotiable. But how much hand-craft is right? Devine writes his own static site generator (`oscean`); 100r writes plain HTML. Sean is on Jekyll. When does the substrate question (Phase 2) actually force itself, vs. stay deferred?
- "Documentation as gift" is the through-line. What's Sean's version? Not blog posts about himself — actual reference material that other people could use.
- All three sites are visibly the work of one mind (or two minds). The chrome doesn't pretend the author is an institution. How much further does `skolk.github.io` need to go to actually look like Sean made it, vs. Sean using a theme someone else made?
