# Definition of Done

What "done" means for a change to `skolk.github.io`. The site is static. The build is the test. The bar is shipping content that renders, reads, and links correctly.

A change is done when ALL of the following are true.

## For any change

- The Jekyll build passes locally. Run `bundle exec jekyll serve` (or `bundle exec jekyll build`) and see zero errors. Warnings are acceptable if intentional.
- The change is committed with a message that names what changed and why. Past tense, present-perfect, or imperative all fine; just make it specific.
- `git status` is clean after commit (no stray untracked or modified files left behind).
- The commit is pushed to `origin/master`.
- The GitHub Pages build (visible at https://github.com/skolk/skolk.github.io/actions or via email) succeeds within ten minutes of the push.
- The live URL renders the change.

## For content changes (new post, page edit, copy tweak)

- All links in the changed file resolve. Internal links target a real `_pages/` or `_posts/` file. External links open the intended page.
- All image references resolve. Images live in `images/blog_posts/` (for posts) or `images/` (for site-level assets). No hotlinks to third-party CDNs unless deliberate and noted.
- Every `<img>` has alt text.
- Front matter is well-formed: `layout`, `title`, `date`, `permalink` (where applicable), `categories`, `tags`.
- Mobile rendering is checked at narrow viewport (375px) for any page with new layout, images, or tables.
- No internal contradictions with sibling pages. If you update a stat on `sailing.md`, check that `about.md` and `projects.md` don't echo the old number.

## For structural changes (layouts, includes, config, plugins)

- All of "any change" PLUS:
- Visual sanity-check on at least three pages: home, one `_pages/` page, one `_posts/` page.
- Check that listing pages (`articles.html`, `recaps.html`, `trip-reports.html`) still populate correctly.
- If `_config.yml` changed, confirm Jekyll restarts cleanly (config is not hot-reloaded).
- Mobile rendering is checked.

## For stabilization cycles

- All of "any change" PLUS:
- `RISKS.md` reflects the new state. Mitigated risks are marked, new risks are added.
- `NEXT_STEPS.md` is updated: items completed in this cycle move to `## Done`, new items from the audit are queued.
- The audit reports (broken-link, staleness) are summarized in the commit message or a brief note.

## What "done" does NOT require

- A unit test. There is no test suite. The build is the test.
- A code review. Sean self-reviews.
- A staging environment. The local Jekyll serve IS staging.
- A changelog. Git history is the changelog.

## When to escalate before declaring done

- The Jekyll build fails and you can't pinpoint why.
- A link or image change cascades into more than three other files.
- A content change touches contact info, certifications, or anything externally verifiable.
- Anything that affects layouts or `_config.yml` and could break the Pages build for an unknown window.

In any of those, surface to Sean with the diff and the specific question, rather than pushing and hoping.
