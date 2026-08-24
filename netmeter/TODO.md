# netmeter TODO

Working list for the netmeter project. Sean owns prioritization. Assessment date: 2026-08-24.

## Where the project is

- Committed history ends at `557766d` (the throttle wave and per-network profiles, committed 2026-08-20).
- The working tree holds one new uncommitted feature wave (2026-08-24): network memory (`remember_networks`, `networks.json`, `netmeter networks`) and the top-8 fold in the bar's per-app list (`apps_open`, `display --apps-open`). Verified by 24 sandboxed-HOME checks plus `py_compile` and `swiftc -typecheck`. Deployed 2026-08-24 ~07:50 via `./install.sh` (first bootstrap hit launchd error 5, clean on retry); live daemon confirmed ticking and writing `networks.json`, current network remembered. Not yet committed, not yet on the project page.

## Queued

- [ ] **Commit the memory wave** before it grows a second wave on top.
- [ ] **Project page catch-up** for network memory and the app-list fold, once the wave is committed.
- [ ] **Preferences fields for the new settings.** `lowdata_throttle`, `throttle_pct`, `burst_cap_mb`, the network profiles, and now `remember_networks` are config.json-only; decide whether they earn spots in the Preferences window.

## Done

- 2026-08-24: network memory. Every network the daemon sees gets its mode settings (lowdata family plus solo on/off and app) written to `~/.netmeter/networks.json` as they change; rejoining a remembered network applies them through the existing stint machinery, so one rule still governs: a manual change while connected stands until leave, and is what gets remembered. Explicit profiles win for the keys they pin, memory fills the rest (found in testing: without the merge, a solo left on at the previous network leaked through a profiled join). `netmeter networks` lists / `rm` forgets / `on|off` toggles; `remember_networks` config key, default on. 24/24 sandboxed-HOME checks pass. Deployed 2026-08-24, live daemon writing networks.json.
- 2026-08-24: the bar's per-app list folds at 8. Rows past the top 8 build hidden behind a "▸ N more apps" row (a PickRow, so clicking flips them in place without closing the menu); state persists as `apps_open` via `display --apps-open`. Frozen rows past the fold stay visible so their unfreeze switch is never hidden. `swiftc -typecheck` passes. Deployed 2026-08-24, bar running.
- 2026-08-20: "Always Low Data on this network" row in the bar's modes block. Unpinned it asks for a name (NSAlert; SSIDs are location-gated so Sean names the network), runs `lowdata on` then `profile-here NAME` so the pinned snapshot always carries the mode ON; pinned it shows a checkmark plus the name, appends "off until rejoin" during a manual override, and clicking unpins via `profile rm`. Daemon publishes `net_mac` in now.json; the bar looks the pin up in config.json so the row flips instantly. Verified: py_compile, swiftc -typecheck, sandboxed-HOME daemon publishes the MAC, and the full lowdata-on -> profile-here -> rm chain passes in a sandbox. Deployed 12:2x via `./install.sh`; live daemon confirmed publishing `net_mac`.
- 2026-08-20: deployed via `./install.sh` (Sean, 12:06). Daemon and bar restarted from the repo copies; `~/bin/netmeter` verified byte-identical to the repo.
- 2026-08-20: `throttle_period` fallback in `throttle_worker` now agrees with `DEFAULT_CONFIG` (`4.0`). Cosmetic in practice, `load_config` always merges the default, so the fallback only fired on an explicit falsy config value.
- 2026-08-20: Low Data summary line no longer stretches the menu. It wraps at the " · " separators onto lines capped at 52 characters, continuation lines hanging under the text, dim styling preserved (`netmeter-bar.swift`, needs deploy).
- 2026-08-20: per-network default settings. `netmeter profile-here NAME` pins the current gateway MAC to the current lowdata-family settings; the daemon applies the profile on join and restores on leave, a manual override stands until leave-and-rejoin, stint memory in `~/.netmeter/profile.json` survives daemon restarts. `netmeter profile` lists, `profile rm NAME` forgets. 15/15 sandboxed checks pass (needs deploy).
- 2026-08-20: project page caught up with the throttle wave: throttle and three-control Low Data bullets, loopback gotcha, and "The soft brake and the hard stop" section with the duty-cycle leak numbers.
- 2026-08-20: `__pycache__/` added to `netmeter/.gitignore` (was showing untracked).
