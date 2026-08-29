---
layout: default
title: netmeter
subtitle: A per-app data meter for macOS, built for working over a phone hotspot
permalink: /projects/netmeter/
categories: [project]
project_tag: netmeter
status: active
last_updated: 2026-08-28
---

# netmeter

> A menu bar meter for macOS that shows which app is spending your data, live and totaled for the day, with a switch beside each app to freeze it. Built because the boat runs on a phone hotspot, and one morning half a gigabyte was gone by 9am with no receipt.

<img src="/images/blog_posts/netmeter-menubar.png" alt="The netmeter menu bar item reading 13K per second down and up combined, and 1.10GB for the session" width="202">

I had trackers on every terminal and they all read under 100 MB combined, while the connection had moved 500 MB. The existing tools each tell you one piece: Bandwidth+ gives the interface total but no per-app split, Activity Monitor counts since boot, `nettop` forgets a process the moment it exits. Little Snitch and TripMode do it properly, and if you want the blocking half you should buy one of them. I wanted the accounting half, attributable and resettable, so I built it in a morning with Claude.

## What it does

- **Menu bar readout**: live down/up speed and a running session total, like `↓3K ↑175K · 1.29GB`. Speed and total hide independently, and the two rates collapse into one, so the item is as wide as you want it: `⇅178K · 1.29GB`, or `1.29GB`, or nothing but a `⇅` glyph. KB and MB are whole numbers on purpose. Those digits churn every second, and a readout that changes width every second is what walks off the end of a crowded menu bar.
- **Session vs Today**: a session counter you reset when you hop onto the hotspot, and a daily total that rolls over at midnight and keeps history, one JSON file per day. A segmented control flips the per-app list between the two and shows **both** totals at once, each with how long it has been accumulating, because the number you are not looking at is usually the one that answers the question.
- **A switch next to each app**: flip it off and the app freezes (SIGSTOP, the whole app, not just its network), flip it back and it resumes. The list folds three ways, top 3, top 6, or all twenty, and a frozen app stays visible even when collapsed, because the switch that undoes a freeze must never hide behind the row that lists it. What gets no switch is now only the system floor: freezing `mDNSResponder` takes DNS with it, and freezing the meter leaves no way to unfreeze anything. Claude Code used to sit on that protected list and came off it in August. If Pause All means everything, a work session gets a switch like anything else, and freezing one stops the session until you switch it back on.
- **A throttle for the apps a freeze would ruin**: `netmeter throttle claude --pct 25` duty-cycles an app between SIGSTOP and SIGCONT, so it keeps working at a fraction of its speed instead of stopping dead. It is a soft brake, not a cap; the measurements below say how soft.
- **Pausing ramps down rather than cutting off.** A `SIGSTOP` out of nowhere is a wall: an app mid-request loses the request, and mid-save it can lose more than that. So a pause spends eight seconds on the way down, 25% of the duty cycle, then 5%, then the freeze once the app has actually gone quiet, with a deadline for one that never does. Turning the wifi off does not feel abrupt because the app gets to notice. A ramp is as close to that as a tool working on processes can get, and it stops one step short of the thing it cannot do, which is keep an app alive and offline at the same time.
- **Two modes, as buttons at the top of the menu.** *Low Data* notifies every 25 MB and does five things: freezes the apps you can do without (`lowdata_apps`), throttles the ones you cannot (`lowdata_throttle`), stops the twenty-one background downloaders outright, turns the auto-update checks off and puts them back on the way out, and leaves the caps below armed. The downloaders are the part that had been backwards: most of them sat on the protected list, so the mode would dutifully freeze Chrome and then watch `softwareupdated` pull six gigabytes of macOS over the hotspot.

  *Pause All* is the other one, and it is an allow list that keeps enforcing: everything goes down, and each row you switch back on joins the list rather than lasting a single tick. What you end up with is "only these may talk", built one decision at a time instead of guessed at up front, and an app that launches an hour later is caught the moment it reaches for the network. It has two stages, and the first freezes nothing: the first press ramps everything to 5% of its duty cycle and holds it there, slow enough to save the data and alive enough that the editor you pressed the button from keeps working. The button then reads **Hard Stop**, which is the press that actually freezes the lot.

  *Solo Mode retired into Pause All* in August. Solo was the same idea with the allow list capped at one, and keeping both meant two ways to ask nearly the same question, two enforcement paths, and two sets of exemptions that disagreed with each other.
