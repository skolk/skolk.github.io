# netmeter PRD: the robustness wave

**Status: complete, 2026-08-28.** All six shipped and are deployed. 1 (harness), 4 (cap arming) and 5 (drain) landed first; 2 (watchdog), 3 (wake race) and 6 (attribution) closed it out. The harness stands at 153 checks. Two things the wave did not predict were found by building it and are fixed alongside: the orphan sweep fighting job control, and `install.sh` racing `launchctl bootout` into leaving nothing running. Both are in TODO.md and the README.

Requirements doc for the six gaps identified in the 2026-08-24 assessment, after the network-memory wave shipped. Sean owns priority; suggested order is the numbering below. Each item stands alone and can ship alone.

## Why this wave

netmeter's mission is working on tethered or metered connections without surprise data burn. The monitoring, the controls (freeze, throttle, burst cap, Pause All, low data), and the automation (profiles, network memory, tether counter) all exist and work. What remains is a cluster of failure modes where the tool silently stops protecting you, and two places where it measures the wrong window. This wave is about trust: the tool should fail loudly, engage before the damage, and answer the question the bill asks.

## Current state (baseline)

- Committed through `7bdedfa` (network memory + app-list fold). Deployed and live.
- All enforcement lives in the daemon's tick loop (`run_daemon`, ~5s interval) and the throttle worker thread. The bar is display plus command dispatch; it enforces nothing.
- The daemon publishes `now.json` every tick; the bar treats a timestamp older than 30s as stale and degrades its readout to `⇅ …` without comment.
- `burst_cap_check` reads the current minute's bucket, only while `lowdata` is on.
- Verification is ad-hoc: sandboxed-HOME test scripts have been written in session scratchpads (24 checks for the memory wave) and discarded after use.

## Requirements

### 1. Committed test harness

**Problem:** the stint machinery (profiles, memory, restore-on-leave, mode sync) is the most intricate logic in the tool, and its only tests have been session-scratchpad scripts that no longer exist. The memory wave's mode-leak bug (a solo left on at the previous network sailing through a profiled join, back when solo existed) was caught only because such a script existed that day.

**Requirement:** a `tests/` directory in `netmeter/` holding the sandboxed-HOME checks as a committed, runnable file.

- `tests/test_stint.py` (or similar): loads the engine via `importlib` with `HOME` pointed at a temp dir, stubs `notify`, and covers at minimum: bare-stint join, memory snapshot on change, parting snapshot on leave, memory apply on rejoin (lowdata and Pause All), profile precedence with memory merge, mode-leak prevention, `remember_networks off`, `networks rm`.
- Runs with plain `python3 tests/test_stint.py`, no pytest dependency, exits non-zero on failure.
- A one-line `tests/README.md` or header comment stating the sandbox convention: never touches the real `~/.netmeter`, never signals real processes (empty app lists only).
- Stretch: a `bin/check` wrapper that runs `py_compile`, `swiftc -typecheck`, and the test file, so "did I break it" is one command before every deploy.

**Acceptance:** a fresh clone can run the checks and get a pass/fail answer without any session context.

### 2. Stale-daemon watchdog in the bar

**Problem:** every control is enforced by the daemon. launchd's KeepAlive restarts a crashed daemon, but a wedged one (hung `nettop` under `script`, a stuck lock) enforces nothing indefinitely, and the only symptom is the bar quietly showing `⇅ …`. The user believes Low Data is protecting them; nothing is.

**Requirement:** the bar notices a stale daemon and says so once.

- The bar's 2s `update()` timer already reads `now.json`. When the timestamp goes older than 60s, post one user notification ("netmeter daemon has stopped reporting; nothing is being enforced") and mark the menu (e.g. the header or modes row) with a visible warning state.
- Notify once per stale episode, not per tick. Recovery (fresh timestamp) clears the warning silently and re-arms the notification.
- While stale and Low Data or Pause All is configured on, the warning must name the consequence ("Low Data is set but not enforced").
- No new processes, no watchdog daemon: this is bar-side observation only.

**Acceptance:** `launchctl kill SIGKILL` the daemon with KeepAlive temporarily off (or SIGSTOP it), and within ~90s a notification fires and the menu shows the warning; resume it and the warning clears without a duplicate notification.

### 3. Wake-up race: engage before the burst

**Problem:** network awareness rides the ~5s tick. After sleep, the first ticks land while sync clients are already bursting: the profile/memory for the network has not applied, and `burst_cap_check` has no meaningful minute bucket yet. The most dangerous seconds have the least protection.

**Requirement:** the daemon detects that it slept and reacts immediately.

- Track the wall-clock gap between ticks. A gap well beyond the sample interval (e.g. > 30s) means the machine slept or the daemon stalled.
- On detecting a gap: run `profile_check` immediately with a fresh MAC read, before the normal tick work, so network memory and profiles apply at wake rather than a tick later.
- On detecting a gap, reset the burst bucket bookkeeping cleanly (stale `bucket_min` from before sleep must not mask the first minute after wake).
- Stretch, only if the simple version proves insufficient: subscribe to network-change events (`route monitor` subprocess or SystemConfiguration via a small helper) instead of polling. Not required for acceptance.

