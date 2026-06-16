# Risks

Living register of risks to the integrity, accuracy, and continued operation of `skolk.github.io`. This is a static Jekyll site, not a software product. The "build" is the test. Risks here are about content drift, broken outputs, and operational hiccups, not runtime correctness.

Format:

- **ID**: short stable handle.
- **Title**: one-line risk name.
- **Severity**: Low / Medium / High. Reflects impact if the risk materializes.
- **Likelihood**: Low / Medium / High. Subjective best-guess.
- **Description**: what could go wrong.
- **Trigger / signal**: how we'd notice.
- **Mitigation**: how we keep it from biting.
- **Contract refs**: empty for now. The site has no contract suite. The Jekyll build IS the contract.
- **Status**: Open / Watching / Mitigated.

---

## R-001: Broken-link rot

- **Severity**: Medium
- **Likelihood**: High
- **Description**: Internal slugs change, posts get renamed or deleted, external links die. Markdown links can develop malformed syntax (unclosed parens, missing brackets) from copy-paste edits. The site builds successfully but a visitor hits a dead end.
- **Trigger / signal**: 404s in GitHub Pages logs (not currently monitored), reader complaints, or periodic manual sweep.
- **Mitigation**: Run the broken-link scan in this stabilization cycle. Schedule a quarterly sweep. Consider adding `html-proofer` to a GitHub Actions workflow if maintenance burden grows.
- **Contract refs**: none.
- **Status**: Mitigated for this pass (June 2026 scan found zero broken links). Open as a recurring risk.

## R-002: Image bitrot

- **Severity**: Low
- **Likelihood**: Medium
- **Description**: Images in `images/` and `images/blog_posts/` are referenced by absolute paths. If files are renamed, moved, or deleted (cleanup, accidental git checkout), posts go imageless. Some posts depend on hotlinked external images (Drive, S3 buckets, third-party CDNs) that may evaporate.
- **Trigger / signal**: Broken image icon on a page. Visual inspection during the next sweep.
- **Mitigation**: Keep all post images in `images/blog_posts/`. Avoid hotlinking. Verify image refs as part of the broken-link sweep cadence.
- **Contract refs**: none.
- **Status**: Watching. June 2026 sweep verified all 72 image refs resolve.

## R-003: Jekyll build break on push

- **Severity**: High
- **Likelihood**: Low
- **Description**: A bad change to `_config.yml`, a malformed front matter block, an unsupported Liquid tag, or a plugin version drift can break the GitHub Pages build. The site goes stale or shows the last successful build forever, with no obvious signal unless you check the Actions tab.
- **Trigger / signal**: Email from GitHub about a failed Pages build. The site itself shows old content, easy to miss.
- **Mitigation**: Build locally with `bundle exec jekyll serve` before pushing risky changes (config, layouts, new plugins). Push small commits, not big batches, so a break is easy to bisect. Watch for the GitHub Pages build email.
- **Contract refs**: none. The Jekyll build IS the contract.
- **Status**: Open.

## R-004: Accessibility regressions

- **Severity**: Medium
- **Likelihood**: Medium
- **Description**: New posts and pages may drop alt text, use poor heading hierarchy, low-contrast colors, or rely on color alone to convey meaning. The site grows over time without anyone explicitly checking a11y.
- **Trigger / signal**: Reader feedback. A formal audit. Lighthouse score drift.
- **Mitigation**: Ensure every `<img>` has alt text. Use semantic headings (one H1 per page, descending levels). Run Lighthouse on the home page and `/sailing` once a quarter. Avoid color-only signaling in layouts.
- **Contract refs**: none.
- **Status**: Open.

## R-005: Stale facts

- **Severity**: Medium
- **Likelihood**: High
- **Description**: Numbers age. "X years sailing", "Y miles", "currently working at Z" all drift from reality without anyone updating them. Internal contradictions appear when one page is updated but a sibling page is not (e.g., `about.md` says "40+ people" while `sailing.md` says "Nearly 40"). The `/now` page goes stale within weeks.
- **Trigger / signal**: Sean's discomfort reading the page. External question that exposes the gap. The staleness audit in this cycle found six medium-priority and three low-priority items.
- **Mitigation**: Quarterly staleness sweep across `_pages/*.md`. Update `/now` monthly at minimum. Cross-check counts across `about.md`, `sailing.md`, and `projects.md` whenever any of them are touched.
- **Contract refs**: none.
- **Status**: Open. See `NEXT_STEPS.md` for the open items from the June 2026 audit.

---

## How this file is used

- New risks get appended with the next ID in sequence.
- Severity, likelihood, and status are revisited during inspection cycles.
- Mitigations should be concrete actions, not aspirations.
- If a risk is permanently mitigated (e.g., we add a CI check that catches it forever), move it to a `## Mitigated risks (archive)` section at the bottom rather than deleting.
