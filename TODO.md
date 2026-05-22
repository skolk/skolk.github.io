# TODO — skolk.github.io

Internal scratchpad. Not published. Update freely; nothing here is precious.

## Content fidelity (carry-over from Squarespace restore)

- [ ] **Duplicate posts to reconcile:** `2014-11-10-one-small-step.md` (Squarespace orphan I created) and `2014-11-20-Taking-Action-Environmental-Issues.md` (pre-existing) cover the same Gasland/micro-adventures content. Decide which to keep — probably merge the original's text into the existing slug, then delete the orphan.
- [ ] **Posts with no Squarespace source — fidelity unknown.** These were never in the export so I can't verify they're not LLM-fabricated. Spot-check or rewrite:
  - `2012-08-20-Boatless-Sailing.md`
  - `2012-12-15-sanivation-post.md`
  - `2014-06-15-Building-a-Storytelling-Community.md`
  - `2014-12-20-Maker-Projects.md`
  - `2016-08-15-tiny-house-post.md`
  - `2017-05-15-AuxBoard.md`
  - `2017-06-15-social-anchors-post.md`
  - `2018-05-20-Intention.md`
  - `2022-2-6-helloworld.md` (hidden but still in repo)
  - `2022-5-30-onebag.md`
  - `2024-06-20-r2ak2024.md`
  - `2025-01-15-access-to-tools.md`
  - `2025-05-27-Finding Your Gaps.md`
  - `2025-06-15-yutori.md`
  - `2025-06-20-vanisle-360.md`
- [ ] **Orphan post dates are best guesses.** Only `2014-06-30-pods-in-pods` has a real date from the source. Verify and adjust the rest if you remember when they were originally posted.
- [ ] **Nairobi Lamp date mismatch:** `/projects` says "(2011)", post is dated 2018-06-15. Pick one.

## Site structure / nav

- [x] Rename Making → Projects
- [ ] Mirror the auto-listing pattern from `/projects` onto `/sailing` and `/mountaineering` (currently both are static curated pages with no per-post links).
- [ ] About page (`about_page.md`) — wasn't touched in the restore. Review whether it still reflects current focus (Astraeus / REAP / Space ROS).
- [ ] `/log` index could show short_description / image previews — currently just title + date.

## Infrastructure / repo hygiene

- [ ] **Dependabot:** 4 vulnerabilities (1 critical, 3 high). https://github.com/skolk/skolk.github.io/security/dependabot
- [ ] `_site/` is committed to the repo. For a `username.github.io` site Jekyll rebuilds on Pages, so the committed build is dead weight and creates noisy diffs. Consider adding `_site/` to `.gitignore`.
- [ ] No `.gitignore` exists. Add one (at minimum: `_site/`, `.DS_Store`, `.jekyll-cache/`, `vendor/bundle/`).
- [ ] `_posts/SeanAKolk Square Space 2024 /` folder (trailing space, original export) is in working tree as untracked. Decide: archive elsewhere, gitignore, or delete now that posts are restored.
- [ ] Consider installing `jekyll-redirect-from` so `redirect_from:` frontmatter works (currently using a manual `making.html` redirect stub).

## Design / aesthetic (see VISION.md)

- [ ] Settle on direction before sinking time into theming — `hack.css` works fine for now but won't scale to the xxiivv-style aesthetic.
- [ ] Look at whether to stay on Jekyll or move to a system that supports a knowledge-graph / bidirectional links (Quartz, Astro, custom).
