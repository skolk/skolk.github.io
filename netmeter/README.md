# netmeter

Per-app network usage meter for macOS. The monitoring half of Little Snitch / TripMode, built from `nettop` plus a small Swift menu bar app. Made for working on tethered or metered connections.

## What it does

- **Menu bar readout**: live ↓/↑ speed and the running session total (`↓3K ↑175K · 1.29GB`). KB and MB are whole numbers, so the digits that churn every second never change the item's width and walk it off a crowded bar; GB keeps two decimals because it moves about once an hour. Preferences hides either half independently and can collapse the two rates into one, so the item is as wide as you want it:

  | speed | total | menu bar |
  |---|---|---|
  | on | on | `↓3K ↑175K · 1.29GB`, or `⇅178K · 1.29GB` combined |
  | off | on | `1.29GB` |
  | on | off | `⇅178K` |
  | off | off | `⇅` |

  With both off the item is one glyph, so a stale daemon has to say so inside it: `⇅ …` rather than a bare arrow, which would look the same as a quiet network.
- **Modes**, as buttons at the top of the menu. Clicking one toggles it and leaves the menu open, so you can flip a mode and keep reading the per-app list:
  - **Low Data Mode** posts a notification every 25 MB of session data, and freezes whatever is listed in `lowdata_apps`.
  - **Solo Mode** picks one app and freezes everything else the moment it touches the network. The chevron on the right of the Solo button picks which app; the rest of the button arms the mode. This is the one for "I only want to look at Chrome" and not have an editor, a sync client or an app updater help itself to the hotspot behind you. System daemons, the window server and your terminal are exempt; app updaters are not.
