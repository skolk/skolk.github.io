---
layout: default
title: netmeter
subtitle: A per-app data meter for macOS, built for working over a phone hotspot
permalink: /projects/netmeter/
categories: [project]
project_tag: netmeter
status: active
last_updated: 2026-08-20
---

# netmeter

> A menu bar meter for macOS that shows which app is spending your data, live and totaled for the day, with a switch beside each app to freeze it. Built because the boat runs on a phone hotspot, and one morning half a gigabyte was gone by 9am with no receipt.

<img src="/images/blog_posts/netmeter-menubar.png" alt="The netmeter menu bar item reading 13K per second down and up combined, and 1.10GB for the session" width="202">

I had trackers on every terminal and they all read under 100 MB combined, while the connection had moved 500 MB. The existing tools each tell you one piece: Bandwidth+ gives the interface total but no per-app split, Activity Monitor counts since boot, `nettop` forgets a process the moment it exits. Little Snitch and TripMode do it properly, and if you want the blocking half you should buy one of them. I wanted the accounting half, attributable and resettable, so I built it in a morning with Claude.

## What it does

- **Menu bar readout**: live down/up speed and a running session total, like `↓3K ↑175K · 1.29GB`. Speed and total hide independently, and the two rates collapse into one, so the item is as wide as you want it: `⇅178K · 1.29GB`, or `1.29GB`, or nothing but a `⇅` glyph. KB and MB are whole numbers on purpose. Those digits churn every second, and a readout that changes width every second is what walks off the end of a crowded menu bar.
- **Session vs Today**: a session counter you reset when you hop onto the hotspot, and a daily total that rolls over at midnight and keeps history, one JSON file per day. A segmented control flips the per-app list between the two and shows **both** totals at once, each with how long it has been accumulating, because the number you are not looking at is usually the one that answers the question.
- **A switch next to each app**: flip it off and the app freezes (SIGSTOP, the whole app, not just its network), flip it back and it resumes. System daemons and running work sessions deliberately get no switch; freezing `mDNSResponder` takes DNS down with it, and stopping a Claude Code session dead mid-task is rarely what you meant. The throttle below is the control for those.
- **A throttle for the apps a freeze would ruin**: `netmeter throttle claude --pct 25` duty-cycles an app between SIGSTOP and SIGCONT, so it keeps working at a fraction of its speed instead of stopping dead. Which is why Claude Code has a throttle and no freeze switch. It is a soft brake, not a cap; the measurements below say how soft.
- **Two modes, as buttons at the top of the menu.** *Low Data* notifies every 25 MB of session data and runs three controls at once: freeze the apps you can do without (`lowdata_apps`), throttle the ones you cannot (`lowdata_throttle`), and freeze any app that moves more than `burst_cap_mb` inside a single minute, which is the download nobody asked for. *Solo* picks one app and freezes everything else the moment it touches the network. Solo is the one for "I only want to look at Chrome" without an editor, a sync client or an app updater helping itself to the hotspot behind you. Because it fires on the tick an app moves bytes, something that has been idle all morning gets caught when it reaches out, rather than after it has already pulled 200 MB.
- **A monthly cap for the metered network**: link the hotspot once, set the carrier's quota and reset day, and the bar switches to `⌁2.4/50G` whenever you are on it, with notifications at 50, 75, 90 and 100 percent.
- **What went where, and when**: a stacked chart of data against time at the foot of the menu, coloured by app, over the last 5m / 15m / 1h / 6h / 12h, with the ranked breakdown underneath carrying the same colours so it doubles as the legend. This one needed a new store to exist at all. Daily totals only ever go up, so they say who has spent the most since midnight and never who is spending it *now*, and the session counter just moves the same monotonic problem to a different start time. The engine keeps a rolling history instead: one appended line per elapsed minute, last 800 minutes.
- **A stats window**: Session / Today / Yesterday tables, refreshing every two seconds, each headed with its span.

<img src="/images/blog_posts/netmeter-menu.png" alt="The netmeter menu open, showing Low Data and Solo mode buttons at the top, the session clock, both Session and Today totals with their durations, and the per-app list with a freeze switch beside each app" width="360">

The menu on a working morning. Both modes are off: the Solo button still names Google Chrome because it remembers the last target, so arming it is one click. Claude Code, `nsurlsessiond` and `cloudd` are the three rows with no switch beside them, because freezing a system daemon takes DNS or iCloud down with it and freezing the running work session is rarely what you meant. Session and Today sit side by side, 1.10GB over 1h 28m against 3.13GB over 10h 29m, which is the comparison that says whether this hour is unusual. The hotspot name is blurred; everything else is as it runs.
- **Meeting Mode**, a separate two-file Chrome extension: one click discards every tab except the active one, anything playing audio, and known meeting domains. The tabs sit in the strip and reload when clicked.

## The bugs worth knowing about

The first version multiplied traffic by four. `nettop`'s per-process counter looks cumulative but is really the sum over the process's *currently open* sockets, so it drops every time a socket closes. Diff those numbers yourself and every drop looks like a restart, and you re-credit the whole counter. Chrome "moved" 1.65 GB in thirteen minutes that way. The fix is to stop doing arithmetic and consume `nettop -d`, which emits honest per-interval deltas.

