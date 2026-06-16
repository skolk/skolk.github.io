---
description: Pre-commit verification — runs `./_backend/bin/lint` for static checks, then builds the site locally and checks for build-time bugs (output structure, redirect stubs, placeholder posts). Reports PASS / FAIL with file paths. Does not edit or commit anything.
---

# /test_local

Pre-commit gate. Two layers:

1. **Static layer** — delegated to `./_backend/bin/lint`. Catches filename / front matter / comma-category / broken-image / permalink / tracked-artifact bugs without building. Source of truth for these checks lives in the script, not here.
2. **Build layer** — only this command runs Jekyll, so build-time issues live here.

## Mode

**Read + build only.** You may:

- Run `./_backend/bin/lint`, `./_backend/bin/lint --staged`.
- Run `bundle exec jekyll build` (and read `_site/`).
- Run `git status` / `git diff --cached` to inspect what's about to be committed.
- Use `grep` / `find` / `ls` freely.

You must NOT:

- Edit any source file.
- `git add` / `git commit` / `git push`.
- Modify `_site/` or treat it as source of truth — it's build output.
- "Fix" anything you find. Report it; the user decides.
- Duplicate the `_backend/bin/lint` checks here. If a finding belongs in the static layer, add it to `_backend/bin/lint` instead.

## Checks

Run in order. One line per check: `PASS — <check>` or `FAIL — <check>: <details>`.

### 1. Static checks (`./_backend/bin/lint --staged`)
- Run `./_backend/bin/lint --staged`.
- If exit code is 0: `PASS — static checks (bin/lint)`.
- If non-zero: `FAIL — static checks` and inline the script's output verbatim under it. Do not re-interpret — the script is canonical.

### 2. Build
- `bundle exec jekyll build` exits 0.
- Capture stderr. Any line containing `Warning:`, `error`, `did not match`, or `Conversion error` is a FAIL with the message inlined.

### 3. Expected pages built
- After the build, verify each of these exists under `_site/`:
  - `index.html`, `404.html`, `feed.xml`
  - `about.html`, `log.html`, `sailing.html`, `mountaineering.html`, `projects.html`, `portfolio.html`, `now.html`, `tags.html`
  - `making/index.html` (the redirect stub) or `making.html` — whichever shape the current build produces
- Any missing → FAIL.

### 4. Redirect stub still redirects
- The built `/making` page should contain a `<meta http-equiv="refresh"` pointing at `/projects` (or equivalent). FAIL if the file exists but doesn't redirect.

### 5. No category-leak directories in build output
- After the build, check `_site/` for any directory whose name ends in `,`. This double-confirms the static `categories:` check from `_backend/bin/lint` — if the script passed but a comma-dir appears in `_site/`, the rule has drifted.
- FAIL with the directory list.

### 6. Drafts not accidentally in `_posts/`
- Anything in `_posts/` with `published: false` is fine (intentional hide).
- A file in `_posts/` whose body is mostly placeholder (`test test test`, lorem-ipsum) or which has no body at all is FAIL — flag for review.

## Report format

```
## /test_local — <today's date>

### Static (bin/lint)
PASS — static checks
  — or —
FAIL — static checks
  <verbatim bin/lint output>

### Build
PASS — jekyll build (took Xs, generated N files)
  — or —
FAIL — jekyll build: <error excerpt, with file:line if Jekyll gave one>

### Build-output checks
PASS — expected pages built
PASS — /making redirect stub intact
PASS — no category-leak directories in _site/
PASS — no placeholder posts

### Verdict
SAFE TO COMMIT
  — or —
DO NOT COMMIT — N FAILs above. Fix or accept knowingly.
```

Keep it scannable. One line per check unless there are findings to enumerate underneath.

## Style notes

- Be literal. Cite file paths. The user reads this fast and decides whether to commit.
- Don't editorialize on whether a FAIL "really matters" — the user decides.
- If `_backend/bin/lint` itself can't run (missing, not executable), say so and mark the static layer `SKIP — <reason>`. Don't silently skip and pretend the static checks passed.
- If a check itself can't run (e.g., `bundle` isn't installed), say `SKIP — <reason>`. Don't pretend it passed.
- If everything passes, say so plainly. No padding.

## When to add a check here vs. in `_backend/bin/lint`

- **Doesn't need the build, fully deterministic** → `_backend/bin/lint`. (Filenames, front matter, regex on source files, image-ref resolution, tracked-file checks.)
- **Needs the Jekyll build, or needs human-shaped judgment** → here. (Build output structure, redirect verification, placeholder bodies, expected-pages-exist.)

If you find yourself implementing a static check here, stop and add it to `_backend/bin/lint` instead.
