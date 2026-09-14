# Project notes for Claude

Personal site for Sean Kolk. Jekyll-based, deployed via GitHub Pages from the `master` branch of `skolk.github.io`.

**End every work update with the link to the work.** When a message reports work produced or changed, close it with a direct pointer as the last line: the full file path for drafts and repo files, or the full live URL (`https://skolk.github.io/...`, `https://islandlab.dev/...`) once published.

**Sean reviews everything rendered, not as raw markdown.** Whenever a draft, post, or page is produced or updated, make it viewable on the locally hosted site and give the `http://localhost:4000/...` URL (or the live URL if already published). Start the preview with `bundle exec jekyll serve --drafts --detach` (detached survives the session; plain backgrounded `serve` gets reaped). Detached mode does not watch for changes, so after any edit run `bundle exec jekyll build --drafts` to refresh what the server shows. Stop it with `pkill -f "jekyll serve"`.

## Common commands
- `bundle exec jekyll serve --drafts`: local dev at http://localhost:4000 including `_drafts/`
- `./_backend/bin/build`: guarded `jekyll build` with a hard timeout. Prefer over a bare `jekyll build`, it can't hang silently (see iCloud gotcha below).
- `./_backend/build-push.sh`: build (via `bin/build`) + commit + push helper. Only pushes if the build succeeds.
- `./_backend/bin/lint`: fast static checks (filenames, front matter, comma-categories, broken images, permalinks, tracked artifacts). No build required. Exits non-zero on failure.
- `./_backend/bin/lint --staged`: same, plus refuse if `_site/` / `.DS_Store` / vendor cruft is staged.

## Pre-commit hook
Tracked at `.githooks/pre-commit`. Opt in once per clone:
```
git config core.hooksPath .githooks
```
Bypass for a single commit with `SKIP_LINT=1 git commit ...`.

## Front-end / back-end divide

Everything Jekyll *publishes* lives in the front-end. Everything that's for thinking, planning, archiving, or repo tooling lives in the back-end. Jekyll skips any top-level directory starting with `_` that isn't a known collection, so `_backend/` and `_drafts/` are auto-excluded from builds.

### Front-end (deployed)
- `_posts/`: blog posts. Filename: `YYYY-MM-DD-Title-With-Dashes.md`. No spaces, no missing dashes.
- `_layouts/`, `_includes/`, `_sass/`: Jekyll theme bits.
- `_portfolio/`: portfolio collection.
- `_pages/`: standalone pages and shells with explicit permalinks: `about`, `log`, `now`, `tags`, `sailing`, `mountaineering`, `projects`, `portfolio`, `updates`, `articles`, `trip-reports`, `recaps`, the `making` redirect stub, `404.html`, `feed.xml`. Opted into the build via `include: [_pages]` in `_config.yml`.
- `images/`, `css/`: static assets.
- Root: `index.html` (Jekyll entry).

### Back-end (not deployed)
- `_backend/`: **active** working material. Tracked in git. Contains:
  - `TODO.md`, `VISION.md`, `REFERENCE_SITES.md`, `CHANGELOG.md`: planning and history docs.
  - `bin/`: repo tooling (`lint` static-checks script).
  - `build-push.sh`: build + push helper.
  - `archive/`: **historical** reference material (currently `squarespace-2024/`, the original Squarespace export). Read-only by intent.
- `_drafts/`: posts in progress. Built only with `jekyll serve --drafts`. Move to `_posts/` with a `YYYY-MM-DD-` prefix when ready.

### Ignored / never committed (`.gitignore`)
- `_site/` (build output)
- `.jekyll-cache/`, `.jekyll-metadata`
- `vendor/bundle/`, `.bundle/`
- `.DS_Store`
- `.scratch/`: convention for laptop-only scratch space