- **A monthly cap for the metered network**: link the hotspot once, set the carrier's quota and reset day, and the bar switches to `⌁2.4/50G` whenever you are on it, with notifications at 50, 75, 90 and 100 percent. It counts interface bytes, which is what the carrier bills, and interface bytes have no process attached to them: for a month the counter could answer how much and never who. It answers both now. Under the total sits a per-app table for the billing period, which runs 10 to 15% under the header because one side counts payload and the other counts everything on the wire. The header is the bill. The table is who to talk to about it.
- **Two nets under a surprise download**, armed by the situation rather than by a mode: whenever Low Data is on, or you are simply standing on a metered network. `burst_cap_mb` freezes anything that moves more than the cap inside one minute. `drain_cap_mb` catches the shape a per-minute cap cannot see, since 30 MB a minute for ten minutes never trips a 50 MB cap and still costs 300 MB.
- **The hotspot behind you remembers itself.** `netmeter profile-here home-hotspot` pins the current settings to the network you are standing on, identified by its gateway MAC, and joining it applies them by itself. Underneath that, every network gets its settings remembered without any pinning at all: Low Data comes on at the coffee shop because it was on there last week, and stays off at home because you never block everything at home. A mode you flip by hand while connected stands for that stint and is what gets remembered when you leave.
- **What went where, and when**: a stacked chart of data against time at the foot of the menu, coloured by app, over the last 5m / 15m / 1h / 6h / 12h, with the ranked breakdown underneath carrying the same colours so it doubles as the legend. This one needed a new store to exist at all. Daily totals only ever go up, so they say who has spent the most since midnight and never who is spending it *now*, and the session counter just moves the same monotonic problem to a different start time. The engine keeps a rolling history instead: one appended line per elapsed minute, last 800 minutes.
- **A stats window**: Session / Today / Yesterday tables, refreshing every two seconds, each headed with its span.
- **The bar watches the daemon.** Every control here is enforced by the daemon, and a wedged one enforces nothing while looking perfectly healthy: the only symptom was the readout going quiet, which is also what a quiet network looks like. Sixty seconds without a fresh reading now turns the readout to a warning glyph, puts a row above the mode buttons it is failing to enforce, and posts one notification that names the consequence rather than the symptom. "Low Data is set but not enforced" is the sentence worth waking someone for.
- **Meeting Mode**, a separate two-file Chrome extension: one click discards every tab except the active one, anything playing audio, and known meeting domains. The tabs sit in the strip and reload when clicked.

<img src="/images/blog_posts/netmeter-menu.png" alt="The netmeter menu open, showing Low Data and Solo mode buttons at the top, the session clock, both Session and Today totals with their durations, and the per-app list with a freeze switch beside each app" width="360">

The menu on a working morning in mid-August, before Solo retired and the downloaders came off the protected list. Both modes are off: the Solo button still names Google Chrome because it remembers the last target, so arming it is one click. Claude Code, `nsurlsessiond` and `cloudd` are the three rows with no switch beside them. All three have switches now, for the reasons above, and the second button reads Pause All. Session and Today sit side by side, 1.10GB over 1h 28m against 3.13GB over 10h 29m, which is the comparison that says whether this hour is unusual. The hotspot name is blurred; everything else is as it runs.

## The bugs worth knowing about

The first version multiplied traffic by four. `nettop`'s per-process counter looks cumulative but is really the sum over the process's *currently open* sockets, so it drops every time a socket closes. Diff those numbers yourself and every drop looks like a restart, and you re-credit the whole counter. Chrome "moved" 1.65 GB in thirteen minutes that way. The fix is to stop doing arithmetic and consume `nettop -d`, which emits honest per-interval deltas.

The second bug produced nothing at all: `nettop` block-buffers when writing to a pipe, so the "live" readout arrived in stale lumps. It runs under a pty now (`script -q /dev/null`), which keeps it line-buffered and the menu bar current.

The third was arithmetic, and it mattered more than either. The meter counted in binary units while the carrier bills in decimal, so a 50 GB plan was being compared against 50 x 2^30 bytes rather than 50 x 10^9. That is 7.4% of headroom that does not exist: the "100% used" warning would not have fired until roughly 3.7 GB past the real cap, which on a metered connection is the one number the tool exists to get right. Everything counts in 10^9 now, display included, so the bar and the bill agree.

