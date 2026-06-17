# TODO

Running backlog for the site. `/run-cycle` reads this, appends new items, and avoids duplicating existing ones.

Format: each item is one bullet. Optional tags in `[brackets]`, `[quick]`, `[medium]`, `[project]`, `[content]`, `[infra]`, `[design]`.

## Active

### Content fidelity
- [ ] Merge or delete one of `2014-11-10-one-small-step.md` and `2014-11-20-Taking-Action-Environmental-Issues.md`, same Gasland / micro-adventures topic. [content] [quick]
- [ ] Spot-check posts with no Squarespace source, fidelity unknown, possibly LLM-puffed. [content] [project]
  - `2012-08-20-Boatless-Sailing.md`
  - `2012-12-15-sanivation-post.md`
  - `2014-06-15-Building-a-Storytelling-Community.md`
  - `2016-08-15-tiny-house-post.md`
  - `2017-05-15-AuxBoard.md`
  - `2017-06-15-social-anchors-post.md`
  - `2018-05-20-Intention.md`
  - `2022-5-30-onebag.md`
  - `2024-06-20-r2ak2024.md`
  - `2025-01-15-access-to-tools.md`
  - `2025-05-27-Finding-Your-Gaps.md`
  - `2025-06-15-yutori.md`
  - `2025-06-20-vanisle-360.md`
- [ ] Verify orphan post dates (only `2014-06-30-pods-in-pods` has a real date from the source). [content] [quick]
- [ ] Reconcile Nairobi Lamp date, `/projects` says "(2011)", post is dated 2018-06-15. [content] [quick]
- [ ] Audit `_posts/` for missing or malformed front matter. [content] [quick]
- [ ] Add real photos for the 6 commented-out `image_preview:` refs (`grep -rn '# image_preview' _posts/` to find them). Each post's filename hints at the intended shot, r2ak2024.jpg, vanisle360.jpg, golux_racing.jpg, access_to_tools.jpg, dirt_roads.jpg, sanivation.jpg. Drop files in `images/blog_posts/`, then uncomment. [content] [medium]
- [x] Typo `costal` → `coastal` in `_posts/2026-02-23-Coastal-Systems.md:5` (`categories: ecosystem, costal, …`) and `_pages/about.md:10` ("costal resilience"). [content] [quick] — done, verified 2026-06-17 (both now read "coastal").

### Site structure / nav
- [ ] Refresh `_pages/about.md` to reflect 2026 context, broken out from LinkedIn diff (2026-05-22):
  - Title: "Co-Founder" → "Co-Founder and Chief Strategy Officer" at Astraeus.
  - Add Greater Seattle Area as location.
  - Add tagline framing "Resiliency Strategist | Community Organizer" somewhere honest.
  - Add Island Lab (May 2026–) as a current role.
  - Sharpen Astraeus blurb: name the Halcyon platform; describe as "operational decision support infrastructure for ocean farming and coastal resource management."
  - Add birding as a quiet through-line ("…spotting most of the birds along the way").
  - Add a link out to Substack (`skolk7.substack.com`).
  [content] [medium]
- [ ] Update stale `/making` links in `about_page.md` (lines 20, 42) to `/projects`, the redirect catches them but the source is inconsistent post-rename. [content] [quick]
- [x] Fix malformed link in `index.html`, `<a href="www.astraeusoceansystems.com">` is missing protocol and renders as a relative path. [content] [quick] — done, verified 2026-06-17 (now `https://astraeusocean.com/`).
- [ ] Verify portfolio entries in `_portfolio/` link to underlying posts where they exist. [content] [medium]
- [ ] Replace or delete the three placeholder portfolio entries `_portfolio/test.md`, `test0.md`, `test1.md`, currently shipping as "test test test" with stock theme thumbnails. [content] [quick]
- [ ] `/log` could show short_description / image previews, currently just title + date. [design] [medium]
- [ ] Home bio at `index.html:7` still names only Astraeus + REAP. Island Lab now sits below in Current Projects but isn't in the lead paragraph. Either fold it in or shift the bio away from enumerating roles. [content] [quick]
- [ ] Add an **SA Strategy and Design** section to `/projects` (consulting practice 2018–present, currently absent from the site). Mention NASA SBIR / Nahlia Health (Mars medical), Earth and Planetary Institute of Canada, eDNA drone w/ Sequence Environmental + M.A.R.E., Sanivation data architecture, marine autonomous navigation. [content] [medium]
- [ ] Add **Substack** link to footer alongside `/feed.xml`, `/now`, `/tags`. [infra] [quick]

