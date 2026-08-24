---
layout: default
title: micmeter
subtitle: A mic level meter for the macOS menu bar, built for dictating in cafes
permalink: /projects/micmeter/
categories: [project]
project_tag: micmeter
status: active
last_updated: 2026-08-24
---

# micmeter

> A menu bar meter that shows what the microphone hears, raw and through Apple's voice filter, side by side. Built because I dictate drafts in cafes and had no way to know whether Voice Isolation was actually removing the espresso machine or faithfully transcribing it.

<!-- image slot: /images/blog_posts/micmeter-menu.png, the menu open in a cafe with the two-row meter visible in the bar -->

The Mac will tell you the mic is on, that is the orange dot, but not what the mic is hearing. Dictation quality lives or dies on two numbers you cannot see: how far your voice sits above the room, and whether the noise filter is doing anything. So this is netmeter's sibling, one Swift file compiled with `swiftc`, and the second occupant of the menu bar corner: a decibel meter that answers both at a glance.

## What it does

- **Two rows of bars in the menu bar.** The top row is the raw microphone. The bottom row is the same microphone heard through Apple's voice-processing path, the one Voice Isolation acts on. With filtering working, the top row flickers with the room and the bottom row stays dark until you speak. If both rows dance with the espresso machine, the filter is not saving you. Five segments, 12 dB apiece, and the item never changes width, same rule as netmeter's rate digits.
- **The margin, not the level.** The menu reads the background floor (10th percentile of the last 30 seconds), your voice (95th), and the gap between them with a verdict attached: over 20 dB is good dictation territory, under 12 means get closer to the mic. Levels are dBFS and shift with input gain; the margin is the number that survives a different mic at a different volume, so it is the one to trust.
- **How many dB the filter is actually cutting**, measured only between sentences, because during speech both paths carry the voice and the difference means nothing about noise. With Voice Isolation on, a quiet room measures a cut around 40 dB. The menu also names the current Control Center mic mode, and "Change Mic Mode..." summons the system picker, because there is an API to open that UI and none to press its buttons.
- **The Mic Drop duties, absorbed.** A system-wide mute on F5, re-asserted every second because conferencing apps un-mute the mic behind your back, with a volume-to-zero fallback for devices without a hardware mute switch, always restored on quit. Plus a default-input picker. One menu bar item instead of two.
- **Buttons at the top of the menu**, netmeter-style: Mute, Pause, dB, Bars. Click one and the menu stays open.
- **Nothing is recorded.** Each audio buffer is reduced to one RMS number and dropped.

## Three lessons, one afternoon

**macOS will not ask for the mic on behalf of a bare binary.** The first install was an unbundled `swiftc` executable launched by `launchd`, with the microphone usage description embedded in the linker's `__info_plist` section, which is the documented trick for exactly this case. The consent dialog never appeared; TCC recorded a silent denial instead, and the meter sat at the floor reading `mic ✗` with nothing to click. Wrapping the same binary in a minimal `.app` bundle fixed it in one relaunch. The lesson generalizes: if a permission prompt never shows up, stop hunting your code for the bug and look at what the OS considers you to be.

**The voice processor is a bad neighbor.** The filtered row requires running Apple's voice-processing audio unit, and that unit assumes it is in a call: it ducks every other app's audio when it hears activity, so background music dipped and pumped all afternoon. There is an API for asking it not to (`voiceProcessingOtherAudioDuckingConfiguration`), and on this hardware it was not enough. The fix that worked was withdrawal rather than negotiation: once a second the app asks CoreAudio whether any other process is producing output, and while one is, the voice-processing engine shuts down entirely. The filtered row exists exactly when nothing is playing, which is when you would be dictating anyway.

**The bass was leaving through the hardware.** Music still sounded thin after all of that, low end mostly gone, and no capture API was to blame. My default input and output are the same USB conference speaker, and that class of device flips its own onboard DSP into speakerphone voice mode the moment anything opens its mic path, raw tap or not. That happens inside the box, below anything macOS can override. So when the default input *is* the default output and something else is playing, micmeter now yields completely: releases the microphone, shows `♪` in the bar, and resumes a few quiet seconds after playback stops. Point the input at a different mic than the output and the yield never triggers. The general shape is worth keeping: some problems are not in your code, not in the OS, but in firmware with opinions.

## How it works

- One Swift file, compiled with `swiftc` into a minimal `.app` bundle, run by a `launchd` agent that starts it at login and restarts it if it dies.
- Two `AVAudioEngine` taps on the default input, one plain and one with voice processing enabled, each reduced to a running RMS level. Percentiles over a 30-second window give the floor and the voice; no voice-activity detector needed, and the stats recover on their own when the room changes.
- Mute and the input picker are CoreAudio property calls; the F5 hotkey is a Carbon `RegisterEventHotKey`, which still works and needs no accessibility permission.

## Install

```sh
git clone https://github.com/skolk/skolk.github.io
cd skolk.github.io/micmeter
./install.sh
```

Needs `swiftc` (Xcode or Command Line Tools). First launch asks for microphone access. The [source](https://github.com/skolk/skolk.github.io/tree/master/micmeter) is three files; the [README](https://github.com/skolk/skolk.github.io/blob/master/micmeter/README.md) has the uninstall and the full notes.
