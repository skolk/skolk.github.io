# _backend/talks/

Raw **talk files**: the voice-to-text dictation each post was shaped from, kept verbatim as the
source of truth. One talk file per post, named to match the post (`YYYY-MM-DD-slug.md`).

A talk file is the BACK-END source for a FRONT-END `_posts/` file. It holds:

- **Raw talk**, the unedited dictation (verbatim, artifacts and all).
- **Needs check**, the open items: garbled names, uncertain facts, personal-filter calls.
- **Resolved**, the facts locked down.

Front matter links the two and tracks state:

```
---
post: _posts/YYYY-MM-DD-slug.md
title: ...
recorded: YYYY-MM-DD
source: voice-to-text
status: needs-check | checked
---
```

## Workflow

1. Dictate on a walk (the `/morning` assignment is the prompt).
2. The talk lands here as a talk file: raw dictation + a **Needs check** list.
3. The post gets shaped in `_posts/` from the talk, cleaned to `SKOLK_VOICE.md` and the 36 rules.
4. **Check:** answer the Needs-check items, fold the confirmed facts into the post.
5. When the check is clear, set `status: checked` here and `reviewed_by_sean: true` on the post.

The talk file is the paper trail: it shows what was actually said, so a later reader (or Claude)
can tell edited-for-style from invented, and can see which facts were confirmed versus guessed.
Not built by Jekyll (leading underscore).
