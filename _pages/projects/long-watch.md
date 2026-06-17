---
layout: default
title: Long Watch
subtitle: A place-based, long-horizon partner practice for working coastal communities
permalink: /projects/long-watch/
categories: [project]
project_tag: long-watch
status: active
last_updated: 2026-06-16
---

# Long Watch

> Long Watch arrives with rigorous homework, stays for the ten-year horizon, and helps communities map what's there ecologically, economically, politically, so they can decide what to do with it. The community decides. We map.

This is the practice that sits next to the analytic tools. It is not a product, it is a way of showing up. The code in the repo is just the harness that keeps the work honest: a small Python CLI, a set of specialized AI agents that read a community profile and emit structured outputs, and a "DNA" immune system that fails closed when the work drifts from the principles.

## The Problem

Most resilience work shows up after the failure. Long Watch shows up earlier, before the failure, and earlier than most consultancies are willing to. The grant cycle is three years. The relationship a coastal community needs is ten. The translation work between what scientists know, what the community already knows in deep local knowledge, and what a funder can write a check against is almost never done in the same room with the same vocabulary.

Existing modes all hit a known wall. Consultancies pitch a scope. Researchers extract data. NGOs convene workshops and leave. None of them sit on the ten-year horizon and translate.

## What It Produces

Per cell (the engagement unit), three Phase-1 outputs:

A `local_context.yaml` mapping geography, history, economy, ecology, governance, language, and culture in the community's primary language with English glosses. An `asset_inventory.yaml` enumerating maritime, ecological, agricultural, cultural-heritage, built-environment, utility, and human-capital assets, each tagged with its commons-private-state classification (Ostrom-style), its keepers, and a "strand 8" hook (the qualitative note that feeds the cost-of-keeping calculation). An `ecology_pulse.yaml` of biome health, stressor matrix, early-warning indicators (operator-observable and instrumented in equal weight), and a high-leverage data gaps list.

All three carry an inputs hash for provenance, a model identifier, source attribution per claim, and a `needs_partner_input` block listing what the agent could not know without the community telling it. Every output passes through the DNA harness or is held under `outputs/.../held/` with an immune flag.

## How It Works

Four pieces compose the practice. Cells, the engagement unit in code, scaffolded under `places/<name>/cells/<cell>/` with a `cell.yaml`, an `inputs/` tree of public sources and partner-shared materials, and an `outputs/` tree of structured YAML. Agents, specialized cultivators each emitting one kind of map: `@local-context-mapper`, `@asset-inventory`, `@ecology-pulse` are the Phase-1 trio. The DNA harness, `lw/checks/strand_*.py`, checks every output against the eight strands and either passes it for publication or holds it. The CLI, a single entry point `lw`, with `cells`, `inspect`, `run`, `dna check`, `explore`, and `review` subcommands.

The eight DNA strands run the whole thing. They are: listen first, long horizons, commons over extraction, local first, adapt-don't-prescribe, convene-don't-pitch, die-when-useful, and make-the-long-horizon-actionable. The last one matters most for the outputs: every conclusion has to reduce to dollars saved, dollars earned, resources conserved, or things kept standing. No "resilience" hand-waving.

## Worked Example: Pollica

Pollica is the verified flow. Everything else in the repo is either scaffolded and waiting for inputs (Bocas del Toro, La Paz, Puerto Rico) or theoretical.

### What we ran

The cell is `places/pollica/cells/main/`. The cell.yaml encodes the operative frames the community itself uses (integral ecology, prosperity thinking, regeneration over sustainability, mediterranean living, Pollica open-air laboratory) and explicitly forbids two frames Pollica's leadership has rejected (resilience, climate adaptation). The inputs are seven markdown files of public sources totaling about thirty thousand tokens: the municipality profile, the UNESCO Mediterranean Diet inscription, the Cilento Bio-District, the Future Food Institute and Paideia material, the HOHLI Project overlap (critical for strand 5, the no-prescribe strand), the methodology lineage Long Watch shares with the room, and Long Watch's own seed inputs.

I ran the three Phase-1 agents against that input set on a Sunday in May. Local-context-mapper went first (about seventy-five cents, 722 lines of output, zero DNA flags). Asset-inventory ran next with `local_context.yaml` cached as upstream input (about a dollar sixty-eight, ninety-eight assets across seven classes, zero DNA flags). Ecology-pulse ran last (about eighty-five cents, twenty-nine stressors, thirty-four indicators, twelve high-leverage data gaps, zero DNA flags).

### What it produced

The asset inventory's classification distribution is the one I find myself coming back to: thirty commons, sixteen private, eleven state, forty-one hybrid. Hybrid outnumbering commons is the Ostrom-aligned reading of a Mediterranean coastal commune where ownership is mixed by design. The hybrid count is honest where a less careful agent would have rounded everything to "commons" because the brief asked about commons.

The ecology pulse named four biomes (Mediterranean reef, posidonia seagrass, Mediterranean fishery, coastal lagoon) all matching the cell.yaml defaults exactly because strand 4 enforcement fails closed on invented biomes. Three were classified deteriorating-and-declining at "likely" confidence. The fourth, coastal lagoon, the agent classified as "unknown / speculation" and noted that public sources do not document significant lagoon systems in Pollica's municipal territory. The agent recognized what it could not know rather than fabricating.

Every output ended with a substantial `needs_partner_input` block: ten entries on local context, sixty-four on assets, nine on ecology. The seed is honest about what listening it requires before its claims are reliable.

### What surprised us

The most useful single line of output is in the local context immune-self-check. The agent surfaced its own central strand-5 finding without being asked: *"Long Watch's specific contribution identified from the materials is the financial-decade translation. Everything else of the frame is already in the room. Strand 8 is therefore the only honest operative differentiator and must guide IDP sections 6 and 7."* The architecture talked through the seed correctly. The agent told me what Long Watch's actual contribution is and what it isn't, before I told it.

### What it costs, what scales

A full Phase-1 run on a populated cell is about three dollars and twenty minutes of wall clock with prompt caching turned on. Without caching the cost would be roughly five times higher. The thing that does not scale is the listening. The Pollica run was reliable because the inputs were prepared with care, in conversation with Sara at the Future Food Institute, and because the cell.yaml encoded the community's own vocabulary. Spinning up Bocas or La Paz to the same quality is not a faster agent run, it is a slower relationship.

## Where It's Going

Bocas del Toro is the next live cell. The cell.yaml is scaffolded, partner inputs from local collaborators and STRI-adjacent sources need to be populated, FPIC considerations need to land before any indigenous-governance content moves through the strand-3 check. La Paz is similarly scaffolded. Puerto Rico is contingent on a co-principal decision with a collaborator.

Behind that, Phase-2 agents (`@stakeholder-cartographer`, planning-cluster agents) and the eventual integration into a delivery (the Pollica Internal Decision Plan, sections six and seven, which is where the financial-decade translation work has to actually land).

## Status

Active. Pollica is verified. Three more cells scaffolded. I'd like to hear from coastal communities with a ten-year question and the patience for a partner who plans to leave once they don't need us, and from foundations that fund the work that doesn't fit a three-year grant.

## Sources

- [long-watch](https://github.com/skolk/long-watch_Alpha) repository (private)
- Pollica cell config: `places/pollica/cells/main/cell.yaml`
- Pollica outputs: `places/pollica/cells/main/outputs/where_you_are/`
- Demo viewer: `web/pollica_demo_v9_2.html`
- Related: [Ecosystem Agent]({{ '/projects/ecosystem-agent/' | prepend: site.baseurl }}) (the analytic substrate)
