# The 36 rules for writing

Source: "My Kit Bag: Rules for Writing", shapesoftruth.com
(<https://www.shapesoftruth.com/my-kit-bag-rules-for-writing>).

The checklist Sean writes and edits against. The `editor` agent and `/editor` / `/morning` read this
and self-check drafts against it before handing anything back. Captured from Sean's paste; two spots
are flagged below where the paste came through incomplete, restore from the source when convenient.
Em-dashes in rules 21 and 26 were normalized to commas per the site-wide em-dash ban (`CLAUDE.md`).

## The rules

1. **USE STRONG VERBS:** Replace weak verbs, which are imprecise (walked, stood), with strong verbs, which are specific to the action described (trudged, malingered).
2. **QUESTION BEING AND HAVING:** The verbs "to be" and "to have" are the weakest of all verbs; by nature static, they slow a narrative.
3. **KEEP IT ACTIVE:** Pay attention to words that end in 'ed or 'en and are preceded by a form of "to be," and watch out for -ing endings; try flipping the sentence to get it more active.
4. **STICK WITH SAID:** When attributing a quote, "said" is the default verb; the reader's attention is on who said it, not how it was said.
5. **DON'T SHOW OFF:** Let others be erudite; your job is to befriend your reader.
6. **PREFER ANGLO-SAXON WORDS:** Favor shorter, punchier Anglo-Saxon words (crash, hurl), over fancy, abstract Latinate words (collision, propel).
7. **SOUND NATURAL:** Unless you're writing a technical manual, keep your language conversational and use modern speech patterns.
8. **TRUST YOUR VOICE:** Your natural voice has its own tempo, pitch, ease, and overall sound; let it ring out.
9. **QUESTION TRANSITIONS:** Transitional phrases (then, next, when, meanwhile, however) are not needed unless a gap in time or logic has opened.
10. **LINK SENTENCES WITH SEMICOLONS:** If two sentences are tightly linked, and one progresses from the other, consider separating them with a semicolon.
11. **DROP "VERY" AND OTHER CRUTCH WORDS:** The word "very" seldom improves a sentence.
12. **JETTISON [ALL THOSE] TINY WORDS:** Remove the clutter of short words (pronouns, prepositions, connectors).
13. **DRESS UP "THIS":** Pronouns are hard for readers to follow, especially "this" and "it."
14. **REMOVE THE BORING STUFF:** Spend less time defending what you've written, and more time revealing the truth.
15. **REFRESH YOUR WORDS:** Don't repeat a distinctive word unless you must.
16. **KNOW YOUR WORDS INSIDE AND OUT:** Examining t useful to your writing. *[paste truncated, restore the full sentence from the source]*
17. **STAY IN TUNE:** The better word is both precise and unnoticed; a thesaurus is your book of magic spells.
18. **FIND THE HIDDEN METAPHOR:** Metaphors mirror humdrum experiences through elegant comparison; in the hands of an expert, they both illuminate and offer depth of field.
19. **TWIST CLICHES:** We already think in cliches; you owe it to your reader's search for novelty to remove or deconstruct your hackneyed phrases.
20. **KNOCK THREE TIMES:** For a series of terms to land, you usually need three.
21. **STRETCH OUT:** Long sentences require attention to detail, conjunctions, and rhythm, and a payoff at the end.
22. **SHORT SELLS:** Interrupt lyrical or otherwise long passages with an abrupt, short sentence.
23. **GIVE YOUR SENTENCE A FINALE:** Even if you begin your sentence with a punch, end it stronger.
24. **CRYSTALLIZE YOUR DIALOGUE:** Dialogue needs to be as zippy and economical as the rest of the book.
25. **IN FICTION, ARCHETYPE YOUR CHARACTERS:** Below the human stereotypes are psychological patterns that readers intuitively expect.
26. **SHOW, THEN TELL:** Begin with the concrete, what happened, and after, when appropriate, riff on judgment of the consequences.
27. **GIVE THEM A HERO'S WELCOME:** Start off by telling the reader who to root for.
28. **ONCE IS ENOUGH:** Keep your first description of a character or place distinctive enough that you aren't tempted to add to it later.
29. **SMELL THE ROSES:** Sight is only one of five senses; let your readers also enjoy touch, sounds, smell, and taste.
30. **DON'T FILTER:** Don't point out that someone is thinking, opining, or experiencing what is already happening on the page.
31. **TRUST YOUR READER:** Your reader will fill in the gaps; you only need to be complete enough.
32. **LAYER YOUR SENTENCES:** Sentences convey more than information; their other purposes must be tended.
33. **WRITE THE HARD STUFF:** Don't shy from the big mysteries of life.
34. **BREAK THE RULES:** A rule may be of universal use, but need not be universally used.
35. **FINISH THE DAMN THING:** Your job is to complete the project; the final quality and consequences are not yet your business.
36. **WORSHIP (TALENTED) EDITORS:** Writing is collaborative, and editors save your skin.

## The rules that most catch skolk's habits

Cross-referenced with `SKOLK_VOICE.md`, these are the ones the editor should lean on hardest:

- **Logbook with no thesis** (the recurring weak spot): 26 (SHOW, THEN TELL), 14 (REMOVE THE BORING STUFF), 31 (TRUST YOUR READER). Lead with the point, let the day-by-day be evidence.
- **LLM-puff / showing off**: 5 (DON'T SHOW OFF), 11 (DROP "VERY"), 12 (JETTISON TINY WORDS), 19 (TWIST CLICHES).
- **Dictation fog** (voice-to-text leaves vague pronouns and run-ons): 13 (DRESS UP "THIS"), 3 (KEEP IT ACTIVE), 9 (QUESTION TRANSITIONS).
- **Lean into existing strengths**: 1 (STRONG VERBS), 6 (ANGLO-SAXON WORDS), 29 (SMELL THE ROSES, his trips are sensory) and 8 (TRUST YOUR VOICE), 7 (SOUND NATURAL).
- **Cadence / decaying trip reports**: 35 (FINISH THE DAMN THING). Ship it before the memory fades.
- **The editor itself**: 36 (WORSHIP TALENTED EDITORS), this whole pipeline is rule 36 in practice.

## How the editor uses these

- After drafting (or before calling a piece ship-worthy), run the draft against each rule and report which it violates, with the offending line. Treat it as a hard craft check, the way `bin/lint` is a hard check on house style.
- Rule 34 is the escape hatch: a violation can be deliberate. Flag it, don't auto-"fix" a choice Sean made on purpose.
- If a rule conflicts with `SKOLK_VOICE.md`, surface the conflict for Sean rather than silently picking one.
