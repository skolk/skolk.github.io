---
layout: post
type: project
title: Seventy-Eight Cards
date: 2026-08-24
categories: [making, tools]
tags: [tarot, randomness, facilitation, browser-tools, teaching-tools]
reviewed_by_sean: false
needs_review: true
short_description: A tarot deck in the browser, built as a randomizer with a vocabulary attached. The interesting part turned out not to be the divination. It was discovering that fifty-six of the cards are a two-axis system you can learn in ten minutes.
---

I do not read tarot. I built a tarot deck anyway, because I wanted a randomizer with a
vocabulary attached, and it turns out that is exactly what a tarot deck is.

[Open it here]({{ '/tarot/' | prepend: site.baseurl }}).

Seventy-eight cards, drawn in SVG so there are no images to load and nothing to fetch. It
works offline, on a phone, in a single file. Shuffle the deck, cut it, and draw one card at a
time into a spread of one, two, or three places. Cards stay on the table until you clear them,
and they stay out of the stack until you shuffle again, so the deck actually depletes the way
a real one does.

## Making the randomness visible

Most of these tools call `Math.random()` and hope you do not ask. If you are going to let a
random draw push your thinking somewhere it would not have gone, you want some confidence the
draw was real and not theatre.

So the shuffle is a proper Fisher-Yates pass over all seventy-eight cards, one unbiased draw
per position, sourced from `crypto.getRandomValues` with rejection sampling to kill the modulo
bias you get from a naive `% n`. Reversal is decided per card at draw time rather than baked
into the deck order, so it is a genuine coin flip on each one. The cut takes a random depth
and tells you where it landed.

And there is a tape across the top of the page that streams the actual bytes as they get
consumed, with a running count. It is the part I like most. It makes the stochasticity a thing
you can watch rather than a thing you are asked to accept. Seventy-eight factorial is about
1.13 x 10^115 possible orders, which is a number with no useful intuition attached, so the
tape is doing the work the number cannot.

## The part that surprised me

I expected the meanings to be seventy-eight arbitrary things to memorize. They are not. Fifty
six of the cards are a two-axis system.

A minor card is roughly **suit times number**. The suit says which part of life: Wands is what
you want to do, Cups is what you feel, Swords is what you think, Coins is what you have. The
number says what stage that part is in, and the same arc runs through all four suits. Ace is
the seed. Four is structure. Five is always the disruption. Six is the recovery. Ten is
completion tipping into too much.

Once you have those two lists, most of the deck decodes itself. Five of Cups is grief. Six of
Cups is comfort returning. Five of Coins is destitution, Six of Coins is charity. Same beat,
different domain. Whoever formalized this built a taxonomy, and a fairly disciplined one.

So the tool shows the grammar underneath every card you draw rather than hiding it in a
reference section. Draw the Five of Cups and it tells you *cups: water, feeling and bond* and
*five: disruption, the test*. You learn the system by using it. There is a full guide and a
searchable index of all seventy-eight underneath, but the goal is that you stop needing them.

Reversals get the same treatment. There is no single rule for what a reversed card means and
readers disagree, so the guide lays out the four common approaches (blocked, opposite, excess
or deficiency, timing) and tells you to pick one and stay consistent, because a card that can
mean anything means nothing.

## Why I actually built it

The same reason Brian Eno printed [Oblique Strategies](https://en.wikipedia.org/wiki/Oblique_Strategies) on cards. A constrained random prompt is
a good tool for getting a group past its first three ideas, and a good tool for getting one
person past the answer they already decided on before they sat down. The deck is not telling
you anything. It is handing you a vocabulary item you did not choose and making you argue with
it, and the arguing is where the work happens.

That is close enough to what I do in facilitation that I wanted a version I trusted, that
worked with no signal, and that I could hand to somebody without a preamble about what I do or
do not believe.

There is a night mode, which goes red-light rather than merely dim, on the theory that the
place I am most likely to want this is below deck at anchor with my eyes already adjusted.
