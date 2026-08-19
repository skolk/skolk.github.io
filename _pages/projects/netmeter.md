---
layout: default
title: netmeter
subtitle: A per-app data meter for macOS, built for working over a phone hotspot
permalink: /projects/netmeter/
categories: [project]
project_tag: netmeter
status: active
last_updated: 2026-08-19
---

# netmeter

> A menu bar meter for macOS that shows which app is spending your data, live and totaled for the day, with a switch beside each app to freeze it. Built because the boat runs on a phone hotspot, and one morning half a gigabyte was gone by 9am with no receipt.

I had trackers on every terminal and they all read under 100 MB combined, while the connection had moved 500 MB. The existing tools each tell you one piece: Bandwidth+ gives the interface total but no per-app split, Activity Monitor counts since boot, `nettop` forgets a process the moment it exits. Little Snitch and TripMode do it properly, and if you want the blocking half you should buy one of them. I wanted the accounting half, attributable and resettable, so I built it in a morning with Claude.

## What it does

- **Menu bar readout**: live down/up speed and a running session total, like `↓3K ↑175K · 1.29GB`. Speed and total hide independently, and the two rates collapse into one, so the item is as wide as you want it: `⇅178K · 1.29GB`, or `1.29GB`, or nothing but a `⇅` glyph. KB and MB are whole numbers on purpose. Those digits churn every second, and a readout that changes width every second is what walks off the end of a crowded menu bar.
- **Session vs Today**: a session counter you reset when you hop onto the hotspot, and a daily total that rolls over at midnight and keeps history, one JSON file per day. A segmented control flips the per-app list between the two and shows **both** totals at once, each with how long it has been accumulating, because the number you are not looking at is usually the one that answers the question.
- **A switch next to each app**: flip it off and the app freezes (SIGSTOP, the whole app, not just its network), flip it back and it resumes. System daemons and active work sessions deliberately get no switch; freezing `mDNSResponder` takes DNS down with it.
- **Two modes, as buttons at the top of the menu.** *Low Data* notifies every 25 MB of session data. *Solo* picks one app and freezes everything else the moment it touches the network. Solo is the one for "I only want to look at Chrome" without an editor, a sync client or an app updater helping itself to the hotspot behind you. Because it fires on the tick an app moves bytes, something that has been idle all morning gets caught when it reaches out, rather than after it has already pulled 200 MB.
- **A monthly cap for the metered network**: link the hotspot once, set the carrier's quota and reset day, and the bar switches to `⌁2.4/50G` whenever you are on it, with notifications at 50, 75, 90 and 100 percent.
- **A stats window**: Session / Today / Yesterday tables, refreshing every two seconds, each headed with its span.
- **Meeting Mode**, a separate two-file Chrome extension: one click discards every tab except the active one, anything playing audio, and known meeting domains. The tabs sit in the strip and reload when clicked.

## The bugs worth knowing about

The first version multiplied traffic by four. `nettop`'s per-process counter looks cumulative but is really the sum over the process's *currently open* sockets, so it drops every time a socket closes. Diff those numbers yourself and every drop looks like a restart, and you re-credit the whole counter. Chrome "moved" 1.65 GB in thirteen minutes that way. The fix is to stop doing arithmetic and consume `nettop -d`, which emits honest per-interval deltas.

The second bug produced nothing at all: `nettop` block-buffers when writing to a pipe, so the "live" readout arrived in stale lumps. It runs under a pty now (`script -q /dev/null`), which keeps it line-buffered and the menu bar current.

The third was arithmetic, and it mattered more than either. The meter counted in binary units while the carrier bills in decimal, so a 50 GB plan was being compared against 50 x 2^30 bytes rather than 50 x 10^9. That is 7.4% of headroom that does not exist: the "100% used" warning would not have fired until roughly 3.7 GB past the real cap, which on a metered connection is the one number the tool exists to get right. Everything counts in 10^9 now, display included, so the bar and the bill agree.

The fourth had nothing to do with networks. Saving preferences fired two processes at once; both read the config file, both wrote it, and the loser's change vanished, three times in five attempts. Worse, both wrote through the same temporary filename, so they could interleave into an unparseable file. The reader swallowed the parse error and returned nothing, the loader filled in defaults, and the next write made those defaults permanent. One click on Save silently unlinked a configured hotspot. The repair needed four things at once, because any one alone still leaves the hole open: process-scoped temporary names, a lock around every read-modify-write, a single writer that recovers from a backup rather than answering a corrupt file with fresh defaults, and saving everything in one call instead of two. The general lesson is cheap to state and easy to forget: a `try`/`except` that turns a corrupt file into a default value converts a transient race into permanent data loss.

Calibration against the raw interface counters says the meter catches about 87% of the bytes; packet headers and processes that live under one five-second sample make up the rest. Rule of thumb: the wire carries 10 to 15% more than the meter shows.

What it found on day one, for the record: a meeting recorder quietly uploading 4 MB a minute, parallel Claude Code sessions totaling 1 GB of upload in a day, and Chrome responsible for most of the downloads. None of that was visible from a total.

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
