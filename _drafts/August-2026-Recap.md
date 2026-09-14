---
layout: post
type: recap
title: August 2026 Recap
date: 2026-08-31
location: "Seattle, WA"
categories: [sailing, making, community]
reviewed_by_sean: false
needs_review: true
short_description: "The first month in one place since May. Filling a tall ship one person at a time, three consulting conversations that turned Island Lab into a business, and a run of small tools built in the mornings and written up before lunch."
---

> Make me useful to my friends, rather than agreeable.
>
> [Crates of Thebes](https://en.wikipedia.org/wiki/Crates_of_Thebes)

August was the first month since April spent in one place. No flights, no ferries, the boat at Shilshole and a desk at [9zero](https://9zero.com/) when the boat got too small. The month had three jobs written at the top of the page: fill the *Adventuress* trip, propose one piece of work a week to a new team, and run every other day. Two of the three happened. The one that did not is the one that took the least time, which is its own lesson.

## The Salish Voyage

- **Filling the ship, one person at a time**: the September trip aboard the tall ship *Adventuress* ([Sound Experience](https://www.soundexp.org/)) needed twenty people, and July's lesson held: individuals, not groups. Every batch of invitations went out as a message to one person, with the reason I wanted them aboard and a question about what was stopping them. Mid-month the count stood at six confirmed, four on scholarship, and ten maybes. By the end of the month the scholarship fund was spent, the crew was close to full, and the work had turned into the unglamorous half: final payments, trip insurance from an office in Tacoma, and a carpool list for Port Townsend. Two or three berths remain as I write this. Details at [islandlab.dev/salish26](https://islandlab.dev/salish26).
- **What a filled boat taught me**: the posts and the page brought applicants, and the follow-up to each applicant is what brought crew. A public post is the net. The conversation afterward is the catch.

## Around the Sound

- **Salt Spring Island**: Kate and I went up mid-month, stayed with friends, and looked at houses with the Island Lab base in mind. We came back with a different idea. Salt Spring is not a place to buy into so much as a reference: an island community that already works, with a Saturday market, a bench of makers, and a ferry economy that shapes what people build and how they trade. A base learns from it rather than moves there. What we want, hosting residents and events, running experiments, staying maintainable, looks less like a property and more like a rotating program: chartered boats, borrowed spaces, and a calendar. The tall ship in September is the first version of that.
- **Working off the boat**: 9zero in the mornings turned out to be the fix for a lot of things. The boat is a fine place to live and a poor place to make calls.
- **Boat work**: the bonding system is corroding faster than it should, so a galvanic isolator went on the list and then onto the boat. The solar panel came off the car roof, where it had been living since the road trips, and is headed for the dodger. A paddle board run down to the Ballard Locks, a hot dog party sail out of Shilshole, and a hike-and-sail weekend penciled in for Labor Day.
- **Running**: the plan was fifteen minutes every other day, building toward a 10k by the end of the month, and the 10k happened, around Shilshole and Golden Gardens. A January ski trip is on the calendar, and Kate floated a sail-and-ski trip for my 40th next spring, which is the kind of goal that gets a person out the door.

## Projects

- **Island Lab LLC**: Island Lab LLC formed in Washington this summer: the charterer for the Adventuress trip, and the home for the contract work. Three partner conversations this month, and one of them became a signed contract. The signed one is a coastal project that needs to find its first real capital, and my job is the outreach: who funds this shape of thing, and what do they need to see. The second is a global resilience framework with a partner who wants maps and a working demo before anything else, and where the conversation has drifted toward co-founding rather than contracting. The third was a group that wanted a contract I probably do not have time for, so the answer was to price it high enough that a no would be easy. The rule I wrote down at the end of the month: priority goes to the contracts you signed, not the ones you hope for.
- **What a lender actually asks**: a friend who has raised project finance walked me through the questions. Is this equipment or is this a project? If there is no balance sheet, nobody lends against the team. What is the cost breakdown, how many people, and what is the offtake agreement worth? Capital that only pays for equipment gets equipment financing, with all its terms. The pitch has to answer those questions before anyone will make the introduction, and my job for September is to make the project look exactly as risky as it is and no riskier.
- **Pollica, the protocol**: the write-up of the protocol half of the [Pollica work](https://islandlab.dev/pollica.html) with the [Future Food Institute](https://www.futurefoodinstitute.org/) continued, along with a deck for Sara Roversi to carry into her meetings. I am writing the protocol by hand, no AI, on purpose. Some documents need to be slow. The next step is grant applications: funding to put the sensors, the sonar, and the photogrammetry into the hands of the people who live there, with Island Lab as the vehicle when the protocol travels to the next town.
- **Community mesh networks**: a research thread that opened this month and will not close: the [Athens Wireless Metropolitan Network](https://en.wikipedia.org/wiki/Athens_Wireless_Metropolitan_Network), [guifi.net](https://guifi.net/) in Catalonia, [Freifunk](https://freifunk.net/) and [Funkfeuer](https://www.funkfeuer.at/) in the German-speaking world, the [Chaos Computer Club](https://www.ccc.de/). Community-run infrastructure that outlived the companies around it. Relevant to an island base, and to what a coastal community can own for itself.

## Tools

August mornings went to small tools, each built for the thing that was bugging me that week and written up before lunch. Writing them up turned out to be the useful half: the write-up is where the next project gets picked.

- **[netmeter]({{ '/projects/netmeter/' | prepend: site.baseurl }}) grew up**: the per-app data meter for the hotspot got a throttle for the apps a freeze would ruin, a Pause All mode that replaced the old Solo mode, a stacked chart of who spent what over the last hour, and a watchdog for the daemon, because a wedged meter looks exactly like a quiet network. The bugs this month were all bookkeeping: what did I stop, is it still stopped, and does anything still want it that way. One of them had been quietly freezing the wrong app for four days. The [page]({{ '/projects/netmeter/' | prepend: site.baseurl }}) has the whole list.
- **[micmeter]({{ '/projects/micmeter/' | prepend: site.baseurl }})**: netmeter's sibling for the microphone, built for dictating drafts in cafes. Two rows of bars in the menu bar, the raw mic and the mic through Apple's voice filter, so you can see whether Voice Isolation is removing the espresso machine or transcribing it. The interesting bug was in firmware: a USB conference speaker that flips itself into speakerphone mode the moment anything opens its mic, eating the bass out of whatever is playing.
- **[Seventy-Eight Cards]({% post_url 2026-08-24-Seventy-Eight-Cards %})**: my first tarot deck came into my life by way of Salt Spring, and an evening of drawing cards with friends made the case for it: a specific prompt gets a better conversation out of people than an abstract one. Specificity is what people need. That sent me into the arcana, and then into building the deck in the browser as a randomizer with a vocabulary attached, for facilitation rather than divination. The surprise was that fifty-six of the cards are a two-axis system you can learn in ten minutes.
- **[Doors]({% post_url 2026-08-25-Wrong-Without-an-Error %})**: a second deck on the same engine, grown out of an idea Kate has been chewing on: how we think about where we are, where we are going, and where we have been. It forces a second reading of a situation you have already read once. The best card in it is the one for being off course when nothing went wrong.
- **A banjo practice room**: a single-file page that lives in the back end of this repo, with the tunes I am working on, seven ways to work at each one, and a log of every session. Built on the last day of the month because the practice I skip is the one where I have to decide what to practice first. Two songs are solid, three more are in pieces, and the goal is five by the tall ship. Write-up coming.
- **[Contact page]({{ '/contact' | prepend: site.baseurl }})**: the site got a contact page that shows the address on a click instead of printing it, so the harvesters that read the repo get nothing.
- **[Experiments Solve Complexity]({% post_url 2026-08-02-Experiments-Solve-Complexity %})**: not a tool, but the article that came out of building them. When you are lost in a complex situation, more study is the trap. Synthesis shows you the doors; experiments get you through them.

## Threads that kept showing up

- **Useful, not agreeable**: the Crates line at the top. The best thing I did for anyone this month was to tell them what was stopping their project from getting funded.
- **Individuals, not groups**: July's lesson, confirmed with a boat.
- **Specific over abstract**: the tarot evening and the Doors deck are the same finding from two sides. People do not need a bigger idea. They need a specific one to push against.
- **The signed work first**: the contracts you have, not the ones you hope for.
- **A tribe helps you move**: a friend on Salt Spring changed her whole shape in a year because she found a group that trains every day. The question for me is what that looks like for a run or a gym: it looks like breakfast and contribution.
- **Three projects, no more**: morning training, daily creative work from nine to four, and evening maintenance on the boat. Everything else waits.
- **Analog for a bit**: the honest note at the end of the month was that podcasts and the scroll had become the habit, and that a fast tool can become an excuse for sloppy work. The fix is not less building. It is writing down what needs doing, by hand, and walking through it before opening anything.

## Reading

- [*Consilience*](https://www.goodreads.com/search?q=Consilience+E.O.+Wilson), E.O. Wilson (started in earnest): this one is going to take a while, and it is the right time for it.
- [*Against Progress*](https://www.goodreads.com/search?q=Against+Progress+Zizek), Slavoj Žižek (continuing): still hysterical, still concerning.
- [*A Field Guide to the Apocalypse*](https://www.goodreads.com/search?q=A+Field+Guide+to+the+Apocalypse+Athena+Aktipis), Athena Aktipis (one sitting left): carried since June. Finishing it is the first item on September's list.
- [*The Tainted Cup*](https://www.goodreads.com/search?q=The+Tainted+Cup+Robert+Jackson+Bennett) and [*A Drop of Corruption*](https://www.goodreads.com/search?q=A+Drop+of+Corruption+Robert+Jackson+Bennett), Robert Jackson Bennett (finished): the Ana and Din books, a detective pair in an empire held together by biology. Read them back to back. He is now three for three with me.

## Upcoming

- The Salish Voyage aboard *Adventuress*, September 17 to 20, out of Port Townsend ([a few berths left](https://islandlab.dev/salish26))
- Labor Day: a sail and a summit
- NY Climate Week, late September, with a partner to announce
- October: Los Angeles
- December: Tierra del Fuego
- January: skiing. Spring: a sail-and-ski trip for the 40th
- **A year out**: a second tall ship trip planned and profitable, forty kilometers of running in steps of five, ten, twenty, thirty, forty, twelve songs by memory, part of an international team deploying projects, and a quarterly event I organize. Written down at the end of August so I can check it at the end of next August.

## Links

- [Island Lab](https://islandlab.dev), coastal resilience R&D, now an LLC and a consulting practice
- [islandlab.dev/salish26](https://islandlab.dev/salish26), the Salish Voyage, September's four days aboard *Adventuress*
- [Sound Experience](https://www.soundexp.org/), who operate the *Adventuress*
- [9zero](https://9zero.com/), where the calls get made
- [Future Food Institute](https://www.futurefoodinstitute.org/), our partners for the Pollica work
- [Crates of Thebes](https://en.wikipedia.org/wiki/Crates_of_Thebes), the Cynic with the line at the top