**Acceptance:** simulatable in the test harness by manufacturing a tick-time jump: assert `profile_check` runs with the new MAC on the first post-gap tick and the bucket state is fresh.

### 4. Burst cap armed on metered networks

**Problem:** `burst_cap_mb` only runs while `lowdata` is on. On a linked tether network with Low Data off, a bulk download has no backstop, even though the daemon computes `tether_on` on the same tick and knows the connection is metered.

**Requirement:** the burst cap protects every metered minute.

- The cap check runs when `lowdata` is on (current behavior) OR when `tether_on` is true, provided `burst_cap_mb` > 0.
- The freeze notification should say which condition armed it ("on A_Pixi" vs "low data").
- `NEVER_FREEZE` still applies unconditionally.
- Config stays one knob (`burst_cap_mb`); no separate tether cap value unless real use demands it later.

**Acceptance:** test-harness check: with `lowdata` off, `tether_on` true, and a bucket over the cap, the app is frozen with reason `cap`; with both off, it is not.

### 5. Sustained-drain detection

**Problem:** the burst cap reads the current minute only, and the bucket resets on the minute. A steady 40 MB/min under a 50 MB cap never trips: 2.4 GB/hour of invisible drain. The cap catches bursts; nothing catches bleeds.

**Requirement:** a rolling-window check that catches sustained per-app drain.

- New config keys, defaults off: `drain_cap_mb` and `drain_window_min` (e.g. 150 MB over 5 minutes).
- Source the window from the same per-minute history that feeds `recent.jsonl` (the accumulation already exists; do not build a second counter).
- Armed under the same conditions as the burst cap (requirement 4): low data on, or tether on.
- On breach: same action and bookkeeping as the burst cap (freeze, reason `cap`, one notification per app per window, `NEVER_FREEZE` exempt).
- Bar: no new UI required beyond the existing frozen-row treatment; the Low Data status line should mention the drain cap when configured, in the same style as the burst-cap line.

**Acceptance:** test-harness check with synthetic minute buckets: an app moving cap-minus-epsilon per minute for `drain_window_min` minutes gets frozen by the drain check and would not have been frozen by the burst cap alone.

### 6. Per-network usage attribution

**Problem:** the tool can answer "who used data today" but not "who spent my 50 GB this period." Daily files do not record which network the bytes moved on, so when the bill comes, the per-app answer does not exist.

**Requirement:** enough tagging to answer "who spent the tether data."

- Minimal viable shape: while `tether_on`, accumulate a parallel per-app tally, e.g. `tether_apps` inside `tether.json` or a `tether-YYYY-MM.json`, reset on period rollover like the existing tether counter.
- `netmeter tether` gains a per-app breakdown section (top N by total, same table style as `print_table`).
- Known honest caveat, documented in the output or README: per-app numbers are nettop payload bytes and will undercount versus the interface-level cap counter by the usual 10-15%; the table answers "who", the header answers "how much".
- No historical backfill: attribution starts the day it ships.
- Stretch: a "this network" filter using network memory's MACs for non-tether networks. Not required.

**Acceptance:** on a linked tether network, per-app numbers accumulate; off it, they do not; `netmeter tether` prints the breakdown; period rollover zeroes it with the rest.

## Non-goals

- **Per-app network blocking**: requires an Apple-signed Network Extension. Freezing, throttling, and caps on the process remain the mechanism. This stays out of scope permanently.
- **Auto-managing the Low Data lists**: which apps get frozen or throttled stays a deliberate user choice; the caps are the generic backstop.
- **Preferences UI for profiles, network memory, or the new caps**: the CLI is the right home. The only Preferences candidate remains a `remember_networks` checkbox plus the existing throttle numbers (tracked separately in TODO.md, not part of this wave).
- **A second watchdog process**: requirement 2 is bar-side observation of `now.json`, nothing more.
- **Windows/Linux, non-wifi interfaces**: `wifi_if` stays the single watched interface.

## Constraints

- One file per half stays the architecture: the Python engine and the Swift bar, no new daemons, no new languages.
- Everything the daemon writes stays under `~/.netmeter/` with the existing `save_json`/`locked` discipline (pid-scoped temp names, flock on read-modify-write).
- No em-dashes in any text this wave touches, per site convention.
- Every requirement that changes engine logic lands with a test-harness check in the same commit (which is why requirement 1 ships first).

## Sequencing

1 (harness) unblocks honest acceptance for everything else and ships first. 2 (watchdog) and 3 (wake race) are the trust items. 4 (cap arming) is a few lines once 1 exists. 5 (drain) builds on 4's arming condition. 6 (attribution) is independent and can ship any time.
