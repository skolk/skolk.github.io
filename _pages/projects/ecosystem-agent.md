---
layout: default
title: Ecosystem Agent
subtitle: A coastal monitoring tool that drops onto any coastline in three commands
permalink: /projects/ecosystem-agent/
categories: [project]
project_tag: ecosystem-agent
status: active
last_updated: 2026-06-16
---

# Ecosystem Agent

> A tool that lets a coastal community open a map of their own water and see, in plain visual terms, what's in it, what's stressing it, what's known versus what isn't, and what they can do about it. One map per site. Every hex is a real measurement, or an honest "no data," sourced from public global datasets. Adding a new site is a recipe, not a project.

This is the analytic spine that sits under Astraeus. I build it because most coastal tools either talk to scientists or talk to nobody, and neither is what a fisher in Acciaroli or a mangrove keeper in Bocas needs when they walk into a town meeting on a Tuesday night.

## The Problem

Coastal communities make decisions every week about water they understand intimately but have no shared visual baseline for. The data exists. NOAA Coral Reef Watch publishes daily 5km sea surface temperature and bleaching stress globally. OpenStreetMap has every coastline. Open-Meteo serves wave forecasts. Satellites map reefs and mangroves. The problem is that it's spread across fifteen agency websites in formats nobody outside research uses.

The tools that try to close that gap fall into three buckets, all with the same gap. Research dashboards like NOAA CoralWatch and EMODnet have authoritative data and opaque interfaces written for scientists. Per-site one-offs are beautiful but each one is hand-built and can't be redeployed without rewriting. Sparse-sensor citizen apps in the PurpleAir mold have community-grade UX, but the coastal-water version doesn't exist because in-situ sensors are expensive and few coastal communities have them.

Ecosystem Agent scales the per-site model to any coastline. Instead of waiting for a sensor, we sample the global gridded sources at every hex on the coast. Coverage everywhere, lineage labelled honestly, source URLs visible.

## What It Produces

A single map per site, with these properties: hexagonal grid covering the coastal band, each cell colored by a real measurement or marked gray for honest "no data." Toggleable layers for sea surface temperature, degree heating weeks, wave height, bathymetry, depth zone, and habitat suitability composites. A source registry visible from every legend. A build recipe of three shell commands that takes a bounding box and produces a working viewer.

Behind that, a set of agent outputs that the v1 architecture still emits for the long-form report: ecology, economy, governance, and social layer files, a systems map of cross-domain feedback loops, and a ranked intervention set scored on Donella Meadows leverage levels. The marine atlas and the systems-narrative outputs are two sides of the same engagement and they share a bounding box.

## How It Works

The pipeline is short and deliberately boring.

1. Pick a bounding box. Run `shore.py` to derive a coastal band geometry from the OpenStreetMap coastline. Pollica's coast becomes 475 segments to 475 bands.
2. Run `hex_data.py` over the band at H3 resolution 9. For each hex, sample the active global gridded sources: NOAA Coral Reef Watch via ERDDAP for sea surface temperature and degree heating weeks, NOAA ETOPO 2022 for bathymetry, Open-Meteo Marine for waves. Each value carries the source URL and timestamp in the JSON it writes.
3. Open the viewer. About 280 lines of vanilla HTML. The hex grid loads, you toggle layers, you hover for source attribution and a centroid value.

The current build is `Projects/_v2/` and ships these primitives at five validated sites. The reframe that landed in May 2026 was to stop answering "what's the SST here" and start answering "is this somewhere life lives." Suitability becomes a per-hex composite over depth, substrate, temperature, light, and species occurrence records. The Pollica posidonia map answered that question for one organism. The current architecture generalizes it to any organism in any coastal bounding box.

Sprint cadence is roughly thirty minutes of wall clock or thirty thousand tokens of agent work per increment. Each sprint adds exactly one source, or one derived variable, or one annotation layer. The acceptance gate is `build_v2_site.sh` passing on all sites and a Playwright screenshot grid showing the new layer everywhere.

## Worked Example: Pollica

Pollica is the long-running validation site. It is also a worked example of the seam between two tools: Long Watch did the deep listening and produced the cell outputs that describe what's actually there, and Ecosystem Agent provides the spatial substrate that anchors those outputs to a map.

### What we ran

Pollica's bounding box is 40.13N, 14.95E to 40.30N, 15.18E. The shore agent produced the coastal band. The hex data agent sampled NOAA CRW and ETOPO. The full agent stack also ran the four-domain narrative analysis from the v1 pipeline. Those outputs live alongside the more recent Bocas del Toro work and have been re-validated against the v2 architecture.

### What it produced

A working viewer for the Pollica coast, with sea surface temperature, degree heating weeks, and depth layers calibrated to the Cilento coastal band. The validated outputs (asset inventory, ecology stressors, the operative frames Pollica itself uses) live in the Long Watch repo and feed back into how the Ecosystem Agent annotates this site.

### What surprised us

The bathymetry sampler had a land-bleed bug visible only at high-relief coastlines. Plain inverse-distance weighting over ETOPO neighbors averaged positive shoreline elevation into water cells, so steep bays read as "land" with species observations floating in mid-water. The fix is twenty lines: filter to negative-elevation neighbors only, return null if there are fewer than two within search radius. The visible failure on Bahía Almirante in Bocas is what surfaced the same class of failure that would have lived undetected on Pollica.

### What it costs, what scales

A full site build is roughly six seconds of wall clock for the hex sampling step on a 7,683-cell archipelago. A full v1 narrative run across ecology, economy, governance, and social agents costs a few dollars per site with prompt caching, and writes about thirty thousand tokens of structured JSON.

The thing that does not scale is the per-site interpretation. Adding a coast is three commands. Understanding what the cells are telling that coast's community is still a relationship, and that's why Long Watch sits next to this tool, not inside it.

## Where It's Going

Next live moves: ship the depth-IDW land-bleed fix, then reef suitability as the next composite, then mangrove suitability extension to Bocas. Behind that, an automated lineage-map test that diffs the source registry against the viewer's style map. Premature meta-agents (sprint runner, source finder, habitat envelope lookup) stay backlog until we've manually run three to five more sprints and the friction is real.

## Status

Active. v0.7.16. Five sites validated: Pollica, Bocas del Toro, La Paz, Alaska, Barbados. I'd like to hear from coastal monitoring groups, NGOs, and municipal staff who have a bounding box and a community in mind but no monitoring atlas to show them.

## Sources

- [ecosystem-agent](https://github.com/skolk/ecosystem-agent) repository (private)
- [Astraeus Ocean Systems](https://astraeusocean.com/)
- Long Watch's [Pollica cell outputs]({{ '/projects/long-watch/' | prepend: site.baseurl }})
