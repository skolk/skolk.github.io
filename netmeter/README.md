# netmeter

Per-app network usage meter for macOS. The monitoring half of Little Snitch / TripMode, built from `nettop` plus a small Swift menu bar app. Made for working on tethered or metered connections.

## What it does

- **Menu bar readout**: live ↓/↑ speed and the running session total (`↓3K ↑175K · 1.16 GB`).
- **Menu**: per-app list switchable between Session and Today, each row with an on/off switch that freezes the app (SIGSTOP) until resumed. Reset Session when you hop onto a hotspot. Low Data Mode posts a notification every 25 MB of session data.
- **Window** ("Open netmeter..."): Session / Today / Yesterday tables, auto-refreshing.
- **History**: one JSON file per day in `~/.netmeter/`.
- **CLI**: `netmeter`, `netmeter session`, `netmeter session reset`, `netmeter pause <app>`, `netmeter resume-all`, `netmeter lowdata on|off`, `netmeter show 2026-07-29`.
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

- `nettop`'s per-process cumulative counters are **not monotonic**: they sum the currently open sockets, so they drop when sockets close. Never diff them yourself; run `nettop -d` and consume its per-interval deltas.
- `nettop` block-buffers when piped. Run it under `script -q /dev/null` (a pty) to get samples in real time.
- Expect netmeter to read 10-15% below the interface counters (Bandwidth+, `netstat -ib`): packet headers and processes living under one sample interval are invisible to it.
- Freezing is whole-app (SIGSTOP), not network-only. Per-app network blocking requires an Apple-signed Network Extension, which a script cannot provide.
- The engine's `FRIENDLY` list maps nettop's truncated names; Claude Code sessions appear as their version number (e.g. `2.1.220`).

## Limits

- macOS only. Monitoring only (no per-app bandwidth blocking or shaping).
- Sub-5-second processes can slip between samples.
- System daemons and Claude Code sessions deliberately have no freeze switch.
