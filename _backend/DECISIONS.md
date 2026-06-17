# Decisions

Architectural and operational decision records for `skolk.github.io`. Each ADR captures a choice that affects how this repo is maintained.

Format (ADR-style, lightweight):

- **ID and title**: ADR-NNN with a short name.
- **Date**: when decided.
- **Status**: Accepted / Superseded / Rejected.
- **Context**: what situation forced the choice.
- **Decision**: what was chosen.
- **Consequences**: what this implies, including downsides.
- **Alternatives considered**: brief list.

---

## ADR-001: Adopt a partial stabilization template

- **Date**: 2026-06-16
- **Status**: Accepted

### Context

The stabilization template Sean uses for software projects assumes a codebase with tests, contracts, an incident history, sprints, and active stakeholders. `skolk.github.io` is a personal Jekyll site. Most of those concepts do not fit cleanly. Adopting the full template would create empty scaffolding that drifts out of date and lowers the signal of the files that DO matter.

### Decision

Adopt only the parts of the template that map to this repo's actual maintenance burden:

- `RISKS.md`: yes. Static sites still rot. Worth tracking.
- `NEXT_STEPS.md`: yes. The audit produced a queue.
- `DECISIONS.md`: yes (this file). Future Claude needs to know why scaffolding is missing.
- `DEFINITION_OF_DONE.md`: yes, adapted to "what shipping a change to this site looks like."
- `.claude/agents/`: yes, with `context-tracker`, `risk-auditor`, and `risk-test-runner`. These three apply to any repo with a `RISKS.md`.

Skip the rest:

- `PRD.md`: skipped. A personal site has no product requirements document. The pages are the product.
- `SPRINTS.md`: skipped. There is no sprint cadence. `NEXT_STEPS.md` is the backlog.
- `RUNBOOK.md`: skipped. GitHub Pages auto-builds on push. There is nothing to run.
- `INCIDENTS.md`: skipped. No production system, no on-call. If the site breaks, the user notices when they visit; there is no SLA.
- `GLOSSARY.md`: skipped. The site's vocabulary is plain English.
- `STAKEHOLDERS.md`: skipped. Sean is the writer, owner, and (mostly) audience.
- `DEMO_SCRIPT.md`: skipped. Nothing to demo; the URL is the demo.
- `tests/`: skipped. The Jekyll build IS the test. If `bundle exec jekyll serve` succeeds and the pages render, that's the bar. Contract tests do not apply.
- `.claude/agents/harness-generator`: skipped. Nothing to generate harnesses for.
- `.claude/agents/io-monitor`: skipped. No runtime, no I/O to monitor.

### Consequences

- Future stabilization cycles on this repo will use a shorter checklist.
- Anyone arriving from a software project will not be confused by missing files; they'll find this ADR explaining why.
- If the site later sprouts a tool, calculator, or app (e.g., the planning tools mentioned in `projects.md`), some of the skipped files may become relevant. Revisit then.

### Alternatives considered

- **Full template**: rejected. Most files would be empty placeholders.
- **No template at all**: rejected. `RISKS.md` and `NEXT_STEPS.md` carry real maintenance value even for a personal site.
- **External tool (Notion, Linear)**: rejected. Keeping the audit register inside the repo means Claude can update it during the same stabilization cycle that finds the issues.

---

## ADR-002: Lock-file recovery via rename, not delete

- **Date**: 2026-06-16
- **Status**: Accepted

### Context

The previous session's `commit-tree`-based commit left `.git/index.lock`, `.git/HEAD.lock`, and `.git/refs/heads/master.lock` behind. The sandbox where Claude runs cannot delete files in the mounted folder (`rm` returns `Operation not permitted`). Without removing the locks, `git status` was honest but every subsequent write operation logged warnings.

### Decision

Use `mv .git/X.lock .git/X.lock.bak` to rename the locks out of the way. The mount allows rename even when it forbids delete. Once renamed, Git no longer treats them as live locks.

### Consequences