## Conventions
- **Post filenames:** dashes between words, `.md` extension. No spaces.
- **Front matter:** every post needs `layout: post`, `title:`, `date:`, optional `categories:`, `short_description:`, and `type:`.
- **Post `type:`**: one of `update`, `trip-report`, `recap`, `project`, `article`. Drives which landing page surfaces the post. Orthogonal to `categories:` (which describes topic, e.g. sailing, climate).
  - `update`: short note, observation, work-in-progress. Lives on `/updates`.
  - `trip-report`: long-form account of an expedition, race, or trip. Lives on `/trip-reports`.
  - `recap`: monthly summary post. Lives on `/recaps` (grouped by year).
  - `project`: project-update post. Lives on `/projects` (under "Project Logs").
  - `article`: long-form essay. Lives on `/articles`.
  - `type:` is optional on existing posts (backfill is opportunistic). Untagged posts still appear on `/log`. `_backend/bin/lint` validates the value when present.
- **`/log`**: the firehose. Every post appears here regardless of `type:`.
- **Hidden posts:** add `published: false` to frontmatter rather than deleting.
- **Em-dashes:** do not use. The em-dash character (`—`, U+2014) is banned site-wide. Use a comma for mid-sentence pauses and asides. Use a colon for label-then-description bullets. Use a period to end a thought. This applies to all `_posts/`, `_pages/`, `_layouts/`, `_includes/`, root-level files, and any planning docs in `_backend/`. If a paste introduces an em-dash, replace it. The lint script may grow a check for this; for now, sweep by hand.
- **Label bullets:** for label-then-description list items, separate the label from its description with a colon, e.g. `- **Label**: description`. Applies to book and work attributions too: `- *Title*, Author` (comma, not em-dash).
- **Links:** when linking a named entity (person, org, institution, expedition, concept), prefer the entity's own official website, then Wikipedia, then a stable canonical page, in that order, whichever exists. Books are the exception: link to Goodreads search (`https://www.goodreads.com/search?q=Title+Author`). Avoid linking to ad-driven aggregators or paywalled pages when a primary source is available.
- **Images:** under `images/blog_posts/`, referenced from posts as `/images/blog_posts/<file>`.
- **Renames:** if a URL moves, leave a redirect stub at the old path (see `making.html` for the pattern). `jekyll-redirect-from` is not installed.
- **Changelog:** structural repo changes go in `CHANGELOG.md` (Keep-a-Changelog style). Update on renames, new sections, deletions.
- **`log.html`:** auto-renders all posts in reverse-chrono. It is NOT a changelog.

## Editorial pipeline (writing cadence)