The fourth had nothing to do with networks. Saving preferences fired two processes at once; both read the config file, both wrote it, and the loser's change vanished, three times in five attempts. Worse, both wrote through the same temporary filename, so they could interleave into an unparseable file. The reader swallowed the parse error and returned nothing, the loader filled in defaults, and the next write made those defaults permanent. One click on Save silently unlinked a configured hotspot. The repair needed four things at once, because any one alone still leaves the hole open: process-scoped temporary names, a lock around every read-modify-write, a single writer that recovers from a backup rather than answering a corrupt file with fresh defaults, and saving everything in one call instead of two. The general lesson is cheap to state and easy to forget: a `try`/`except` that turns a corrupt file into a default value converts a transient race into permanent data loss.

A fifth was invisible until the history arrived. `nettop` occasionally reports a *negative* interval delta, presumably a counter resetting mid-sample: `syspolicyd: [0, -28]`, caught in the first minute of recorded per-minute buckets. Summed as-is it walks the daily totals backwards, slowly and undetectably, which is the kind of error a total can hide indefinitely and a time series cannot. Deltas are clamped at zero now.

One more is a reading gotcha rather than a bug: `nettop` counts loopback, so a transfer over `127.0.0.1` shows in the chart at double size, once as sent and once as received, 800 MB for a 400 MB pull from a local server. The tether budget never moves, because it is measured from `netstat` on `en0`, the wifi interface only. Worth knowing before a chart spike sends you hunting.

August's bugs were all one family, and none of them were about counting. Once the tool started freezing things in bulk, the hard part stopped being measurement and became bookkeeping: what did I stop, is it still stopped, and does anything still want it that way.

The matching was too loose. App labels were matched anywhere in a command line, so freezing Signal also stopped `/Applications/WiFi Signal.app`, which had been sitting frozen for four days before anyone noticed. Labels have to sit on a path boundary now. Anchoring on a leading slash alone was not enough either, because Apple ships a `CursorUIViewService` that a naive anchor still catches when you freeze Cursor.

Nothing reconciled intent against reality. `paused.json` listed seven apps, four of them running normally, while three Chrome crash handlers sat stopped under an entry claiming Chrome was frozen. Then the worse version: Pause All froze thirty-five processes, Resume All appeared to lift them, and twenty-seven Cursor helpers, five WebKit processes and `cloudd` stayed stopped while `netmeter paused` reported "Nothing is paused". A duty cycle's SIGSTOP had landed a moment after the resume emptied the books, and the code that undoes freezes reads those same books, so not even restarting the daemon could recover them. Two fixes, in opposite directions: the throttle worker now holds the pids it stopped in its own memory and wakes them itself, and a sweep walks the other way once a minute, from every stopped process on the machine back to whether any live record still claims it.

That sweep then spent its first morning fighting the shell. The log kept saying it had woken a stranded `node`, every few minutes, all morning. Nothing was stranded: two suspended terminal sessions each held a stopped `npm exec` with a `node` child, `node` was on the day's app list, and the sweep was waking a job that had been put to sleep on purpose, which the shell then re-stopped the moment it touched the terminal. The two of them passed the process back and forth for hours. The tell is the controlling terminal, which job control needs and which a GUI helper or a launchd daemon does not have at all. Worth stating plainly, because the fix is one line and the lesson is not: a tool that heals things has to be able to tell a wound from a decision.

The last one broke the machine rather than an app. `launchctl bootout` returns before the job is actually gone, so the bootstrap two lines later in the installer failed with an I/O error, and `set -e` aborted the script neatly between the two agents. No daemon, no menu bar app, nothing enforcing anything, and an error message that reads like a warning. It went unnoticed for several minutes on a laptop that was supposed to be metering itself, which is a fair summary of why the watchdog above exists.

Calibration against the raw interface counters says the meter catches about 87% of the bytes; packet headers and processes that live under one five-second sample make up the rest. Rule of thumb: the wire carries 10 to 15% more than the meter shows.

What it found on day one, for the record: a meeting recorder quietly uploading 4 MB a minute, parallel Claude Code sessions totaling 1 GB of upload in a day, and Chrome responsible for most of the downloads. None of that was visible from a total.

## The soft brake and the hard stop

Freezing is binary, and some apps a freeze would ruin. Claude Code mid-task is the obvious one on this machine, so the throttle duty-cycles instead: at 25%, the app runs a quarter of every period, sleeps the rest, and keeps making progress the whole time.

