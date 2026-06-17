# Reference sites

Working notes on the three sites VISION names as the long-term reference: [xxiivv.com](https://xxiivv.com), [kokorobot.ca](https://kokorobot.ca), [100r.co](https://100r.co). The point of this doc is to keep the comparison concrete when making substrate and structure decisions, so we're not arguing from vibes.

## The team behind all three

Same humans, three sites, different voices:

- **Devine Lu Linvega** → `xxiivv.com`, his personal site / wiki / personal operating system.
- **Rek Bell** → `kokorobot.ca`, her personal site / portfolio / craft log.
- **Together as Hundred Rabbits** → `100r.co`, the joint life on the sailboat Pino, joint software, joint travel.

That's the structural insight worth borrowing: **two distinct personal sites + one joint site**, all owner-built, all cross-linked. It's exactly the split VISION already imagines for Sean and Kate, `skolk.github.io` as the solo site now, a joint site eventually. The three reference sites are a working proof that the split scales.

---

## xxiivv.com, Devine

### Identity
Wiki-shaped personal operating system. Dense, monospace, minimal chrome. Dark with warm accents. Information per square inch is the design.

### Structural elements
- **Calendar-grid log**: years × days, each filled cell a log entry. The most-copied feature on the personal-site internet.
- **Wiki depth**: every concept is a page that's edited over time. Posts are an exception, not the default.
- **Bidirectional links**: each page lists incoming references at the bottom. The graph is visible.
- **Glyph / sigil identity**: each section has its own mark. Categories aren't text labels, they're visual.
- **Tracker**: habits, achievements, books read, films watched, all surfaced as inventory pages.
- **Today / now**: current state is always visible on the landing surface.
- **No nav chrome**: you navigate by following links or by trusting the URL.
- **`oscean`**: Devine's custom static-site generator. Means the site is its own published project, not just content.

### Topical pillars
- Constructed language (Lietal)
- Software / tools (Orca, Left, Ronin, Dotgrid, Marabu, Nasu, each with a deep project page and version history)
- Music as Aliceffekt
- Personal manifestos on permacomputing, low-tech, attention
- Conceptual systems (notation, taxonomy, glyph systems)
- Library / inventory (books, films, music)

### What it's signature for
Conceptual depth and the graph view of a single mind over a decade. The calendar grid is the visual that everyone copies; the bidirectional wiki is the more important structural choice.

---

## kokorobot.ca, Rek

### Identity
Personal portfolio / craft log. Warmer palette than xxiivv. More illustration, less wiki-grid. Curated rather than exhaustive, the inverse of Devine's "log everything" instinct.

### Structural elements
- **Lunar / cycle-based logs**: Rek's calendar is moon phases, not Devine's grid. Same idea, different rhythm.
- **Per-project portfolio pages** with hand-drawn illustrations and process photos.
- **Recipe cards** with consistent visual structure.
- **Curated portfolio shape**: not everything she makes lives on the site; what's there is chosen.
- **Distinct visual identity** from xxiivv despite shared technical substrate, proves "same stack, different voice" works.

### Topical pillars
- Weaving and textile work
- Illustration / drawing
- Cooking (vegan, low-tech, often boat-adapted)
- Sailing / boat life from her perspective
- Software collaborations with Devine
- Talks and writing

### What it's signature for
**A distinct partner identity that doesn't get absorbed into the joint project.** This is the load-bearing thing for Sean and Kate. If the joint site eventually exists, Rek's site is the proof that the personal side stays distinct rather than being subsumed.

---

## 100r.co, Hundred Rabbits (joint)

### Identity
The boat. The two of them as a unit. Documentation as gift. Manifesto-adjacent but grounded in actual lived constraints (no diesel, no AC, no SaaS, limited power, limited water).

### Structural elements
- **Hand-drawn nav**: a literal sketch of Pino (their boat), each room clickable.
- **Joint "we" voice**: distinct from either personal site.
- **Port-by-port travel logs**: chronological, geographically anchored.
- **Boat-systems documentation**: power, water, anchoring, dentistry, injury, food storage. Long-lived wiki pages, not posts.
- **Toolkit page**: the workflow / software / philosophy stack, framed as a complete operating model.
- **Mirror page**: what they're reading and why.
- **Salt page**: support / patronage, on their terms.
- **Manifestos**: permacomputing lineage, no-internet workflows, low-power computing.

### Topical pillars
- Boat life logistics (power, water, food, health, weather)
- Cooking with constraints
- Joint open-source software (made on the boat, Orca, Ronin, etc. live on both xxiivv and 100r)
- Travel narrative
- Talks and appearances
- Music releases (Aliceffekt)

### What it's signature for
**The joint identity layer.** And the proof that boat-specific operational knowledge can be useful documentation for others, not just personal journaling.

---

## Shared DNA across all three

These are non-negotiable design choices the whole project shares:

- File-based, owner-built, git-tracked. No CMS, no SaaS.
- Plain HTML/CSS. Minimal JS, often none.
- Dense information, minimal navigation chrome.
- Long-lived wiki pages **alongside** time-based logs, not instead of.
- Per-project deep pages with history, not one-liners on an index.
- Bidirectional / incoming links visible at the bottom of pages.
- Glyph, color, or sigil as category marker.
- A visible "now" / present-tense surface.
- No analytics. No comments. No ads. No popups.
- Documentation as a gift, not a funnel.

VISION's principles already align with most of this. Worth re-reading them side-by-side when making any substrate decision.

## Distinct contributions

| | xxiivv | kokorobot | 100r |
|---|---|---|---|
| **Voice** | dense, conceptual | curated, illustrated | "we", grounded |
| **Cadence visual** | day-grid calendar | lunar / cycle | port-by-port |
| **Depth shape** | wiki graph | portfolio | systems docs |
| **Topical centre** | personal-OS, software, language | craft, food, illustration | boat life, joint software |
| **What it proves for skolk** | the solo wiki can carry a decade of thinking | the partner stays distinct | the joint site can document shared operational reality |

---

## Implications for skolk.github.io

### Solo site (skolk, now), borrow from xxiivv first, kokorobot second
- **From xxiivv:** calendar-grid log, wiki-depth pages alongside posts, bidirectional links, per-project deep pages, glyph/colour per category, `/now` (already done), an inventory page (library, talks, tools).
- **From kokorobot:** curated portfolio shape (not everything ships), distinct visual identity from any generic theme, project pages that double as craft documentation. The instinct that less-but-deeper > more-but-shallower.
- Sean's voice (per VISION: "honest, slightly understated") is closer to Devine's directness than Rek's softness, but kokorobot's *curated* instinct is a check against the xxiivv tendency to log everything.

### Joint site (skolk + Kate, eventual / Phase 3), borrow from 100r
- Joint "we" voice (distinct from either personal site).
- Shared travel logs, port-by-port or location-by-location.
- Shared systems documentation (boat, household, expedition kit, whatever the shared substrate is).
- Hand-drawn nav (VISION already names this as the open question, text-only for solo, hand-drawn for joint).
- A "toolkit" page for the joint workflow.
- Cross-link both ways with `skolk.github.io` and Kate's eventual site.

### Skip, doesn't fit Sean's voice
- Manifestos / polemical framing. VISION calls for honest and understated; 100r is more declarative.
- Constructed languages (Devine-specific).
- Music releases (not the medium).
- Patreon / support page (not the model, at least not now).

---

## Open questions raised by this comparison

- **Curated or exhaustive?** xxiivv logs everything; kokorobot curates. Which is skolk? Default to curated until the writing cadence is sustainable; then decide whether exhaustive becomes possible.
- **Wiki vs. post primacy.** Both xxiivv and 100r treat long-lived pages as primary and dated posts as one form among many. skolk is currently post-primary. Worth deciding whether `/projects` entries should become deep pages (xxiivv-shaped) before building the calendar grid.
- **Where do `/tools`, `/library`, `/talks`, `/teaching` live?** As top-level pages, or as sections under a single `/workshop` umbrella? 100r uses both patterns.
- **Sigils / glyphs.** All three sites use a visual category language. Sean's site uses text categories. Worth a small design exercise before sinking time into the wider redesign.

---

## See also

- `_backend/VISION.md`, phases, principles, the long-term direction this comparison feeds into.
- `_backend/TODO.md`, concrete items derived from this comparison live under **Reference-site convergence** (Phase 1 / Phase 2 / Phase 3) and under the **Identity dimensions currently absent** section.
