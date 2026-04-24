# Example Page

This is a demo of the md-site aesthetic: monospace, minimal, and the rendered
page looks like the raw `.md` source — but links are clickable, headers are
darker, and tables align.

[Home](/) · [About](/about.md) · [Projects](/projects.md)

## What you get

- Geist Mono font, light and dark mode out of the box
- A centered 52rem column
- Raw markdown syntax hidden from sighted users via `.sr` spans
- Real `<table>` elements so columns align

## Links and emphasis

Text can be **bold** or *italic*, and inline `code` renders in monospace.
Read more on [the Vercel Community page](https://community.vercel.com/live.md).

## A table

| Project | Status | Date |
| --- | --- | --- |
| ## Shipped |  |  |
| [md-site](/projects/md-site.md) | stable | 2026-04-24 |
| [no-slop](/projects/no-slop.md) | stable | 2026-03-12 |
| ## Drafts |  |  |
| [next-thing](/projects/next.md) | draft | 2026-05-01 |

## A fenced code block

```
# build one page
uv run scripts/build.py input.md output.html

# pipe to stdout
uv run scripts/build.py input.md --title "Home"
```

> Quotes render with the `>` marker visible as monospace, keeping the
> markdown-source feel.
