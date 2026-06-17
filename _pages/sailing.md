---
layout: default
permalink: /sailing
---

# Sailing

I've been organizing sailing expeditions since 2012, proving that you don't need to own a boat to have incredible adventures on the water. Through Boatless Sailing, I've led charters around the world for 40+ people who share a passion for exploration and the sea.

## Sailing Stats

**Years Sailing:** 14 &nbsp;&nbsp;&nbsp;&nbsp; **Miles Sailed:** 12,000+ &nbsp;&nbsp;&nbsp;&nbsp;

**Days At Sea:** 370+ &nbsp;&nbsp;&nbsp;&nbsp; **Days Skippered:** 233

**Vessels owned:** 1990 Catalina 36 Mk I • 1969 Coronado 25 • 2000 Hobie 18

---

### Certifications & Skills

**Certifications:** ASA BareBoat • ASA Catamaran • RYA Yachtmaster Offshore (2026) • Wilderness First Responder • ACA Swift Water Rescue • Licensed HAM Radio Operator (KK6DFO)

**Skills:** Electro-mechanical Engineer • PADI Advanced Open Water Diver • Expedition Planning • French Onion Soup Underway

---

## Recent Highlights (2024-2025)

**VanIsle 360 (2025)**: Crew on SV Golux BM50, finishing 5th place in this challenging 580-nautical-mile race around Vancouver Island. Three weeks of intense racing through variable Pacific Northwest conditions.

**R2AK - Race to Alaska (2024)**: Skippered [Team Natural Disaster](https://r2ak.com/2024-teams-full-race/team-natural-disaster/) on an Olson 30, completing the 750-mile engineless race from Port Townsend to Ketchikan in 7 days, 5 hours, 14 minutes. No motor, no support, just wind, oars, and determination through the Inside Passage.

**Seattle to Glacier Bay (2024)**: Four-month cruising expedition as skipper, navigating the Inside Passage from Seattle through British Columbia to Southeast Alaska. Extended wilderness cruising with wildlife encounters, remote anchorages, and challenging tidal passages.

---

## Racing History

**2023: Round the County**: Crew (bow) on J105 *Kinetic*, circumnavigating the San Juan Islands in 2 days. Finished 6th out of 12 boats in challenging tidal conditions.

**2023: Swiftsure Race**: Crew (bow/helm) on Catalina Mark II *Mata Hari*, racing from Victoria to Clallam Bay in 13 hours. Classic Pacific Northwest offshore race with strong currents and variable winds.

**2019: Dar es Salaam to Tanga Race**: Four-day coastal race around Zanzibar, Tanzania. Awarded Most Meritorious for completing the 250-mile course without an engine. Pure sailing, learning about East African wind patterns and current management.

---

## Charter Expeditions & International Trips

**The Seychelles (2018)**: 10-day expedition through pristine granite islands with 10 crew. Encountered dolphins, whale sharks, and some of the world's most beautiful anchorages. Storm challenges taught weather management and flexible planning.

**Croatia (2018)**: 7-day exploration of the Dalmatian coast during World Cup finals. Mediterranean mooring, crowded anchorages, and navigation through hundreds of Croatian islands.

**Kenya Coast (2019)**: Crewed on traditional dhows with local fishermen along the Indian Ocean. Learning Swahili phrases and alternative methods of harnessing wind with no metal rigging, pure traditional sailing techniques.

**Greece, Kos (2019)**: 7-day charter through the Dodecanese out of Kos. Aegean trade winds, island hops, and stern-to mooring along ancient harbors.

**Baja, Mexico (2021)**: Captained my Catalina 36 *Petrichor* from Oakland, CA to Cabo San Lucas in the annual Baja Ha-Ha rally. First major offshore passage as captain, 750+ miles of Pacific coast.

**Mexico (2021-2022)**: A long season cruising the Sea of Cortez out of Cabo into La Paz and back, capped by a double-handed engineless run from Loreto to La Paz.

**Bahamas with Green Coco Expeditions (2026)**: A week off Exuma on the 60-foot catamaran *SV Nesi*, blue holes and loggerheads through the Hog Cut to Stone Cay, Water Cay, and Flamingo Key. Best charter I've been on.

**Alaska on Petrichor (2026)**: A long Inside Passage run from Shilshole to Southeast Alaska aboard *Petrichor*. A long blog in itself, full writeup still in progress.

---

## Destinations Sailed

**Pacific Northwest**
- Salish Sea (Seattle, San Juan Islands)
- Princess Louisa Inlet
- Inside Passage
- Glacier Bay
- San Francisco Bay
- Sacramento River Delta

**Mexico & Central America**
- La Paz
- Sea of Cortez
- Cabo San Lucas
- Catalina Island

**East Africa**
- Dar es Salaam, Tanzania
- Tanga, Tanzania
- Zanzibar
- Kenya Coast

**Asia**
- Phuket, Thailand

**Mediterranean**
- Split, Croatia
- Dalmatian Coast
- Dodecanese, Greece

**Indian Ocean**
- Seychelles

---

## Philosophy

**Community building**: The intensity of sailing creates lasting bonds. Being dependent on each other, facing challenges together, exploring beautiful places together, this builds relationships that extend far beyond the water.

**Skills development**: Each expedition teaches navigation, boat handling, cultural immersion, team dynamics, and self-reliance when you're far from shore.

**Embrace challenges**: Things will go wrong. That's where the best stories come from. Whether it's a failed freshwater impeller in the Sea of Cortez or hove-to in a storm, adversity reveals character and builds capability.

---

## The Learning Curve

Sailing integrates diverse skills: planning, boat systems, logistics, coordination, cooking, medical response, wildlife identification, and interpersonal communication. Figuring out why everyone is on the trip is crucial for ensuring everyone feels safe and heard.

We use nightly crew reviews, one-on-one check-ins, and role changes for situations that aren't working. Little things become big things when you literally have nowhere else to go. The elephants in the room must be addressed.

Due to this intensity, friendships form and sometimes issues that have been underwater for a long time surface and get resolved.

---

## Boatless Sailing Community

40+ people have joined charter expeditions over the years. Many have sailed multiple trips and formed lasting friendships. Some have gone on to racing, others to cruising, many to acquiring new skills beyond sailing.

We typically organize a trip every six months, and destinations keep getting more remote. The community continues to grow, united by the belief that the best adventures happen when you're slightly out of your comfort zone, surrounded by people you trust.

---

## Getting Involved

If you're interested in charter sailing:

- **Start local**: Learn basic sailing skills in familiar waters before going international
- **Choose crew carefully**: Shared commitment to learning and safety matters most
- **Embrace challenges**: Things will go wrong, and that's often where the best stories come from
- **Focus on connection**: The water is always calling, and there's room for sailors ready for adventure

---

## Sailing Trip Reports

{% for post in site.posts %}
  {% if post.categories contains "trip-report" and post.categories contains "sailing" %}
- **{{ post.date | date: "%Y" }}**: [{{ post.title }}]({{ post.url | prepend: site.baseurl }}){% if post.short_description %}, {{ post.short_description }}{% endif %}
  {% endif %}
{% endfor %}
