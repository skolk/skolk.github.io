---
description: Scan the site, cross-check against vision/TODO/changelog, and report prioritized next steps. Appends new items to _backend/TODO.md (de-duped). Does not modify posts, rename files, or change other content.
---

# /run-cycle

You are running a maintenance cycle on this personal site (Jekyll, GitHub Pages, `skolk.github.io`). The user wants a fast, honest read on the current state of the site and what to do next — judged against their stated vision.

## Mode

**Report + append-to-TODO only.** You may:

- Read any file in the repo.
- Append new items to `_backend/TODO.md` under `## Active` (de-duplicated — if a similar item already exists, skip it; never create duplicates).

You must NOT:

- Rename, delete, or move posts or pages.
- Edit front matter, post content, or layouts.
- Touch the `Done` section of TODO.md (the user moves items there manually after completing them).
- Edit `CHANGELOG.md`, `VISION.md`, `CLAUDE.md`, or other files outside `_backend/TODO.md`.
- Run `git add` / `git commit` / `git push`.

If you find something that looks like it warrants a fix beyond appending to TODO, surface it in the report and let the user decide.

## Steps

1. **Load context.** Read in this order:
   - `_backend/VISION.md` — direction, phases, principles.
   - `_backend/TODO.md` — open and recently done items.
   - `CHANGELOG.md` — recent structural changes.
   - `CLAUDE.md` — conventions and gotchas.

2. **Scan the site.** Use `Grep`/`Bash`/`Read` to check:

   - **Posts (`_posts/`):**
     - Filenames follow `YYYY-MM-DD-Title-With-Dashes.md`. Flag spaces, missing dashes/extensions, typos.
     - Every post has front matter with at least `layout`, `title`, `date`.
     - Image references resolve under `images/` (especially `images/blog_posts/`).
     - No untracked or modified posts left dangling in `git status`.
     - Posts in `_drafts/` that look ready to publish (have full front matter, date, complete body).
   - **Pages (top-level `.md` / `.html`):**
     - `about_page.md` freshness vs. current date and vision phase.
     - Auto-listing pattern: which of `/sailing`, `/projects`, `/mountaineering` already surface posts by category, and which still need it (Phase 1 item in VISION).
     - Redirect stubs exist for any renamed pages.
   - **Portfolio (`_portfolio/`):**
     - Entries link to underlying posts where they exist.
   - **Repo hygiene:**
     - `.gitignore` covers `_site/`, `vendor/bundle/`, `.DS_Store`, `.jekyll-cache/`.
     - No build output (`_site/`) tracked.
     - No stray `.DS_Store` tracked.
   - **Cross-checks against TODO:**
     - Any open TODO items that look already done (i.e., the file/state matches what the item asks for). Flag them — don't move them yourself.

3. **Cross-check against vision.** Compare findings to `_backend/VISION.md`:
   - Which Phase-1 items in VISION are still open? (Auto-listing on `/sailing` and `/mountaineering`, "now" page, year-grouped index, audit of LLM-puffed posts.)
   - Anything actively drifting away from the "workshop not blog" direction (e.g., generic content sneaking in)?
   - Any quick wins that move toward Phase 2 without committing to the substrate decision yet?

4. **Report.** Output a concise summary in chat, organized as:

   ```
   ## Run cycle — <today's date>

   ### Health snapshot
   - <2–4 short bullets on overall state — what's good, what's drifting>

   ### Findings
   #### Quick (under 30 min)
   - <items>
   #### Medium (an evening)
   - <items>
   #### Project (multi-session)
   - <items>

   ### Suggested next 1–3 moves
   1. <highest-leverage thing to do now, with a one-sentence why>
   2. ...

   ### Already-done items still open in TODO
   - <items from TODO that the scan suggests are actually complete>
   ```

   Keep each section tight. The user reads this fast.

5. **Append new items to `_backend/TODO.md`.**
   - Only items that aren't already covered (semantically, not just lexically — "audit X" and "review X" are duplicates).
   - Add them under the appropriate `### subsection` in `## Active`.
   - Tag with `[quick]` / `[medium]` / `[project]` and one of `[content]` / `[infra]` / `[design]`.
   - At the end of the report, list which items you added so the user can see.

6. **Stop.** Do not commit. Do not rename. Do not edit posts. The user drives next moves.

## Style notes

- Be specific. "Post X is missing a date" beats "some posts have front matter issues."
- File path + line number when relevant, so the user can jump straight there.
- If you can't tell whether something is a problem (e.g., a post's voice feels off but you don't know the original intent), flag it for the user to decide — don't silently rewrite.
- Match the voice of `VISION.md`: honest, slightly understated, no hype.