- The `.bak` files remain in `.git/` (and in `.git/refs/heads/`) as inert artifacts. They are not valid refs and Git ignores them.
- Future sessions hitting the same lock state can use the same recovery path without escalation.
- If the lock files ever need to be truly deleted, Sean will need to do it from a normal terminal.

### Alternatives considered

- **`rm -f`**: rejected. Returns `Operation not permitted` in the sandbox mount.
- **`chmod 000` + creative renaming**: rejected. The original brief explicitly disallowed shenanigans.
- **Surface and wait for Sean**: viable fallback but renames worked, so unnecessary.
- **Approve the `allow_cowork_file_delete` tool**: not available in this session; tool permission denied.

---

## ADR-003: Guard the build with a timeout wrapper; keep the repo in iCloud

- **Date**: 2026-06-17
- **Status**: Accepted

### Context

The repo lives under `~/Documents`, which macOS syncs to iCloud. iCloud evicts vendored gem files (`vendor/bundle/`) to dataless placeholders; the first read blocks in the kernel at 0% CPU while macOS re-downloads them, so a bare `bundle exec jekyll build` can hang indefinitely with no output (diagnosed 2026-06-17, see RISKS.md R-010). The hang is indistinguishable at a glance from a slow build, and the natural workaround, push without building, is exactly how build-breakers reached origin (R-003). Two clean fixes exist: relocate the repo out of `~/Documents` (kills the eviction), or guard the build so a stall can't hang forever.

### Decision

Do both layers, but in priority order:

1. Add `_backend/bin/build`: runs `jekyll build` under a portable hard timeout (default 180s, no coreutils dependency). On timeout it exits 124 with a remedy message instead of wedging the terminal. `build-push.sh` routes through it and pushes only on a green build; `.githooks/pre-commit` runs it after lint and treats exit 124 (iCloud stall) as warn-not-block while a real build error blocks the commit.
2. Keep the repo in `~/Documents` for now. Sean chose the watchdog over relocation (2026-06-17). Relocation remains the recommended permanent fix and is queued in NEXT_STEPS.

### Consequences

- A build can no longer silently hang; the worst case is a fast, explained failure.
- The root cause (eviction) persists: cold-file first-reads stay slow, and `bin/build` can hit its 180s cap on a genuinely-warm-needed build if vendor/ is heavily evicted. The timeout is a guard, not a cure.
- If relocation later happens (NEXT_STEPS), `bin/build`'s timeout becomes belt-and-suspenders rather than load-bearing. Keep it; it's cheap.

### Alternatives considered

- **Relocate the repo out of `~/Documents` now**: the true fix; deferred by Sean's choice because it changes the local path and Cursor workspace. Still recommended.
- **Disable iCloud Desktop & Documents sync**: kills eviction globally but affects the whole machine, out of scope for a repo-level decision.
- **`brctl download` pre-pull**: attempted 2026-06-17; asynchronous, throttled, and "Access denied" from the sandboxed shell. Unreliable as a standing mitigation.
- **No guard, just discipline ("always build before push")**: rejected. That discipline already failed twice (`7df2a24`, `f52248e`).

### Update 2026-06-17 (same day)

The "keep the repo in `~/Documents`" half of this decision was softened the same day after the eviction kept biting (a 286s build). Rather than relocate the whole repo, we relocated only the evictable part: Bundler now installs gems outside iCloud (`.bundle/config` -> `BUNDLE_PATH: ~/.bundle/skolk-github-io`) and the in-repo `vendor/` was deleted. This removes the build's hot evictable path while leaving the repo in place, so it's the surgical form of the "relocate" alternative, not a reversal. The `bin/build` timeout from layer 1 stays as a backstop (the fix is gitignored/laptop-local, and a stray cold image could still evict). See RISKS.md R-010, now Mitigated.

---

## How this file is used

- New decisions get appended with the next ADR number.
- When a decision is reversed, set the old ADR's status to `Superseded by ADR-NNN` and add a new ADR explaining the reversal.
- Keep the language tight. ADRs are for "why," not "how."
