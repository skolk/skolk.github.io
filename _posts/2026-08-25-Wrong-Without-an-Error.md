---
layout: post
type: project
title: Wrong Without an Error
date: 2026-08-25
categories: [making, tools]
tags: [doors, decision-making, randomness, facilitation, browser-tools]
reviewed_by_sean: false
needs_review: true
short_description: A second browser deck, built to force a second reading of a situation you have only read one way. The best card in it is the one for being off course when nothing went wrong.
---

[The tarot deck]({{ '/tarot/' | prepend: site.baseurl }}) did the job I built it for, which was
handing me a word I had not chosen. But the thing I kept actually needing was narrower. Not a
prompt. A second reading of a situation I had already read once and was fairly confident about.
So I redrew the deck for that job instead.

[Open it here]({{ '/doors/' | prepend: site.baseurl }}).

Seventy-eight cards, same engine underneath: a Fisher-Yates pass sourced from
`crypto.getRandomValues`, the entropy tape across the top, three themes, one file that works
offline on a phone.

What changed is the face of the card. Every card carries one situation read two ways. **What is
there** is the situation as an actual fact of the world. **How you are seeing it** is the same
fact, except the obstacle turns out to be a preference you have not admitted to. The deck flips
a coin for which one leads and hides the other behind a "Turn it over" button, so you have to
commit to a reading before you are shown the alternative. The choosing is the thinking. The
grammar page says it plainly: if you agree with every card the deck deals you, you are reading
horoscopes.

Every card ends in a move. One action, cheap, concrete, doable this week. That line is what keeps
the thing a tool rather than a fortune.

The four suits split two and two. Perception and Navigation are yours: how you see, and how you
steer. Paths and Doors belong to the world: the routes that exist, and the crossings at the end
of them. That is the same inside-and-outside split the two readings make on every card, so the
deck says one thing at two scales.

## The drift

The ten stages run as a passage rather than a siege. The stir, the heading, the chart, departure,
the drift, the fix, the passage, the crossing, landfall, the next horizon. The courts became the
four aboard: the Pilot, someone who knows this water and is not you. The Crew, whoever is aboard
at 0300. The Beacon, the one fixed thing you measure everything else against. The Wake, who you
were, still readable astern. Twenty-two Conditions replace the majors and describe the state of
the whole passage rather than one leg of it: the Tide, the Lee Shore, the Chart That Is Wrong,
the Comfortable Harbour, the Water You Are In.

Five is the card that justifies the whole project. In tarot, every Five is the disruption, and
the obstacle version of it is the refusal: somebody told you no. The drift is a different animal.
The current set you sideways for the whole watch. Your heading never changed and your track did.
You are off course and nothing went wrong.

Set and drift has no villain, and that is exactly why nobody goes looking for it. Every review
structure I have ever sat in is built to find an error, so a quarter that went quietly wrong
with no error in it produces a meeting where everybody agrees the plan was correct. Which it
was. That is the point. You cannot search your memory for the thing that did not happen, so
something outside your head has to put the card down in front of you. That is the entire
argument for owning a randomizer.

## Which line, not what is wrong

There is a second, smaller deck of sixteen approach cards drawn alongside the first, answering a
different question: not what is wrong, but which line to try. The Front Door, the Side Road, the
Long Way Round, the Trade Route, Build the Road, Borrow a Chart, Sail in Company, Wait for the
Tide, the Weather Route, the Narrow Channel. Each one names what that route costs you, because
they are not free and the cost is the part people leave out.

They are drawn blind on purpose. The route you would have picked is the one you already know
about, and it is usually the Front Door.

## Two prices, one of them invisible

Opening a door and living on the other side get priced separately, which sounds obvious and is
not, because from the near side the doorway is the only part you can see. Two questions at the
top of the page put your own door in a 2x2. The Unlocked Door is cheap and cheap: you are
deliberating about something you could simply do. The Gate is costly then cheap, all the
difficulty at the entrance. The Commitment is costly both ways and at least honest about it. The
Trap is cheap to enter and expensive to live in, and almost nobody prices it correctly, because
a Trap and an Unlocked Door feel identical from outside.

The art is generated rather than drawn. A Python script computes each of the twenty-six marks
from the thing it illustrates, standard library only, written in the idiom of a vector tool from
[Island Lab](https://islandlab.dev/). The tide emblem genuinely brackets the interval where the
tide curve clears the sill. Move the sill and the bracket moves.

Afterwards I checked it against the frameworks, mostly expecting to find a mess. It maps close to
one-to-one onto Boyd's OODA loop, with Perception as Observe, Navigation as Orient and Decide,
Paths as the option set and Doors as the committed act. Lynch's wayfinding elements are where the
Paths and Doors split came from, and Gibson's affordances give Perception its spine: a door you
cannot see is still a door. Reassuring. I would have shipped it anyway.
