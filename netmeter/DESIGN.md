# netmeter design: the robustness wave

Technical design for the six PRD items (`PRD.md`, 2026-08-24). Companion reading: `README.md` for user-facing behavior and the gotchas list, which is where several of these designs' constraints were learned the hard way.

## Architecture recap (what the designs build on)

Two halves, one file each:

- **Engine** (`netmeter`, Python): CLI plus the sampling daemon. `run_daemon` spawns `nettop` under a pty and consumes per-interval delta blocks; each block drives `handle_block`, which is the tick: accumulate daily totals and the per-minute `bucket`, count tether bytes from `netstat -ib`, run `profile_check` (network stint machinery), publish `now.json`, enforce low data and Pause All. A separate `throttle_worker` thread holds the duty cycle. All state is JSON under `~/.netmeter/`, written through `save_json` (pid-scoped temp + rename) and `locked` (flock) for read-modify-write files.
- **Bar** (`netmeter-bar.swift`): NSStatusItem + menu. `update()` fires every 2s and reads `now.json`; `menuNeedsUpdate` rebuilds the menu on open; in-menu mutation happens only by toggling `isHidden` on prebuilt items (the fixed-slot rule). All writes go through the CLI via `runNetmeter` on a serial queue.

State files touched by this wave:

| file | shape | writer |
|---|---|---|
| `now.json` | one object per tick, `ts` is the staleness signal | daemon |
| `tether.json` | `{period_start, in, out, notified_pct}` | daemon |
| `paused.json` | `{app: {reason, pids, at}}`, reasons `manual/lowdata/cap/all` | engine (locked) |
| `netmeter.log` | plain text, both halves append, rotates at 512 KB | engine + bar |
| `recent.jsonl` | one line per closed minute, `{m, a:{app:[in,out]}}`, last 800 | daemon |
| `profile.json` | current network stint | daemon |
| `networks.json` | network memory | daemon |

## 1. Test harness

**Status:** landed 2026-08-28 as `netmeter/tests/test_pause.py` (38 checks) plus `bin/check`, following this design; a `test_stint.py` for the network-stint machinery is still to come.

**Shape:** `netmeter/tests/test_stint.py`, plain script, no pytest. The pattern proven in-session:

```python
os.environ["HOME"] = tempfile.mkdtemp(...)   # BEFORE import: STATE_DIR binds at import
loader = importlib.machinery.SourceFileLoader("nm", "<repo>/netmeter")
# exec_module, then: nm.notify = lambda t: NOTES.append(t)
```

- Path resolution: derive the engine path from `__file__` (`os.path.dirname(...) + "/../netmeter"`), not a hardcoded absolute path, so the harness survives a clone.
- A `tick(mac, ip=None)` helper wraps `profile_check` + config reload, mirroring the daemon's call site.
- Safety rules, stated in the header comment: sandbox `HOME` only, `notify` always stubbed, app lists empty or nonexistent names so `signal_app` finds no pids. The harness must be safe to run on the live machine while the real daemon runs.
- `check(label, cond)` prints `ok:`/`FAIL:` and exits 1 on first failure; final line prints the count. Same style the memory wave used (24 checks, one real bug caught).
- Coverage floor is the list in PRD item 1, plus one regression test per bug this wave finds.
- `bin/check`: `python3 -m py_compile netmeter && swiftc -typecheck netmeter-bar.swift && python3 tests/test_stint.py`. Run before every `./install.sh`.

**Why not pytest:** one dependency-free file matches the tool's one-file philosophy, and `python3 tests/test_stint.py` works on a bare macOS.

## 2. Stale-daemon watchdog (bar)

**Where:** `AppDelegate.update()`, which already computes staleness (the 30s check that degrades the title). Extend, do not duplicate.

**State:** two vars on the delegate:

```swift
var staleNotified = false      // one notification per stale episode
var warnItem: NSMenuItem?      // always-present, isHidden-toggled (fixed-slot rule)
```

**Logic in `update()`:** compute `age = now - ts` once.