Then I measured it against a rate-capped transfer, and the network barely noticed. A 25% duty cycle moved 63% of full speed at a 4-second period, 84% at 1 second, 95% at half a second. A stopped process cannot execute, but the kernel keeps filling its socket buffer while it sleeps, and it drains the backlog at full speed the moment it wakes. The throttle only bites once the off-window is long enough to overflow that buffer, which is why the period defaults to seconds rather than milliseconds. Against CPU, where there is no buffer to hide in, the same cycle is exact: a 25% setting measures 26%.

A brake that leaks like that cannot be the only control, so a hard stop grew beside it: `burst_cap_mb` freezes any app that moves more than the cap inside a single minute. That completes the set of three: freeze the apps you can do without, throttle the ones you cannot, and stop the download nobody asked for.

The cap started out arming only inside Low Data, which was the wrong condition. A surprise 100 MB costs the same whether or not a mode happens to be switched on, and the daemon already knows on the same tick whether the network underfoot is the metered one. So both caps arm on the situation now. The minute cap also turned out to be the wrong window on its own: it resets on the clock, so a steady 40 MB a minute under a 50 MB cap never trips once, which is 2.4 GB an hour of drain that every check passes. `drain_cap_mb` reads a rolling window of completed minutes for the shape a single minute cannot show. Neither cap ramps, deliberately: the ramp opens at 25% of the duty cycle, and 25% of a fast link for eight seconds is tens of megabytes, so a soft landing for the exact transfer the cap exists to stop would be no cap at all.

Two details cost real thought. A throttled app is frozen at whatever instant the daemon dies, so every exit path releases it: `atexit` plus SIGTERM, SIGINT and SIGHUP handlers, because launchd stops the daemon with SIGTERM and the default handler skips `atexit` entirely. SIGKILL cannot be caught, so the release also runs on the way *in*: launchd restarts the daemon a second later and it unfreezes whatever the corpse left stopped.

The other: none of these signals reached Claude Code at first. Its process is named for its version number, `2.1.220`, so matching by label found nothing. The rename table that turns `2.1.220` into a readable menu row now runs in reverse, label back to pids. Once signals could reach work sessions the question became whether they should, and the answer went back and forth for a week before landing on no exemptions at all. An exception you cannot switch off is not one you chose. What makes that survivable is the ramp: Pause All's first stage is a hold rather than a stop, so pressing it from inside a session slows the session instead of killing it.

## How it works

Three small pieces, no framework, no build system beyond `swiftc`:

- A Python daemon streams `nettop -P -x -d` deltas, folds them into per-app daily totals, and writes a few JSON files under `~/.netmeter/`.
- A Swift menu bar app (one file, compiled with `swiftc`) reads those files every two seconds and draws the readout, the switchable per-app list, and the stats window.
- A `launchd` agent pair starts both at login and restarts them if they die.

The most dangerous seconds of a metered day are the first ones after the lid opens, when every sync client that queued work overnight starts at once. Network awareness used to ride the same five-second tick as everything else, so those seconds ran under the previous network's rules with the new network's profile still a tick away. The daemon watches its own clock now: a gap past thirty seconds is a sleep or a stall rather than a tick, and it re-reads the network and applies its rules before it counts a single byte. It also throws away the counters that would otherwise span the gap, including the interface reading that would cheerfully charge a night of somebody else's network to this one.

Verification is one command. `./bin/check` compiles both halves and runs 153 checks against a sandboxed home directory, and the installer refuses to install over a failure. That harness exists because the intricate parts of this tool are invisible: a freeze that half-worked looks exactly like a freeze that worked, and the bugs above were all found by reading logs after the fact rather than by anything failing loudly at the time.

Per-app *blocking* without freezing, the thing TripMode sells, genuinely requires an Apple-signed Network Extension and the entitlements that come with a developer account. A script cannot do it, which is a fine reason those apps cost money.

## Install

```sh
git clone https://github.com/skolk/skolk.github.io
cd skolk.github.io/netmeter
./install.sh
```

Needs `swiftc` (Xcode or Command Line Tools). The [source](https://github.com/skolk/skolk.github.io/tree/master/netmeter) is five files, an engine, a bar, an installer, a check script and its tests; the [README](https://github.com/skolk/skolk.github.io/blob/master/netmeter/README.md) has the uninstall and the full notes.
