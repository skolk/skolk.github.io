---
layout: default
title: Astraeus Tracker
subtitle: Hardware, firmware, and the bench tooling that catches what unit tests miss
permalink: /projects/astraeus-tracker/
categories: [project]
project_tag: astraeus-tracker
status: active
last_updated: 2026-06-16
---

# Astraeus Tracker

> The hardware-facing half of the Astraeus stack. Arduino firmware for the Blues Notecard, a fleet UI, the Halcyon data-synthesis tool, the Supabase-backed engine that publishes the agent-readable bundle, and the bench tooling I built so two humans and a model can debug a serial device without anyone losing the plot.

This is the part of the system that has to survive water, weather, cellular timeouts, and firmware mistakes. It is also where I learned that a good observability tool for a serial device is the difference between shipping a fix and shipping five firmware versions that almost fix it.

## The Problem

A tracker that ships SST, GPS, and battery telemetry from a moored or drifting unit lives or dies on three things: does the GPS get a fix often enough to be useful, does the cellular radio deliver the note, and does the row that lands in Postgres mean what the firmware thought it meant. All three are debuggable in principle. None of them are debuggable easily.

The friction is at the boundary. The Notecard exposes a JSON-RPC API and an AT-style debug menu over the same USB serial port. Most bugs live in the handoff between firmware logic and Notecard semantics, between the Notecard route and the Supabase insert, between a fresh GPS cold-start and a primed warm one. A unit test on any single function passes. The boundary still breaks.

## What It Produces

A working tracker firmware at v4.5.0, deployable to a Swan R5 with a TEMT6000 light sensor, a DS18B20 temperature probe, and the GPS profile of your choice. A canonical fleet UI at `tracker/tracker_index_8_3_8.html`. The Halcyon data engine and viewer that ingest Open-Meteo climatology, compute z-score residuals, and emit a CORS-clean export bundle that downstream consumers can read. A schema with eleven migrations, the most recent five applied via MCP. A contract registry where each boundary I care about has a written invariant set.

And `tools/bench-bridge/`, which is the small Python utility I use every single day. It tees the Notecard's serial output to a log with timestamps and direction tags, and optionally watches `commands.jsonl` so an agent can drive the bench by appending lines.

## How It Works

The data path is Notecard to Notehub to Supabase Edge Function (`fetch_open_meteo` for sources, `export_bundle` for consumers) to Postgres to viewer. The migration history captures what changed and when. The bundle contract has its own changelog. The risk register tracks the failures I have seen in production and the tests I trust to catch the next one.

The control plane is bench-bridge plus the debug menu. With `setDebugOutputStream(usbSerial)` enabled in firmware, every rejected `card.*` request prints `[ERROR] ... {io}` immediately, which means an agent can see the failure on the same line it was caused. Iterating on a fix without that trace enabled is what cost me five firmware versions across v4.23 to v4.27 to learn the visibility-first rule.

## Worked Example: the gps_status use-after-free

This one is worth telling because it is a textbook unit-tests-pass, contract-fails story.

### What we ran

In April 2026, v4.3 of the tracker firmware shipped to a small fleet. The change wasn't load-bearing on the GPS path. Two firmware versions later, in v4.4 and v4.5, a `gps_status` column on the `locations` table started arriving as one to three bytes of high-bit garbage. The expected value was a thirty-plus character string of curly-brace tags like `{gps-active} {gps-signal} {gps-fix}`. What landed in the database was bytes like `ÿ` and `é`.

### What it produced

Three days of production data with a corrupted status field before a human noticed. Every device's JSON response looked structurally correct. Every unit test passed. The dashboard rendered. The garbage was right there in Supabase.

The bug, when I found it: `JGetString(locRsp, "status")` returned a pointer into the Notecard library's JSON arena. The next line called `notecard.deleteResponse(locRsp)`, which freed that arena. Then `JAddStringToObject` serialized whatever bytes the allocator had reused. A use-after-free, classic and easy in C, invisible to any test that only watched the function boundary.

The fix in v4.16+ is a static `char statusBuf[256]` that copies the status before the response is freed. The harder fix, the one that matters for next time, is the contract: `tests/contracts/C-001-gps-status-string.md`. Seven invariants. The use-after-free trips four of them. A single fresh row evaluated against any one of them would have caught it within minutes.

### What surprised us

The cardinality invariant. Healthy devices emit one of a small set of tagged strings; a use-after-free emits a different garbage string per row because the heap reuse is per-call. So the test "in a 24h window, do 60 percent of rows from this firmware share one of the top five tag patterns" catches the failure even if the individual bytes happen to be ASCII-printable that day. That invariant is the one I wouldn't have written without seeing the failure first.

### What it costs, what scales

The serial debugging tool is about three hundred lines of Python. The contract is a markdown file plus seven autogenerated pytests. The actual firmware fix is six lines of C. The lesson scales: every time the boundary breaks and the units pass, write the contract, then write the tests off the contract. I now have one contract written (`C-001`), and the moment I see another class of boundary failure, the second one gets written and the next bug gets caught before three days of data go bad.

The bench-bridge tool is the part of this that ports cleanly. If anyone is working with a Notecard on a Mac and an agent in the loop, the copy mode log-tail plus bridge mode `commands.jsonl` pattern is worth stealing wholesale.

## Where It's Going

Bench-validate v4.5.0 light sensor on real hardware (firmware and UI shipped, nothing flashed yet). Build dev and prod migration lanes so schema changes get tested against synthetic data before they touch the live route. Add a second contract, probably around the route transformation that fills `tower_lat`/`tower_lon` when GPS is null and cell tower is the fallback. Tighten the diurnal-cycle validation that's still gating the R-002 and R-005 mitigations to "resolved."

## Status

Active. Single operator (me), which is named explicitly in the risk register as the dominant exposure. v4.43 is the firmware chain head. I'd like to hear from anyone running Blues Notecards in environmental monitoring deployments, especially people who have war stories from the Notecard library's response-lifetime semantics.

## Sources

- [astraeus-tracker](https://github.com/skolk/astraeus-tracker) repository (private)
- [Astraeus Ocean Systems](https://astraeusocean.com/)
- C-001 contract: `tests/contracts/C-001-gps-status-string.md`
- bench-bridge tool: `tools/bench-bridge/`
