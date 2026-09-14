---
layout: post
type: project
title: Boring Is the Goal
date: 2026-08-31
categories: [making, tools, music]
tags: [banjo, practice, browser-tools]
reviewed_by_sean: false
needs_review: true
short_description: A clawhammer banjo practice room in one HTML file, kept off the site. Fifty-three tunes, seven ways to work at each one, and a log, built because the practice I kept skipping was the practice I had to plan first.
---

The August plan said banjo, three songs, in the evenings. What happened most evenings was
the deciding: which song, which part of it, at what speed, and whether ten minutes of failing
the D7 chord counted. Then it was late. The banjo was never the problem. A decision you have
to make fresh every night is a decision you will eventually stop making, and the practice you
skip is the practice you have to plan first.

So I built the deciding out of it. One HTML file, opened from disk, no server and no network.
Pick a tune, click a card, and the page loads the tune, sets the tempo, starts a clock, and
keeps the receipt when you stop.

## What is in it

Fifty-three tunes and nine warm-up drills. The first five are the ones I was already chasing:
Boil Them Cabbage Down, When the Saints Go Marching In, Oh Susanna, Camptown Races, Cripple
Creek, transcribed from public-domain collections and moved into G. Twenty more sit on a twelve-week plan in three months (one tuning and one motion; drop
the thumb and change the tuning; speed, 6/8 and the whole neck), and twenty-eight fill out a
wider book: old-time, songs and hymns, shanties, Irish. Ten of the fifty-three have full melody
tab. The other forty-three are chord charts with a line of the words and a target tempo, and
the page greys out the rungs that need a melody.

Three tunings (open G, sawmill, double C), twenty-four chord shapes you can click to hear, and
tab drawn in SVG from the tune data with index, thumb, or brush marked under every note. The sound is a Karplus-Strong pluck
synthesised in the browser. The footer calls it close enough to a banjo to practise against
and not close enough to enjoy on its own, which is fair.

Click one bar, then another, and that stretch loops. Tempo runs 34 to 150 bpm, with buttons
at 45, 60, 80 and 100 percent of finished speed, and the bracket keys nudge it four bpm at a
time.

## Seven rungs

The part I think is actually right. A tune is not one thing to learn. It is seven, climbed in
order:

1. **Chord chart**: the changes, brushed on every beat.
2. **Bum-ditty**: the same chords in the clawhammer frame.
3. **Skeleton**: only the melody notes that land on a beat, the frame filling the rest. The tune is recognisable and nothing in it is hard yet.
4. **Melody only**: the tune bare. Sing it while you play it. If you cannot sing it, you do not know it.
5. **Melody and drone**: melody plus the fifth string, no brush. It already sounds like a banjo.
6. **Whole thing**: melody, brush and thumb woven together.
7. **Drop-thumb**: the thumb falls on the second string instead of the drone. Feels wrong for a fortnight.

Each rung is a different arrangement of the same bars, so a tune with a melody hands you all
seven for nothing. The skeleton is the
rung people skip, which is why it sits in the middle of the list with a number on it. The rule
for moving up, in the page's own words, is that you do not leave a rung until it is dull. Dull
is the signal. Boring is the goal. Then add four bpm.

## A menu, not a routine

The first version had a fixed fifteen-minute session: warm up, drills, walk a tune up the
ladder, play something you know. It is still there, with three others (warm-ups only, one
tune all the way up, set rehearsal), and the default is "Nothing, I'll pick as I go."

What took its place at the centre of the page is a menu of cards in no order. The seven rungs
for whatever tune is loaded. Six ways to work at it: loop the hard bar, speed ladder, sing it,
straight through, against the click, free play. The drills. Three "just play" cards, one of
which picks, at random, a tune that has never been in the log. Click anything and it starts. Move on and it lands in the log
with the tune, the rung, the minutes, and the tempo as a percentage of finished speed. Under
twenty seconds does not count.

The Log tab totals days practised, days running, minutes, tunes touched. A session clock counts up to fifteen minutes, and when it gets there the hint
changes to say fifteen minutes is a session whatever you did with it. That is the thesis of
the page in one line.

One filter exists for a specific grievance. Tick a chord and "only these" and
the list shrinks to tunes that use nothing else. Tick G alone and you get nothing, so the page
shows you the nine tunes that are one shape away instead. Tick G, C and D7 and you get
thirty-one. That is the D7 chord priced honestly: not an obstacle, the entry fee for most of
the book.

## In the back end, on purpose

It lives in `_backend/`, which Jekyll never publishes, and it runs from a file. [The
tarot deck]({{ '/tarot/' | prepend: site.baseurl }}) and [the doors deck]({{ '/doors/' | prepend: site.baseurl }})
were built to hand to other people. This one is for one person on one stool, with a log that
lives in one browser, forty-three chord charts still waiting on their melodies, and a version
number that starts with a zero. Moving the file to the repo root would put it at a URL. Not
yet.

Everything is in the one file: the tunes as data, the arranger, the synth, the tab renderer,
the log. Five localStorage keys hold the log, the filter, the routine, today's ticks, and any
tune you have edited or written. The editor takes a tune as text, one bar to a line,
`G: G3@0:2 B3@4:2`, a note at a slot for so many eighths, and an edited built-in keeps its
id so its history follows it. Export is JSON, import merges, and the clear button makes you press it
twice.

Five songs by September 20, when the tall ship leaves. Two are solid as I write this, three more are in pieces. Twelve by memory within the year. The log will say.
