---
layout: post
title: Experiments Solve Complexity
date: 2026-08-02 09:00:00
categories: [complexity, decisions]
type: article
reviewed_by_sean: false
short_description: A counter-model to the "if you are lost, the answer is education" diagram. When you are lost in a complex situation, more study is the trap. Synthesis shows you the doors; experiments get you through them.
---

There's a diagram going around in three panels. A red tangle of squares: *if you are lost, the answer is education.* A single dashed square: *if you are educated, the answer is execution.* A stack of solid squares: *if you are executing, the answer is consistency.*

Kate and I have an ongoing argument about the first panel. I don't think that first step is true at all.

"I need more information" is the most comfortable sentence in the world when you're lost. It sounds responsible. It postpones everything. And in a genuinely complex situation, the career, the coastline, the group you're trying to work with, it doesn't work, because the information you'd need doesn't exist yet. Nobody has run your case.

What you have instead is local information, and you have more of it than you think. Look at the things around you. The constraints, the people, the half-open doors, the gates you've been reading as walls. See the gates as opportunities. The move is to put together what's already in front of you until the doors show themselves. That's synthesis, and it's a different act from study. Study adds squares to the pile. Synthesis finds the dashed ones you can walk through.

And it's a door, not an objective, because you don't get to just walk straight through it. You don't know how to approach it yet. You don't know the password. You don't know the unlock. The work is figuring out the shape of the door and how it feels, and somewhere in that figuring you realize there were many paths to this area all along. Doors sit within doors within doors.

We're working with a group right now that looks like this. There's something like an opportunity, and eventually we might get to the actual door and walk through. But getting there has been showing up and meeting them, showing up for coffee, showing up again, meetings, care, time, energy, shaping and being shaped, understanding, being with them. That wasn't one door. It was a series of doors, and you don't always know which ones you're already through. Mostly you're trying to understand where you stand.

Then you walk through one. Not all the way, just far enough to learn something. Analysis does not solve complexity. Experiments and tests solve complexity. A complex system doesn't sit still while you model it; the only way to find out what it does is to poke it and watch.

Which is the other problem with "more education": it's a never-ending dive. There's always another book, another course, and none of it asks the questions a small test asks. How do you feel? How does it look? How do they feel? What are the resources? What is the environment doing? You have to get action into the loop, and that's why the small experiments matter so much.

Education still matters. So does the heart, how a door feels when you stand in front of it. But they're feedback, two signals among many that tell you how the last test went and which door to try next. The answer to being lost is to run the next experiment.

So the panels I'd draw:

