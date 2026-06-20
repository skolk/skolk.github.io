---
description: A morning writing assignment for skolk.github.io. Pairs a trip report (the material) with an idea (the theme) into a walk-and-talk prompt with talking points and a picture to find. Paste back the voice-to-text transcript and it converts into a reviewable draft in _drafts/. Never publishes.
---

# /morning

Generate Sean's morning writing assignment, or convert the transcript he brings back. The shape of
the practice: Sean walks and talks an idea aloud (voice-to-text), then that raw transcript becomes a
draft he reviews, edits, and adds a picture to. Your job is to give him a good thing to talk about,
and later to turn the talking into a piece, without inventing or publishing anything.

## Read first

- `_backend/EDITORIAL_QUEUE.md` + `./_backend/bin/ondeck` (what's on deck, what's decaying).
- `_backend/SKOLK_VOICE.md` (his voice + how to handle dictation) and `_backend/WRITING_RULES.md`
  (the 36 rules). Both are required before drafting.
- `_backend/IMAGE_GAPS.md` (the picture to assign), `_backend/VISION.md` + `_backend/REFERENCE_SITES.md`
  (the 100r / craigmod bar).
- The candidate trip report's own post file for the real material.

## Mode A — generate the assignment (default)

1. **Pick the material:** one trip report from the queue, preferring high Ready and high Decay (write
   it before the memory fades). Respect Sean's stated energy / `Want` if set.
2. **Pick the theme:** one idea to talk *about*, the transferable hook a stranger reads for. Pull it
   from the trip's natural thesis or from `## Parked ideas`. The piece is the theme; the trip is the
   evidence. (Example: theme = "making irreversible decisions with incomplete information"; material
   = the Alaska tide gates.)
3. **Hand him the assignment**, short enough to read before walking out the door:

   ```
   MORNING ASSIGNMENT — <date>

   TALK THROUGH:   <the idea, one line>
   USING:          <the trip report, as the material>
   THE POINT:      <one-sentence thesis a stranger would read for>

   TALKING POINTS (riff on these in order, ~10-15 min of walking):
     1. <opening: the concrete scene that drops us into the place>
     2. <the moment the idea showed up>
     3. <the decision / tension / turn>
     4. <what it cost, what it taught, the honest part>
     5. <the wider so-what, where this touches a reader's life>

   PICTURE TO FIND: <the specific hero shot, subject or location>
   TARGET: one idea, ~800-1500 words. Logbook only as evidence for the point.
   ```

4. Keep it to one assignment. Don't stack three. If nothing is ready, say so and suggest a fast-ship
   alternative instead of forcing a weak pairing.

## Mode B — convert the transcript

When Sean pastes back his voice-to-text:

1. **Clean dictation artifacts** (homophones, run-ons, missing punctuation) per `SKOLK_VOICE.md`.
   Keep his actual words and rhythm. Add nothing he didn't say; flag garbled facts, don't guess.
2. **Shape it:** lead with the framing paragraph (the thesis), then the material as evidence. One
   idea. House style (no em-dash, label-colons, comma attributions).
3. **Self-check** against `_backend/WRITING_RULES.md` (the 36 rules) and the LLM-puff ban in
   `SKOLK_VOICE.md`. Report any rule it bends.
4. **Write it to `_drafts/`** (`YYYY-MM-DD-Title.md`) with full front matter, `reviewed_by_sean: false`,
   and an inline `<img>` placeholder line that names the picture to add (commented if the file isn't
   in yet, so it doesn't trip lint). Never write to `_posts/`. Never commit.
5. Hand it back with: the draft path, the one gap to publishable, and the picture to add.

## Rules

- Read-only except the one draft you write in Mode B (to `_drafts/` only).
- No publishing, no commits, no edits to existing posts.
- The assignment is a prompt, not a script. Sean talks; you don't write the piece for him in Mode A.
