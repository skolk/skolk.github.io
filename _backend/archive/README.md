# _archive/

Historical / reference material. **Not built by Jekyll**, the leading underscore makes Jekyll skip the directory.

## What lives here
- `squarespace-2024/`, original export from the previous Squarespace site (HTML + images). Source of truth for "what was originally posted" if a current post drifted during restoration. Don't edit.
- `squarespace-2024-docx/`, the same Squarespace site exported as a Word `.docx`, converted to markdown (`SeanAKolk-SquareSpace-2024.md`, ~1100 lines) via pandoc. The `.md` holds the original post **text** and is the worklist for migrating remaining originals into `_posts/`. It is an artifact, not for direct publication. The source `.docx` and its 71 extracted images (`media/`) are kept locally but gitignored (~50MB); only the `.md` is committed.

## Image note (read before re-processing the docx, so we never redo this)
The docx's 71 embedded images (`imageN.jpg`) are **renumbered, re-encoded copies of the same photo set already on the site** in `images/blog_posts/` and in `squarespace-2024/images/`. They match by neither byte hash, filename, nor pixel dimensions (Squarespace re-exported them at different resolutions and renumbered them), so there is no automatic way to dedupe or map them. They were deliberately NOT re-imported. If a post needs one of these photos, find it visually, the file very likely already exists under a different `imageN` number in `images/blog_posts/`. Do not re-extract or re-import the docx media as if it were new content.

## What does NOT live here
- Active planning → `_backend/`
- Drafts → `_drafts/`
- Anything that should render on the site → top-level or `_posts/`