<svg viewBox="0 0 760 960" role="img" aria-label="Three-panel diagram: if you are lost, the answer is synthesis; if you see doors, the answer is experiments; if you are testing, the answer is feedback" style="max-width: 100%; height: auto; display: block; margin: 2em auto;" xmlns="http://www.w3.org/2000/svg">
  <style>
    .tangle { fill: none; stroke: #c0392b; stroke-width: 4; }
    .faint  { fill: none; stroke: #c0392b; stroke-width: 4; opacity: 0.25; }
    .door   { fill: none; stroke: #16a085; stroke-width: 4; stroke-dasharray: 9 7; }
    .solid  { fill: none; stroke: #16a085; stroke-width: 4; }
    .arrow  { fill: none; stroke: currentColor; stroke-width: 3; }
    .cap    { fill: currentColor; font-family: inherit; font-size: 22px; letter-spacing: 1px; }
    .small  { fill: #16a085; font-family: inherit; font-size: 16px; }
  </style>

  <!-- Row 1: lost -> synthesis -->
  <g>
    <rect class="tangle" x="70" y="60" width="70" height="70" transform="rotate(-8 105 95)"/>
    <rect class="tangle" x="120" y="40" width="70" height="70" transform="rotate(6 155 75)"/>
    <rect class="tangle" x="95" y="110" width="70" height="70" transform="rotate(12 130 145)"/>
    <rect class="tangle" x="150" y="95" width="70" height="70" transform="rotate(-10 185 130)"/>
    <rect class="tangle" x="55" y="130" width="70" height="70" transform="rotate(4 90 165)"/>
    <rect class="tangle" x="130" y="145" width="70" height="70" transform="rotate(-5 165 180)"/>
    <text class="cap" x="130" y="265" text-anchor="middle">IF YOU ARE LOST</text>

    <line class="arrow" x1="300" y1="140" x2="430" y2="140"/>
    <path class="arrow" d="M418 132 L432 140 L418 148"/>

    <rect class="faint" x="500" y="60" width="70" height="70" transform="rotate(-8 535 95)"/>
    <rect class="faint" x="550" y="40" width="70" height="70" transform="rotate(6 585 75)"/>
    <rect class="faint" x="580" y="95" width="70" height="70" transform="rotate(-10 615 130)"/>
    <rect class="faint" x="485" y="130" width="70" height="70" transform="rotate(4 520 165)"/>
    <rect class="door" x="525" y="110" width="70" height="70" transform="rotate(3 560 145)"/>
    <rect class="door" x="600" y="150" width="60" height="60" transform="rotate(-6 630 180)"/>
    <text class="cap" x="590" y="265" text-anchor="middle">THE ANSWER</text>
    <text class="cap" x="590" y="292" text-anchor="middle">IS SYNTHESIS</text>
  </g>

  <!-- Row 2: doors -> experiments -->
  <g>
    <rect class="door" x="80" y="400" width="70" height="70" transform="rotate(-4 115 435)"/>
    <rect class="door" x="165" y="415" width="60" height="60" transform="rotate(5 195 445)"/>
    <text class="cap" x="150" y="540" text-anchor="middle">IF YOU SEE</text>
    <text class="cap" x="150" y="567" text-anchor="middle">DOORS</text>

    <line class="arrow" x1="300" y1="440" x2="430" y2="440"/>
    <path class="arrow" d="M418 432 L432 440 L418 448"/>

    <rect class="door" x="520" y="395" width="80" height="80"/>
    <path class="solid" d="M500 435 C 540 420, 580 450, 620 435"/>
    <path class="solid" d="M610 428 L622 435 L611 443"/>
    <text class="cap" x="590" y="540" text-anchor="middle">THE ANSWER</text>
    <text class="cap" x="590" y="567" text-anchor="middle">IS EXPERIMENTS</text>
  </g>

  <!-- Row 3: testing -> feedback -->
  <g>
    <rect class="solid" x="115" y="690" width="70" height="70"/>
    <text class="cap" x="150" y="830" text-anchor="middle">IF YOU ARE</text>
    <text class="cap" x="150" y="857" text-anchor="middle">TESTING</text>

    <line class="arrow" x1="300" y1="730" x2="430" y2="730"/>
    <path class="arrow" d="M418 722 L432 730 L418 738"/>

    <rect class="solid" x="545" y="690" width="70" height="70"/>
    <path class="arrow" d="M615 700 C 680 680, 680 770, 615 750"/>
    <path class="arrow" d="M624 745 L613 750 L622 759"/>
    <text class="small" x="580" y="660" text-anchor="middle">education</text>
    <path class="arrow" d="M580 668 L580 686"/>
    <path class="arrow" d="M575 679 L580 688 L585 679"/>
    <text class="small" x="490" y="725" text-anchor="end">the heart</text>
    <path class="arrow" d="M498 720 L541 722"/>
    <path class="arrow" d="M533 716 L543 722 L533 728"/>
    <text class="cap" x="590" y="830" text-anchor="middle">THE ANSWER</text>
    <text class="cap" x="590" y="857" text-anchor="middle">IS FEEDBACK</text>
  </g>
</svg>

If you are lost, the answer is synthesis: use everything local until you can see the doors. If you see doors, the answer is experiments: walk through one far enough to learn. If you are testing, the answer is feedback, and education and the heart are two of the signals that come back from each test.

The original diagram gets consistency right and the start wrong. You don't study your way out of lost. You test your way out.
