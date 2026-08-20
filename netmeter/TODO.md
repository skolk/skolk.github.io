# netmeter TODO

Working list for the netmeter project. Sean owns prioritization. Assessment date: 2026-08-20.

## Where the project is

- Committed history ends at `2626e25` (menu rework: solo chevron, Reset placement, Open netmeter at the foot). The project page caught up with the chart in `0329f74`.
- The working tree holds one large uncommitted feature wave, deployed to `~/bin` since Aug 19 and running: duty-cycle throttling (`netmeter throttle`), `lowdata_throttle` + `throttle_pct`, the `burst_cap_mb` backstop, the `NEVER_FREEZE` / `SOLO_PROTECT` split, FRIENDLY-label reverse resolution (so signals reach the Claude Code CLI), daemon-death safety (atexit + signal handlers + unfreeze on start and restart), `throttled.json` state, and the reworked Low Data status line in the bar. README documents all of it.
- Gap: the wave exists on disk and on the machine but not in git, and not on the project page.

## Queued

- [ ] **Commit the throttle wave.** `netmeter`, `netmeter-bar.swift`, `README.md` are one coherent uncommitted feature, live on the machine since Aug 19. Commit before it grows a second wave on top.
- [ ] **Preferences fields for the new settings.** `lowdata_throttle`, `throttle_pct`, `burst_cap_mb`, and the network profiles are config.json-only; decide whether they earn spots in the Preferences window.

## Done

- 2026-08-20: "Always Low Data on this network" row in the bar's modes block. Unpinned it asks for a name (NSAlert; SSIDs are location-gated so Sean names the network), runs `lowdata on` then `profile-here NAME` so the pinned snapshot always carries the mode ON; pinned it shows a checkmark plus the name, appends "off until rejoin" during a manual override, and clicking unpins via `profile rm`. Daemon publishes `net_mac` in now.json; the bar looks the pin up in config.json so the row flips instantly. Verified: py_compile, swiftc -typecheck, sandboxed-HOME daemon publishes the MAC, and the full lowdata-on -> profile-here -> rm chain passes in a sandbox. Deployed 12:2x via `./install.sh`; live daemon confirmed publishing `net_mac`.
- 2026-08-20: deployed via `./install.sh` (Sean, 12:06). Daemon and bar restarted from the repo copies; `~/bin/netmeter` verified byte-identical to the repo.
- 2026-08-20: `throttle_period` fallback in `throttle_worker` now agrees with `DEFAULT_CONFIG` (`4.0`). Cosmetic in practice, `load_config` always merges the default, so the fallback only fired on an explicit falsy config value.
- 2026-08-20: Low Data summary line no longer stretches the menu. It wraps at the " · " separators onto lines capped at 52 characters, continuation lines hanging under the text, dim styling preserved (`netmeter-bar.swift`, needs deploy).
- 2026-08-20: per-network default settings. `netmeter profile-here NAME` pins the current gateway MAC to the current lowdata-family settings; the daemon applies the profile on join and restores on leave, a manual override stands until leave-and-rejoin, stint memory in `~/.netmeter/profile.json` survives daemon restarts. `netmeter profile` lists, `profile rm NAME` forgets. 15/15 sandboxed checks pass (needs deploy).
- 2026-08-20: project page caught up with the throttle wave: throttle and three-control Low Data bullets, loopback gotcha, and "The soft brake and the hard stop" section with the duty-cycle leak numbers.
- 2026-08-20: `__pycache__/` added to `netmeter/.gitignore` (was showing untracked).