- `age > 60` and `!staleNotified`: post the notification, set `staleNotified = true`.
- `age <= 30`: `staleNotified = false` (recovery re-arms; silent).
- Title: keep the existing `⇅ …` degradation; additionally prefix `⚠` so the stale state is visible without opening the menu.

**Notification transport:** `osascript -e 'display notification ...'` via `Process`, same mechanism the engine's `notify` uses. Not `UNUserNotificationCenter`: the bar is a bare Mach-O without a bundle identifier, and the framework requires one.

**Message:** static part plus consequence. Read config once at notification time: if `lowdata` or `pause_all` is on, append which mode is configured but unenforced. Example: "netmeter daemon stopped reporting 1m ago. Low Data is set but nothing is enforcing it."

**Menu warning row:** one prebuilt item near the modes row, title like `⚠ daemon not reporting; modes are not enforced`, colored `systemOrange` via `attributedTitle`, hidden unless stale. Toggled in `refreshModeUI` (menu open) and `update()` (menu closed but tracking next open).

**Edge:** the bar starting before the daemon's first tick (login) reads a stale or missing `now.json`. Grace: suppress the notification for the first 90s of bar uptime; the title degradation still shows.

**Test:** manual acceptance per PRD (SIGSTOP the daemon). The Swift side has no harness; keep the logic small enough to review.

## 3. Wake-up race (daemon)

**Detection:** `handle_block` closure gains a first step. `state["last_ts"]` records each tick's `now_ts`; a new tick with `now_ts - last_ts > 30` is a gap (sleep, or a wedged nettop that recovered). The sample interval is ~5s, so 30s is six missed ticks: unambiguous.

**On gap, in order, before normal tick work:**

1. **Invalidate the tether snapshot:** `state["wifi_prev"] = wifi_bytes(iface)` without accumulating. The cumulative interface counters kept moving while we slept or stalled, possibly on a different network; attributing that delta to whatever network we wake on would corrupt the cap count. This is the sharpest edge in the item: bytes must be dropped, not guessed.
2. **Run the network check immediately:** fresh `gateway_mac` read, then `profile_check`. This is the same call the tick makes anyway; the point is running it before any enforcement decisions this tick, so memory and profiles for the woken-up network apply first, not one tick later.
3. **Reset burst bookkeeping:** `state["bucket"] = {}`, `state["bucket_min"] = current minute`, `state["capped"] = set()`, without appending the stale bucket to `recent.jsonl` (its minute is long past; appending would write a lie into history).

**What this does not do:** subscribe to network-change events. `route monitor` or SystemConfiguration is the stretch in the PRD; the gap detector covers the sleep case, and a mid-session network hop is already caught within one tick by the existing per-tick MAC read.

**Test:** harness-simulatable: the gap logic lives in a small function `wake_check(state, now_ts, cfg)` extracted from `handle_block` so the harness can drive it with synthetic timestamps and assert the three effects.

## 4. Burst cap armed on tether (daemon)

**Status:** landed 2026-08-28, as designed.

**Where:** the tick's enforcement block. Today:

```python
if cfg["lowdata"]:
    ... burst_cap_check(...)
```

**Change:** compute `cap_armed = cfg.get("burst_cap_mb") and (cfg["lowdata"] or tether_on)` and hoist the cap check out of the lowdata block. `tether_on` is already computed earlier in the same tick.

**Signature:** `burst_cap_check(bucket, cap_mb, already)` is unchanged; the *caller* formats the notification, so the "which condition armed it" wording lands in the tick loop: `via = "low data" if cfg["lowdata"] else cfg.get("tether_name") or "metered network"`.

**Freeze reason stays `cap`**, so `resume`, `resume-all`, and the bar's frozen-row treatment need no changes.

**Test:** direct harness check on the hoisted condition plus `burst_cap_check` with a synthetic bucket (it takes plain dicts; no daemon needed).

## 5. Sustained-drain detection (daemon)

**Status:** landed 2026-08-28, as designed, default off.

