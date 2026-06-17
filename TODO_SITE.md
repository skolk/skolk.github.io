# Site TODO - skolk.github.io
> Captured from Sean's 2026-06-16 voice walkthrough. Updated when items land.

## Immediate (this session)
- [x] Fix Space ROS dates (2025 -> 2024 where applicable) - commit b712a2d
- [x] Reorder Projects page: Active at top (IslandLab, Astraeus Ocean Systems, Replant Center) - commit b712a2d
- [x] About page: Explorations / Professional Evaluation / Community Building rendered as H2 - commit b712a2d
- [x] Create stub project pages: R2AK (as project), Nairobi communal house, Friday morning gatherings - commit b712a2d
  - Note: Halfway House already has a project entry and an existing post (`_posts/2016-08-15-tiny-house-post.md`). Added a stub project page that links to the existing post for consistency.
- [x] Articles index reorganized chronologically (grouped by year, newest first) - commit b712a2d
- [x] Sailing trip cross-links added (VanIsle 360, R2AK, Seattle to Glacier Bay) - commit b712a2d
  - Note: No dedicated Seattle-to-Glacier-Bay post yet. Linked alaska-petrichor as closest equivalent, flagged in TODO.
- [x] Reading library page stub created + linked from monthly recaps - commit b712a2d

## Soon (this week or next pass)
- [ ] Fill in body for the four new project stubs (R2AK, Halfway House, Nairobi, Friday gatherings)
- [ ] Move "What happened to sailing" from Making -> Log
- [ ] Reclassify "Adventure Report" as a Post category, not Making
- [ ] Reclassify "Boatless sailing" as a Post about targeting boats for several years (the years without a boat but still sailing)
- [ ] Reclassify "Climate funding strategy" as a Project
- [ ] Reclassify "Ocean technology" as a Project (with write-up)
- [ ] Add Adventure Report posts about sailing, teaching, and mentorship topics to About
- [ ] Add tags to newly generated articles
- [ ] Fill in book reviews / library page entries where currently "Notes pending"
- [ ] Beef up Race to Alaska project page: prep, build, route - not just trip report
- [ ] Write a dedicated Seattle-to-Glacier-Bay 2024 trip-report post (currently only referenced inside the alaska-petrichor stub)
- [ ] Propagate the "Full reading library" link to older monthly recaps (only the most recent recaps were touched this pass; earlier ones still don't link to /library/)

## Scope-larger (design + content work)
- [ ] Rethink the layout of the Projects page overall (top scope-larger item)
- [ ] Every sailing entry should have at minimum a post or a picture in a standard format
- [ ] Every mountaineering entry should have at minimum a post or a picture + Peak Bagger profile link
- [ ] Destinations Sailed: switch to dual-column layout, link Sailing Video Guide and related sailing projects, link trip reports + pictures, link Peak Bagger
- [ ] More small images throughout art-related Log entries

## Per-page notes

### About
- Explorations, Professional Evaluation, and Community Building need visual differentiation (use H2 styling consistent with site, no custom CSS)
- Note: site About page used "Professional Evolution" rather than "Professional Evaluation". Speech-to-text - likely "Evolution" was the actual word. Kept the existing wording.
- Add Adventure Report posts about sailing, teaching, mentorship

### Projects
- Reorder: Active Projects at the very TOP
- Active project order: 1) IslandLab (2026, most recent) 2) Astraeus Ocean Systems 3) Replant Center
- New project stubs needed: Race to Alaska (R2AK), Halfway House (verify if exists), Nairobi communal house, Friday morning coffee + gatherings
- Friday gatherings = the convening practice ("good meetings you bring people to")
- Full layout rethink is the top scope-larger item

### Sailing
- VanIsle 360, R2AK, Seattle to Glacier Bay entries should link to their trip-report posts
- Standard format push (larger scope): every entry gets a post or a picture

### Mountaineering
- Same standardization as sailing: post or picture per entry
- Link to Peak Bagger profiles where they exist

### Articles
- Likes the current page styling
- Need more tags on newly generated articles
- REORGANIZE: chronological (date-based, newest first or by year) instead of location/area-based grouping
  - Note: the Articles page itself was already chronological. The location/area-based grouping appears on the Trip Reports page (`/trip-reports`). Articles is now grouped by year for better scanability. Trip Reports remains region-grouped pending Sean's confirmation.

### Log
- Likes the chevron + date + link pattern as-is - no change
- Want more small images throughout art-related entries (larger scope)

### Reading
- Reading section of monthly recaps should link to a library/books page
- Build /library/ (or /books/) page listing all past books with short write-ups
- Where Sean doesn't have thoughts on a book, leave a "needs review" placeholder

### Destinations Sailed
- Dual column layout (current single column looks sparse)
- Link Sailing Video Guide and related sailing projects
- Link trip reports + pictures
- Link Peak Bagger and other trip-report sources for the mountain-side equivalent

## Factual corrections
- Space ROS project: dates are 2022-2024, not 2025. Found in `_pages/projects.md` line 18 only. Fixed in this commit.

## Open questions for Sean
- Replant Center: what is this? Need context to write a real stub. The Projects page currently lists REAP Climate Center workforce development as the active program at REAP. Is "Replant Center" a renaming, or a separate effort?
- Halfway House: confirmed - both an existing post (`_posts/2016-08-15-tiny-house-post.md`) and an entry in Projects. Stub project page added pointing to the existing post. OK?
- Friday morning coffee gathering: framing - Project, Practice, or Community? Affects layout. Currently stubbed as a project, slug `friday-gatherings`.
- "Good meanings" was speech-to-text - assumed "good meetings". Confirm.
- Nairobi communal house: what timeframe, what role did Sean play? Existing Nairobi Lamp post (2011) is separate - the stub is for a *house* project distinct from the lamp.
- "Professional Evaluation" vs "Professional Evolution" on About page - existing wording is "Evolution". Confirm intent.
