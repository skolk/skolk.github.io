# _drafts/

Posts in progress. Jekyll only renders these when run with `--drafts`:

```
bundle exec jekyll serve --drafts
```

When a draft is ready to publish, rename it with a `YYYY-MM-DD-` prefix and move it to `_posts/`.

Files in `_drafts/` are still tracked by git — they're "private to the live site," not "private to the repo." For laptop-only scratch, use `.scratch/` (gitignored).