### Identity dimensions currently absent from the site
LinkedIn diff (2026-05-22) surfaced several through-lines that exist publicly but appear nowhere on the site.
- [ ] **Burning Man / Burners Without Borders.** Ranger since Aug 2019, BWB Build Lead since Aug 2019, 6+ years each. Decide whether this lives as a paragraph on `/about`, a section on a new community page, or its own page. [content] [medium]
- [ ] **Birding.** Currently invisible. At minimum a line on `/about`; could grow into its own subsection alongside sailing/mountaineering. [content] [quick]
- [ ] **Certifications.** `/mountaineering` lists certs but is missing AIARE 2 (Dec 2023), USHPA P2 (paragliding), and 2 others LinkedIn truncates. Add them. [content] [quick]
- [ ] **altMBA (2019).** Not mentioned anywhere, small but worth a line where education/training surfaces. [content] [quick]

### Writings to backfill from LinkedIn / Substack (2026-05-22 diff)
Material already exists as LinkedIn posts or Substack essays. These are *candidates*, not all need to become posts, but each is a real lived event with no site presence today. Group by effort, not date.

**Short-term (single-session posts, ~1–2 hrs each):**
- [ ] Tall ship voyage, Stadtsrand Lehmkuhl, Glacier Bay → San Francisco (Oct/Nov 2025). Completes the non-continuous Sea of Cortez → Alaska coastal sail. **Biggest missing sailing narrative.** [content] [medium]
- [ ] Alaska Mariculture Conference trip report, Anchorage, March 10–12 2026. [content] [quick]
- [ ] WHOI / VentureWell Boston visit (May 2026). [content] [quick]
- [ ] Sea Meets Sky, PNW Climate Week Maritime + Space event, July 2025. [content] [quick]
- [ ] CoMotion Climate Tech Incubator 2026 cohort acceptance. [content] [quick]
- [ ] REAP $530K Catalyst Grant, Regenerative Jobs Program (bioremediation, biochar, vermiculture, composting). [content] [quick]
- [ ] CA Jobs First RII application story (the $20M federal pivot to state funding). [content] [quick]
- [ ] Pacific Marine Expo / Maritime Blue + Dutch maritime delegation presentation (Nov 2025). [content] [quick]
- [ ] Climate Camp 2025 / 9Zero. [content] [quick]
- [ ] Cross-post or link the "Navigating vs. Pathfinding" Substack essay (skolk7.substack.com). [content] [quick]

**Medium-term (a series, multiple posts, shared frame):**
- [ ] **Davos / WEF 2026 series.** At least 4 posts of material on LinkedIn already: arrival + climate scale-up skiing cohort, unDavos / InTent / Goals House, NatCap / TNFD / Club of Rome on incentive systems, Max Frieder / Artolution refugee art workshop. Likely 1 anchor essay + 3–4 follow-ups, mirroring how it played out on LinkedIn. [content] [project]
- [ ] **Future Food Institute / Pollica, Italy series.** Partnership announcement, Save the Ocean Bootcamp scholarship, July 2026 trip report. Kate joining. Multi-month arc, write the announcement now, the trip report after. [content] [project]
- [ ] Port the CCC (Civilian Conservation Corps) reflection essay from LinkedIn. Long-form, fits the "reflections" voice in VISION. [content] [medium]

**Long-term (project, multi-session, structural):**
- [ ] **SA Strategy and Design consulting era write-ups (2018–present).** Each of these is a candidate post: NASA SBIR / Nahlia Health Mars medical, Earth and Planetary Institute of Canada, drone-based eDNA sampling, off-grid sanitation data work in Kenya, marine autonomous navigation integration, hardware/firmware crypto security. ~6 posts, plus the umbrella `/projects` section above. [content] [project]
- [ ] **Cadence**: figure out a sustainable rhythm so LinkedIn isn't running 6–12 months ahead of the site again. Could be: write here first, syndicate to LinkedIn second. Or a monthly "log everything from this month" backfill ritual. Decision belongs in VISION. [content] [project]
- [ ] **Instagram backfill.** Not yet surveyed (no IG content provided in the 2026-05-22 diff). Likely material: trip photos with locations, birding, hands-on project shots. Worth a pass once content is pasted. [content] [project]

### Writings, originals to draft (Sean's brain dump 2026-05-22)
Sean-named topics, not derived from LinkedIn. Mix of trip-report revisions and long-form essays. Tag honestly: trip reports are usually [medium], long-form essays usually [project] because the thinking is the work, not the writing.