The second bug produced nothing at all: `nettop` block-buffers when writing to a pipe, so the "live" readout arrived in stale lumps. It runs under a pty now (`script -q /dev/null`), which keeps it line-buffered and the menu bar current.

The third was arithmetic, and it mattered more than either. The meter counted in binary units while the carrier bills in decimal, so a 50 GB plan was being compared against 50 x 2^30 bytes rather than 50 x 10^9. That is 7.4% of headroom that does not exist: the "100% used" warning would not have fired until roughly 3.7 GB past the real cap, which on a metered connection is the one number the tool exists to get right. Everything counts in 10^9 now, display included, so the bar and the bill agree.

The fourth had nothing to do with networks. Saving preferences fired two processes at once; both read the config file, both wrote it, and the loser's change vanished, three times in five attempts. Worse, both wrote through the same temporary filename, so they could interleave into an unparseable file. The reader swallowed the parse error and returned nothing, the loader filled in defaults, and the next write made those defaults permanent. One click on Save silently unlinked a configured hotspot. The repair needed four things at once, because any one alone still leaves the hole open: process-scoped temporary names, a lock around every read-modify-write, a single writer that recovers from a backup rather than answering a corrupt file with fresh defaults, and saving everything in one call instead of two. The general lesson is cheap to state and easy to forget: a `try`/`except` that turns a corrupt file into a default value converts a transient race into permanent data loss.

A fifth was invisible until the history arrived. `nettop` occasionally reports a *negative* interval delta, presumably a counter resetting mid-sample: `syspolicyd: [0, -28]`, caught in the first minute of recorded per-minute buckets. Summed as-is it walks the daily totals backwards, slowly and undetectably, which is the kind of error a total can hide indefinitely and a time series cannot. Deltas are clamped at zero now.

One more is a reading gotcha rather than a bug: `nettop` counts loopback, so a transfer over `127.0.0.1` shows in the chart at double size, once as sent and once as received, 800 MB for a 400 MB pull from a local server. The tether budget never moves, because it is measured from `netstat` on `en0`, the wifi interface only. Worth knowing before a chart spike sends you hunting.

Calibration against the raw interface counters says the meter catches about 87% of the bytes; packet headers and processes that live under one five-second sample make up the rest. Rule of thumb: the wire carries 10 to 15% more than the meter shows.

What it found on day one, for the record: a meeting recorder quietly uploading 4 MB a minute, parallel Claude Code sessions totaling 1 GB of upload in a day, and Chrome responsible for most of the downloads. None of that was visible from a total.

## The soft brake and the hard stop

Freezing is binary, and some apps a freeze would ruin. Claude Code mid-task is the obvious one on this machine, so the throttle duty-cycles instead: at 25%, the app runs a quarter of every period, sleeps the rest, and keeps making progress the whole time.

Then I measured it against a rate-capped transfer, and the network barely noticed. A 25% duty cycle moved 63% of full speed at a 4-second period, 84% at 1 second, 95% at half a second. A stopped process cannot execute, but the kernel keeps filling its socket buffer while it sleeps, and it drains the backlog at full speed the moment it wakes. The throttle only bites once the off-window is long enough to overflow that buffer, which is why the period defaults to seconds rather than milliseconds. Against CPU, where there is no buffer to hide in, the same cycle is exact: a 25% setting measures 26%.

A brake that leaks like that cannot be the only control, so Low Data mode grew a hard stop beside it: `burst_cap_mb` freezes any app that moves more than the cap inside a single minute. That completes the set of three: freeze the apps you can do without, throttle the ones you cannot, and stop the download nobody asked for.

Two details cost real thought. A throttled app is frozen at whatever instant the daemon dies, so every exit path releases it: `atexit` plus SIGTERM, SIGINT and SIGHUP handlers, because launchd stops the daemon with SIGTERM and the default handler skips `atexit` entirely. SIGKILL cannot be caught, so the release also runs on the way *in*: launchd restarts the daemon a second later and it unfreezes whatever the corpse left stopped.

The other: none of these signals reached Claude Code at first. Its process is named for its version number, `2.1.220`, so matching by label found nothing. The rename table that turns `2.1.220` into a readable menu row now runs in reverse, label back to pids, and once signals could reach work sessions, Solo Mode was taught to spare them. Throttling is the control for a session you want slowed rather than stopped.

## How it works

Three small pieces, no framework, no build system beyond `swiftc`:

- A Python daemon streams `nettop -P -x -d` deltas, folds them into per-app daily totals, and writes a few JSON files under `~/.netmeter/`.
- A Swift menu bar app (one file, compiled with `swiftc`) reads those files every two seconds and draws the readout, the switchable per-app list, and the stats window.
- A `launchd` agent pair starts both at login and restarts them if they die.

Per-app *blocking* without freezing, the thing TripMode sells, genuinely requires an Apple-signed Network Extension and the entitlements that come with a developer account. A script cannot do it, which is a fine reason those apps cost money.

## Install

```sh
git clone https://github.com/skolk/skolk.github.io
cd skolk.github.io/netmeter
./install.sh
```

Needs `swiftc` (Xcode or Command Line Tools). The [source](https://github.com/skolk/skolk.github.io/tree/master/netmeter) is five files; the [README](https://github.com/skolk/skolk.github.io/blob/master/netmeter/README.md) has the uninstall and the full notes.