**Config:** `drain_cap_mb: 0` (off) and `drain_window_min: 5` in `DEFAULT_CONFIG`. Armed under the same `cap_armed` condition as item 4 (minus the burst knob: `drain_cap_mb` arms itself).

**Data source:** completed minutes already land in `recent.jsonl`; `read_recent(minutes)` already sums a window of it. Reuse both rather than keeping a parallel deque: the file is capped at 800 lines, and reading it once per minute is nothing. In-memory state would also die with a daemon restart; the file survives one, which makes the window honest across the exact failure this wave cares about.

**Where:** the minute-rollover branch in `handle_block` (where `append_recent` fires). After closing a minute:

```python
totals = read_recent(cfg["drain_window_min"])   # completed minutes only
for app over cap: freeze unless NEVER_FREEZE / already frozen / already notified
```

- Freeze action identical to the burst cap: `signal_app(SIGSTOP)` + `set_paused(name, True, "cap")`.
- Suppression: `state["drained"]`, app -> minute it was frozen; skip until `drain_window_min` minutes pass or the app is no longer paused (user resumed it deliberately: do not re-freeze inside the same window, that is what `resume` means; the *next* window may catch it again).
- Notification names the mechanism and the window: "Froze X: 210 MB over 5 min (drain cap 150). Resume with: netmeter resume X".

**Bar:** extend the Low Data status line parts list (`refreshModeUI`) with `"freezing anything over N MB / Mmin"` when `drain_cap_mb` is set, same dim-wrapped style.

**Interaction with the burst cap:** independent checks, same reason, same exemptions. A burst trips the minute cap; a bleed trips the window cap; both can be on.

**Test:** harness writes synthetic `recent.jsonl` lines (the format is one JSON object per line) and drives the check function directly: steady cap-minus-epsilon per minute trips drain and not burst.

## 6. Per-network usage attribution (daemon + CLI)

**Storage:** inside `tether.json`, a new key `apps: {app: [in, out]}`. It already resets naturally: `load_tether` rebuilds the dict on period rollover, and `netmeter tether GB` reseeding keeps `apps` (the seed corrects the header number, not the shape of the breakdown; document this in the command output).

**Accumulation:** in the tick, where tether bytes are counted (`if tether_on and wb and prev:`), also fold the tick's per-app deltas into `tether["apps"]`. The per-app deltas for the tick are exactly what `handle_block` just parsed from the nettop block; pass them through. `tether.json` is already saved on those ticks; no new write.

**Size guard:** dozens of apps per period at two ints each; no pruning needed. Names go through `friendly()` like everything else.

**CLI:** `netmeter tether` prints the existing header, then a top-12 breakdown reusing the `show_recent` table style (name, total, share, hash bar). Footer caveat, one line: "per-app numbers are payload bytes and undercount the header's interface count by 10-15%".

**The undercount, stated precisely:** the header (`in`/`out`) counts interface bytes including headers and retransmits; `apps` sums nettop payload deltas and misses short-lived processes. The two will not reconcile and are not meant to: the header is the bill, the table is the blame.

**Test:** harness check on the accumulation helper with synthetic tick deltas and `tether_on` true/false; rollover check via `load_tether` with a backdated `period_start`.

## Rollout

Each item: implement, `bin/check`, deploy via `./install.sh`, verify live (daemon ticking, one real-world trigger where feasible), then commit with the harness additions in the same commit. Items 2 is bar-only and needs no daemon restart beyond what install.sh does; items 3-6 change tick behavior and warrant a day of watching `daemon.log` and `notify` traffic before the next item lands.

## Risks

- **Signal storms:** items 4 and 5 add freeze paths. Both route through the existing `set_paused` bookkeeping and `NEVER_FREEZE`, and both are one-shot per window per app. The throttle worker already refuses to duty-cycle a paused app, so interactions are covered by existing rules.
- **False wake detection:** a wedged-then-recovered nettop looks like sleep. The three gap effects (drop tether delta, re-check network, reset bucket) are all safe under that misread; the cost is one discarded minute of history.
- **`recent.jsonl` torn lines:** `read_recent` already skips unparseable lines, so the drain check inherits that tolerance.