- **Menu**: per-app list switchable between Session and Today, each row with an on/off switch that freezes the app (SIGSTOP) until resumed. The switch shows **both** totals at once with how long each has been accumulating (`Session ⇅351MB · 3m` / `Today ⇅2.01GB · 8h 59m`), so the other number never costs a click; the selected side is the one in full contrast. **Open netmeter** and **Reset Session** are buttons on a row of their own, with the session's start time beside them; the running duration is not repeated there, because the header two rows down already carries it.
- **Recent usage**, at the bottom of the menu: a stacked chart of data used against time over the last 5m / 15m / 1h / 6h / 12h, coloured by app, with the ranked per-app breakdown for the same window underneath. Each column shows *which* apps spent that minute, not just how much went. The table's bars carry the same colours, so it doubles as the legend. Colours are assigned by rank within the current window rather than hashed from the app name: rank assignment can never collide among the apps actually on screen, and the legend sits three pixels below the chart, so it stays correct even though the mapping changes with the window. One column per minute up to sixty, so a 5m window is five fat columns rather than sixty slivers of mostly nothing, and the rightmost column is the last *completed* minute, since the daemon flushes on the clock rollover. Daily totals cannot answer this, because they only ever go up: they tell you who has spent the most since midnight, never who is spending it *now*. Click the window you want; the chevron on the left collapses chart and table together when you don't want the height. Both the window and the collapsed state persist. `ChartView.timeOnX` transposes the plot if you would rather have time run down the side.
- **Window** (the **Open netmeter** button): Session / Today / Yesterday tables, auto-refreshing, each headed with its span (`running 8h 59m` for a live period, `over 23h 51m` for a closed day).
- **History**: one JSON file per day in `~/.netmeter/`.
- **CLI**: `netmeter`, `netmeter session`, `netmeter session reset`, `netmeter pause <app>`, `netmeter resume-all`, `netmeter lowdata on|off`, `netmeter recent 60`, `netmeter solo chrome`, `netmeter solo off`, `netmeter display --rate on|off --total on|off --combine on|off`, `netmeter show 2026-07-29`.
- **meeting-mode-extension/**: a tiny Chrome extension (load unpacked via `chrome://extensions`). One click discards every tab except the active one, audible tabs, and meeting domains.

## Install

```sh
./install.sh
```

Copies the engine to `~/bin/netmeter`, compiles the bar app to `~/bin/netmeter-bar` (needs Xcode or CLT for `swiftc`), writes both LaunchAgents, and starts them. They run at every login from then on.

To change the code: edit here, run `./install.sh` again.

## Uninstall

```sh
launchctl bootout gui/$(id -u)/com.seankolk.netmeter
launchctl bootout gui/$(id -u)/com.seankolk.netmeterbar
rm -f ~/bin/netmeter ~/bin/netmeter-bar
rm -f ~/Library/LaunchAgents/com.seankolk.netmeter*.plist
rm -rf ~/.netmeter
```

## Notes that cost a morning to learn

- **To move the readout along the menu bar, hold Cmd and drag it.** A plain drag does nothing, on any menu bar item, which is the whole reason it looks stuck. macOS saves the result to `~/Library/Preferences/netmeter-bar.plist` under `NSStatusItem Preferred Position netmeter`, the key named by `statusItem.autosaveName`. The value is a pixel offset from the right edge, so a larger number sits further left, and it is really a sort key against whatever else is in the bar: macOS rewrites every item's number when the bar reflows, so what persists is the ordering, not the figure. To place it without dragging, stop the app first, or `cfprefsd` writes its cached value back over yours:

  ```sh
  launchctl bootout gui/$(id -u)/com.seankolk.netmeterbar
  defaults write netmeter-bar "NSStatusItem Preferred Position netmeter" -float 305
  killall cfprefsd
  launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.seankolk.netmeterbar.plist
  ```

  Pick the number by reading the neighbours you want to sit between: `defaults find "NSStatusItem Preferred Position"`. Set `autosaveName` explicitly rather than accepting the auto-generated `Item-0`, which is only stable while this remains the app's one and only status item. The preferences domain is the bare executable name and not a bundle identifier, because netmeter-bar is a plain Mach-O rather than a `.app`, so renaming the binary loses the position. Control Center, Spotlight and the clock are pinned and never move.
- **The history is one line per minute, appended, not a rewritten blob.** `~/.netmeter/recent.jsonl` holds `{"m": <epoch minute>, "a": {app: [in, out]}}` and keeps the last 800 minutes. Everything else in `~/.netmeter` is a single JSON file rewritten in place, which is right for state that stays small; for a rolling history it would mean writing hundreds of KB a minute to record a few dozen numbers. Appending is O(1) and pruning happens once an hour.
- **`nettop` sometimes reports a negative interval delta**, presumably when a counter resets mid-sample (`syspolicyd: [0, -28]`, seen 2026-08-19). Summed as-is it walks the daily totals *backwards*, so deltas are clamped at zero rather than trusted.
- **Units are decimal** (1 GB = 10^9 bytes), not binary. A carrier selling a 50 GB plan means 50 x 10^9, so counting the cap in 2^30 handed out 7.4% of phantom headroom: the "100% used" warning did not fire until roughly 3.7 GB past the real cap. Display uses the same units so the bar and the bill agree.
- **Two processes writing one JSON file will eat your settings.** `save_json` wrote through a shared `<path>.tmp`, so a Preferences Save (which fired two `netmeter` calls at once) could interleave into an unparseable `config.json`. `read_json` swallowed the `JSONDecodeError` and returned `None`, `load_config` filled in defaults, and the next write persisted them: one click unlinked a tether network. Fixed three ways, all of which were needed: pid-scoped temp names, an `flock` around every read-modify-write, and an `update_config` that recovers from `config.json.bak` and says so rather than answering a corrupt file with fresh defaults.
- `nettop`'s per-process cumulative counters are **not monotonic**: they sum the currently open sockets, so they drop when sockets close. Never diff them yourself; run `nettop -d` and consume its per-interval deltas.
- `nettop` block-buffers when piped. Run it under `script -q /dev/null` (a pty) to get samples in real time.
- Expect netmeter to read 10-15% below the interface counters (Bandwidth+, `netstat -ib`): packet headers and processes living under one sample interval are invisible to it.
- Freezing is whole-app (SIGSTOP), not network-only. Per-app network blocking requires an Apple-signed Network Extension, which a script cannot provide.
- The engine's `FRIENDLY` list maps nettop's truncated names; Claude Code sessions appear as their version number (e.g. `2.1.220`).

## Limits

- macOS only. Monitoring only (no per-app bandwidth blocking or shaping).
- Sub-5-second processes can slip between samples.
- System daemons and Claude Code sessions deliberately have no freeze switch in the per-app list. Solo Mode keeps a shorter exemption list (`SOLO_PROTECT`): it will freeze the Claude app, since an editor updating itself is exactly what Solo Mode exists to stop.
- `~/.netmeter/paused.json` records why each app was frozen (`manual`, `lowdata`, `solo`), which is what lets `solo off` unfreeze what solo froze and leave a hand-paused app alone.
