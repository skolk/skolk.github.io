---
layout: post
type: project
title: The Community Economic Simulator
date: 2026-07-05
categories: [community, systems]
tags: [community-economics, systems, development, pollica, teaching-tools]
reviewed_by_sean: false
short_description: A single-screen simulator for running a small place through twenty turns of choices, to see where the value it makes ends up staying, and who ends up owning it.
---

The week in [Pollica]({% post_url 2026-07-02-Pollica-Gastrodiplomacy %}) left me with a question I could not put down. A small place makes real value: food, hospitality, a way of living that people travel to see. What decides whether that value stays local, or leaks out to owners somewhere else? I build things to think with, so I built a simulator.

<img src="/images/blog_posts/community-economic-simulator.png" width="100%" alt="The opening screen of the Community Economic Simulator: a heading reading Where do you begin, three development paths (capability-led, commons-led, market-led), and a Coastal Island biome card listing its advantages and common shocks">

[Play it here]({{ '/community-simulator/' | prepend: site.baseurl }}). It runs entirely in the browser, no account, no data leaving the page.

You start by choosing a place: a coastal island, inland plains, or mountainous highlands. The terrain does not decide the story, but it shapes what is cheap, what is expensive, and what is never going to happen here. An island gets tourism for free and cannot mine. The plains are a granary if you build the roads and a dust bowl if you do not. Then you run twenty turns. Each turn you allocate labor across sectors, set taxes and wages, and spend on capability: roads, schools, health, research, a port, rule of law. Then a shock lands. A drought, a tourist crisis, a commodity crash, a storm, chosen against the weaknesses of the place you picked.

The engine underneath is about complexity and ownership. Simple sectors are place-bound and low-value. The valuable ones need capability stacked up first, and some of them are owned from outside, which means the value they produce leaves. Three development paths reveal themselves through your choices: capability-led (build the institutions, climb the complexity ladder), commons-led (raise wages, keep ownership local), and market-led (cut taxes, invite outside capital, accept the inequality for the growth). At the end you are scored against all three at once. There is no single winner. The point is the tradeoff you cannot see while you are living inside it.

Play the island and the tension shows up fast. Tourism fills the treasury quickest, but it is outside-owned and it is the first thing a shock takes away. Tax it hard and pour the money into schools and you are poorer for a decade and then, maybe, you own what you built. Most people reach for the fast treasury the first time through. The second time they slow down.

That is what the tool is for: to put that choice in front of a room, in a form you can argue about, before the argument is about a real place and real people. It is a piece of the [environmental engagement work](https://astraeusocean.com/) Kate and I are doing in Pollica, the part that has to happen with a community rather than around it. A model is a bad master and a decent conversation starter. This one is meant to start conversations.
