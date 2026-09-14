---
layout: post
type: project
title: Calendar Times Place
date: 2026-07-06
categories: [making, tools, sailing]
tags: [salish-sea, maps, orca, browser-tools]
reviewed_by_sean: false
needs_review: true
short_description: A map of the Salish Sea that models why the whales are where they are, week by week, and drops the live sightings on top so you can see where the model is wrong.
---

I got home to the boat after two months away and the first thing I wanted to know was where the whales were. The sighting networks will tell you where a whale was an hour ago. They will not tell you why it was there, or where it will be in three weeks when I actually have a day free to go look. So I built a map that models the reason and lays the reports on top.

[Open it here]({{ '/salish/' | prepend: site.baseurl }}). It runs in the browser, no account, and everything except the sightings layer works with no signal.

## Calendar times place

The idea fits in one line. For every species, presence in a patch of water in a given week is a spatial prior times a seasonal calendar. The prior is a handful of named spots with a radius and a weight: Haro Strait, the Fraser approach, Cherry Point, Salmon Bank, the ghost-shrimp flats off Camano. Distance from each spot decays as a Gaussian, the spots sum, the total caps at one. The calendar is a bell curve over the 52-week year, wrapped at New Year, on a floor so nothing ever quite goes to zero. Multiply the two and every hex has a number between zero and one for every week. Hover a hex and it shows you the number, and reminds you it is a model.

That is the whole engine. Chinook get two bumps, a spring run around week 16 and the big summer push around week 30, on a floor of 0.18 because there is always some Chinook somewhere. Herring spawn along a tight band of shoreline in March. Gray whales get one narrow bump from March through May, the weeks the few that peel off the coastal migration spend digging ghost shrimp in Saratoga Passage. Minke sit over the San Juan banks all summer; humpbacks peak in late September at the entrances.

The scrubber at the bottom steps through the year a week at a time. It opens on today, with a marker so you can find your way back, and a play button that runs the year in about thirty seconds. Watching the Chinook wash in through Juan de Fuca, pile up at the Fraser mouth, and drain out in October is the part I keep replaying.

## Deriving the predators from their prey

Orcas are not modeled directly. Two ecotypes live here that look identical from a boat and behave like different animals. Southern Residents eat Chinook, almost exclusively; Bigg's (the transients) eat harbor seals. So each orca layer is derived from its prey field instead of getting a calendar of its own.

The Southern Resident layer takes the Chinook field for the current week, blends in a fixed boost for the summer core off the west side of San Juan Island, and gates the result on a summer curve, since the Residents mostly leave the inland waters in winter to follow the fish out to the coast. The Bigg's layer takes the harbor seal field (haul-outs on reefs and spits, year-round, with a pupping bump in July) and blends in an inland-waters weighting, no gate, because Bigg's are here all year. Seals do not migrate, so the seal layer no longer shows in the panel; it still feeds the derivation underneath.

The map becomes a sentence with a *because* in it. Turn on Chinook and the Residents together and the shape of one is the shape of the other, shifted. Switch the run selector to Sockeye and the Residents follow the sockeye through Haro Strait in August, a simplification the whales would dispute, but it makes the coupling visible in a way a field of pins never does.

## The hex grid

The water is tiled in H3 hexagons at resolution 7, about five square kilometers each, from the open Pacific off Cape Flattery to the Bellingham shore and from south of Olympia to Desolation Sound. A land mask decides which hexes are sea: a 154 by 139 grid of ones and zeros, 41 percent water, from a 90 meter elevation model for the core and the Natural Earth coastline for the extension, because the elevation service caps requests per coordinate and re-pulling the whole box was not going to happen. That leaves about 11,800 sea cells on a canvas; zoom past level 10 and the grid refines to resolution 8 inside the viewport only. The narrow inlets of South Sound fall between the mask's teeth and stay blank. I know.

## Live sightings, politely

The one layer that is not a model is the sightings. The primary feed is [Acartia](https://acartia.io), the Salish Sea data cooperative that pools Orca Network, Ocean Wise's WhaleReport, the Whale Museum and others into one public endpoint. The map pulls the last seven days, filters to the box, sorts newest first, and draws up to 60 markers colored by species, with the reporting source and a verified flag in the popup. [iNaturalist](https://www.inaturalist.org) is the second source. Newer markers are brighter. While the tab is open the layer refreshes every five minutes and pulses anything new; hidden, it stops polling and catches up when you return.

Under that sits a rate limiter, which belongs on any page that hits someone else's public API from every visitor's browser at once. Twenty requests per rolling minute, a 2.5 second gap between calls, a response cache so a nervous re-click does not become a new request, de-duplication of fetches in flight, and a circuit breaker: a 429 honors Retry-After, and three failures in a row trip a five-minute cool-down. The panel shows the live count, req 1 of 20, so the guard is something you can watch rather than something I assert. In practice the page makes one request every five minutes; the limiter is for the day something misbehaves.

## What cost time

Night mode. The panels used `body.dark-theme` selectors and the page sets `data-theme` on the html element, so the dark overrides never fired and every panel glowed cream over a black map. Once the panels were dark, the water glared white: the day theme paints every sea hex with the ramp's zero color so the field reads as continuous, and that pale wash stacked across layers on a near-black basemap. Night now skips the floor; only real signal paints. The theme toggle still reloads the page, because the basemap and grid colors are set at load, so it stashes the center and zoom in session storage first and puts the frame back where it was. And the original name was Orca Map, which undersold the salmon, the herring, and three baleen whales. Renamed on the last day.

## How it is built

Leaflet and h3-js from a CDN with fallbacks, CARTO basemap tiles, a canvas renderer, and three JavaScript files (geometry, forage model, sightings) mounting into a page forked from the seagrass map behind the [Pollica]({% post_url 2026-07-02-Pollica-Gastrodiplomacy %}) work. The seagrass code is still in there, switched off behind a flag. One JSON file locks the bounds, grid, and layers; a second holds the land mask. No build step.

The next piece is the reason the thing exists: a proximity alarm that reads the phone's position and pings when a fresh sighting lands within a few miles of the boat. None of that is wired yet. The map is the groundwork.