**Trip-report revisions (replace existing posts, don't add to them):**
- [ ] **R2AK 2024 rewrite.** The existing `_posts/2024-06-20-r2ak2024.md` is on the LLM-puff spot-check list, this rewrite *is* the resolution. Honest first-person account from the actual race. [content] [medium]
- [ ] **VanIsle 360 rewrite.** Same shape, existing `_posts/2025-06-20-vanisle-360.md` gets replaced with the real story. The 3-week / 50-foot / 20-ft Pacific swells frame from LinkedIn is a start, not the finished thing. [content] [medium]

**Trip reports (overlap with LinkedIn backfill, already prioritized, listing here so they're not lost):**
- [ ] **Davos / WEF 2026.** Already on the medium-term backfill list as a 4–5 post series. Confirmed priority. [content] [project]
- [ ] **Climate Week**, PNW Climate Week 2025 (Sea Meets Sky is on the backfill list); confirm whether this is the same thing or a separate write-up. [content] [medium]

**Long-form essays, relationship / life rhythm:**
- [ ] **Living with an expedition sailor.** 4 months on / 4 months off with Kate. The mechanics, the trust, what each return is like, what you learn about partnership when half of it is regularly somewhere else. [content] [project]

**Long-form essays, transitions and moving between fields (these cluster; might be one essay, might be a small series):**
- [ ] **How to find communities of learning.** Where do you go, how do you know it's the right one, how do you act once you're there. [content] [project]
- [ ] **How to move into a new field.** Practical, what worked, what didn't. Probably a sibling of the above. [content] [project]
- [ ] **Using skills from other lives to move into new fields, via metaphor and models.** The actual transfer mechanism: how sailing teaches you something about ocean tech, how robotics teaches you something about grant strategy, etc. This is the *why* the prior two work. [content] [project]
- [ ] **How to talk to other people, why you should, and how to keep showing up, committing as a form of risk.** The social half of all of the above. [content] [project]
- [ ] **What to do when you're burnt out from tech (or whatever).** Honest, not a self-help take. Tied to the same cluster but pointed at people in the trough, not the climb. [content] [project]

**Long-form essays, observations and frames:**
- [ ] **Small vs. large learning and travel groups.** What changes between a 6-person charter and a 60-trainee tall ship, between a 5-person bootcamp and a 200-person conference. What each is good for. [content] [project]
- [ ] **Economic modeling for complexity theory (Hausmann).** Ricardo Hausmann's economic-complexity work as a frame for thinking about coastal / ocean systems and capability adjacency. Probably long. [content] [project]
- [ ] **Prototypes and models vs. reading.** What building a thing teaches you that reading about it can't. Pairs naturally with the metaphor-and-models essay. [content] [project]

Cross-reference: the "long-form essays vs. quick log entries, separate collection or layout" item under **Reference-site convergence Phase 2** is now load-bearing, most of this section is long-form. The substrate question gets sharper once 3–4 of these exist as drafts.

### Infrastructure / repo hygiene
- [ ] Resolve Dependabot vulnerabilities, 4 alerts (1 critical, 3 high). [infra] [quick]
- [ ] Consider installing `jekyll-redirect-from` so `redirect_from:` frontmatter works (currently using a manual stub at `making.html`). [infra] [quick]
- [ ] Twitter (`s_kolk`) still in `_config.yml:social:`. After moving messaging to LinkedIn, decide whether to keep it as a courtesy link or remove. [infra] [quick]
- [ ] `_pages/now.md` "Last updated: YYYY-MM-DD" line is manually maintained and goes stale on every edit. Either derive from front matter `date:` (with a `last_modified_at` plugin or git-mtime) or drop the line. [infra] [quick]

### Design / aesthetic (see VISION.md)
- [ ] Settle on direction before sinking time into theming. [design] [project]
- [ ] Decide on substrate for the next phase: stay on Jekyll + plugins, or move to something graph-aware (Quartz, custom, etc.). [design] [project]

### Reference-site convergence (xxiivv / kokorobot / 100r)
Phase 1, additive, stay on Jekyll:
- [ ] Add `/index` or `/all`, every post grouped by year, single page, text-only (xxiivv-style tree). [design] [medium]
- [ ] Add per-post metadata footer: date + categories + (optional) related/incoming posts. [design] [medium]
- [ ] Add `short_description` + first image as previews to `/log` (already on TODO; reframe as xxiivv-style log entry). [design] [medium]
- [ ] Replace placeholder copy on `/now`, current text was Claude-drafted from `about_page.md` + `projects.md`. Needs Sean's actual current state. [content] [quick]

Phase 2, bigger swings, may force substrate decision:
- [ ] Calendar-grid log view, years × weeks/months, each cell a post. [design] [project]
- [ ] Bidirectional links: for each post, surface other posts that link to it. [design] [project]
- [ ] Long-form essays vs. quick log entries, separate collection or layout. [design] [project]
- [ ] First-class image galleries inside posts (not just inline `<img>`). [design] [medium]
- [ ] Replace `hack.css` with hand-built CSS, own typography, color, spacing. [design] [project]
- [ ] Add a per-category color or glyph that propagates to nav + log entries. [design] [medium]

Phase 3, deferred until joint site with Kate exists:
- [ ] Decide hand-drawn vs. text-only nav per VISION open question (text-only for solo, hand-drawn for joint, confirm when joint site starts). [design] [project]
- [ ] Joint about / shared-projects framing on the eventual second domain. [content] [project]

## Done

(Move completed items here with a date.)

- 2026-06-17: fixed broken `/images/me.jpg` favicon + `og:image` (shipped 404 on every page) by repointing both to `/images/favicon.png` in `_includes/head.html`.
- 2026-06-17: removed em-dashes the June sweep missed: `index.html` (8 occurrences → `&raquo;`/`&middot;` for log/recap meta separators, colon for "Current Projects" label-descriptions) and `_pages/tags.html` (`&mdash;` entity → `&raquo;`). Tree is em-dash-clean.
- 2026-05-22: cleared 3 of 9 broken image refs by promoting real inline images to `image_preview:`, Seychelles → image8.jpg, goal-setting → image1.jpg, tiny-house → image64.jpg. Commented out the other 6 (`# image_preview (TODO: add photo): …`) so `bin/lint` passes; backlog item to add real photos.
- 2026-05-22: hardened `bin/lint` image check to skip YAML/HTML comment lines.

- 2026-05-22: mirrored the `/projects` auto-listing Liquid block onto `/sailing` (keywords: sailing, racing, r2ak, offshore) and `/mountaineering` (keywords: mountaineering, climbing, alpine, skiing, paragliding, peak). Pages now surface their own posts reverse-chronologically.
- 2026-05-22: converted 8 posts from comma-separated `categories:` to YAML list syntax, clears the `_site/community,/`, `_site/sailing,/`, etc. URL leaks.
- 2026-05-22: stripped trailing whitespace from `2026-02-23-Coastal-Systems.md` front matter (`layout: post ` with trailing space was breaking the layout lookup); fixed `Intelegence` → `Intelligence` in its `short_description`.
- 2026-05-22: renamed 3 posts to fix filename convention: `2016-01-15-Freezing People.md` → `Freezing-People.md`; `2022-2-6-helloworld.md` → `2022-02-06-helloworld.md`; `2022-5-30-onebag.md` → `2022-05-30-onebag.md`.
- 2026-05-22: added `bin/lint` (static pre-commit checks) and `.githooks/pre-commit` (opt-in via `git config core.hooksPath .githooks`).
- 2026-05-22: added `/now`, `/tags`, and RSS link in footer; moved standalone pages into `_pages/`; deleted stale `projects_page.md`, `docs.md`, `examples.html`; fixed missing leading slashes on `log` and `portfolio` permalinks.
- 2026-05-22: deleted `_posts/2014-12-20-Maker-Projects.md`, stale draft from the `/making` → `/projects` rename, never a real post.
- 2026-05-22: `.gitignore` added; `_site/`, `vendor/bundle/`, `.DS_Store` untracked.
- 2026-05-22: front-end / back-end divide established (`_backend/`, `_drafts/`, `_archive/` with READMEs).
- 2026-05-22: renamed `making.md` → `projects.md` (`/making` → `/projects`); kept `/making` redirect.
- 2026-05-22: moved Squarespace export out of `_posts/` into `_archive/squarespace-2024/`.
- 2026-05-22: normalized 5 post filenames (spaces → dashes, missing extension, typo fix).
- 2026-05-22: added `CLAUDE.md`, `CHANGELOG.md`, `VISION.md`, `TODO.md`, `/run-cycle` command.
- 2026-05-21: restored blog posts from Squarespace source and wired up images (commit `58df568`).
- 2026-05-21: split Seychelles post, extracted Brain Slicing Robots and Nairobi Lamp into their own posts.
- 2026-05-21: hid `2022-2-6-helloworld.md` via `published: false`.
- 2026-05-21: overrode hack.css dark-mode pseudo-elements that rendered literal `##`/`===` over headings.
- 2026-05-21: re-categorized 7 orphan posts (log → topical) so they surface on `/projects`.