Targets an article-a-week cadence at the 100r.co / craigmod.com bar (worth a stranger's time, personal but broadly useful). The machinery:

- `_backend/EDITORIAL_QUEUE.md`: the scored board (Ready · Want · Worth + Decay). One row per candidate (`idea` / `trip-report` / `edit` / `improvement`). Sean owns the `Want` column.
- `./_backend/bin/ondeck`: ranks the queue, prints this week's pick + decaying list + cadence (days since the last `_posts` commit vs a 7-day target).
- `_backend/IMAGE_GAPS.md`: posts missing a hero picture. `image_preview:` is dead metadata (renders nowhere), so a visible picture must be an inline `<img>` in the body (subject or location).
- `_backend/SKOLK_VOICE.md`: how Sean writes and what he does. Read before drafting in his voice. Most of his raw input is voice-to-text: clean the homophones/run-ons/missing punctuation, keep the rhythm.
- `_backend/WRITING_RULES.md`: the 36 rules for writing. Self-check drafts against it.
- `.claude/agents/editor.md` + `/editor`: the managing editor. What to write, good-vs-unfinished, the one gap before publishing, series map, intention harvest, and a critical-eye review of the whole site against the reference bar.
- `/morning`: the morning writing assignment. Pairs a trip report (material) with an idea (theme) into a walk-and-talk prompt; the voice-to-text transcript converts into a draft to review, edit, and add a picture to.

**Project-cycle integration:** when running `/project-cycle:run-project-cycle`, spawn the `editor` agent as an additional parallel agent (alongside sprint-tracker / prd-auditor / risk-auditor). It is the editorial + site-management lens: not just repo health, but whether the site is becoming worth reading for other people.

## Dispatch: who runs the work

The dispatcher and its sized workers come from the `project-cycle` plugin (v0.13.0, 2026-09-14), the same set Sean decided in `gdri` on 2026-09-09: the director stays in this session and thinks at the top of the range; the workers are small, named, and sized to a clock. Nothing is copied into `.claude/agents/` here, so a plugin refresh reaches this repo and nothing shadows it.

| Agent | Model, effort | What it is for |
|---|---|---|
| `project-cycle:dispatch` | opus, xhigh | Turns one request into N briefs, each under ten minutes, each with a contract. Writes nothing. |
| `project-cycle:scout` | haiku, low | Read-only lookup. Where a thing lives, what a name is bound to. |
| `project-cycle:hand` | sonnet, medium | One file, or one block, against a contract the brief supplies in full. |
| `project-cycle:builder` | opus, high | One build stream across more than one file, with judgment inside the brief. |
| `project-cycle:verifier` | sonnet, medium | Checks a finished piece against its own brief and the repo's checks. |

**For a request big enough to need more than one agent, call `dispatch` first.** It reads the request and the repo and hands back the split: the briefs, their agents, their contracts, their budgets and what depends on what. The director launches them in one message so they run at once, then integrates.

**Every brief carries a Deliverable and a Budget, or an EXCEPTION.** The plugin's `agent-brief-gate.sh` runs PreToolUse on the Agent tool and denies a building brief with no `Deliverable:` line, no `Budget:` line, or a budget over ten minutes. This repo's own agents (`editor`, `context-tracker`, `risk-auditor`, `risk-test-runner`, `personal-filter`) are read-only by their `tools:` line and pass through.

**The checks for this repo, which `dispatch` reads from `_backend/creative.json`:** `./_backend/bin/lint` (filenames, front matter, permalinks, image refs), `~/.claude/bin/prose-lint <file>` (em-dashes and banned phrasing in prose), `./_backend/bin/build` (where a page, layout, include or stylesheet changed), and the `copy-editor` agent where the piece is writing. Where none covers what a piece must be true of, the first brief in the split writes the check.

`effortLevel: "xhigh"` is not set for this repo; the user-level `high` stands until Sean raises it.

## Gotchas
- Don't commit `_site/`. It's gitignored now. If a tool re-stages it, drop it.
- The site has both a curated `/projects` page and per-post auto-listing on it. Categories drive which posts appear, so keep them topical (`making`, `fabrication`, etc.), not generic (`log`).
- `hack.css` dark mode adds literal markdown chrome (`##`, `===`) via pseudo-elements. `css/main.scss` overrides them under `body.dark-theme`.
- **Pages goes off when the repo goes private:** making `skolk.github.io` private disables GitHub Pages, and flipping it back to public does **not** re-enable it. The live site then 404s while the repo looks perfectly healthy. Check with `gh api repos/skolk/skolk.github.io --jq .has_pages`; re-enable with `gh api -X POST repos/skolk/skolk.github.io/pages -f 'source[branch]=master' -f 'source[path]=/'`. (Hit 2026-07-25.)
- **iCloud build hang (historical, resolved 2026-07-25 by moving the repo to `/Users/seankolk/Code/skolk.github.io`, outside iCloud):** gems live outside the repo via gitignored `.bundle/config` (`BUNDLE_PATH: /Users/seankolk/.bundle/skolk-github-io`); a fresh clone resets it, so re-run `bundle install` and verify `bundle show jekyll` resolves outside the repo. Backstop: `./_backend/bin/build` hard-times-out any stall (exit 124). A stale gitignored `vendor/` tree from the old setup is unused and safe to delete.
