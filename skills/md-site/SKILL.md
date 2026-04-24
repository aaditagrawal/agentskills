---
name: md-site
description: Build websites that look like raw `.md` files but render with proper formatting on the web. Use when the user wants a minimal markdown-aesthetic site in the style of community.vercel.com/live.md, llms.txt pages, Karpathy-style plaintext sites, or asks for "markdown that renders on the web", "website from markdown", "plaintext website", "monospace site", "serve .md as HTML", or "sites that look like markdown source". Produces HTML where markdown syntax (brackets, pipes, hashes) is visually hidden but preserved for screen readers.
metadata:
  version: 1.0.0
---

# md-site

Build websites that look like their `.md` source but work as real HTML.
Sighted users see monospace text with subtly styled links, headings, and
tables. Screen readers and `view-source` see the original markdown intact.

Reference style: [community.vercel.com/live.md](https://community.vercel.com/live.md).

## When to use

Trigger on any of:
- "Make a website that looks like a `.md` file"
- "Render markdown as HTML but keep it looking like plaintext"
- "llms.txt-style site", "Karpathy-style page", "Vercel live.md style"
- "Monospace markdown site", "plaintext website", "serve .md on the web"

Do **not** use for: general documentation sites (prefer MkDocs / Docusaurus),
rich blogs with images and varied typography, or anything that needs
semantic `<h1>`/`<h2>` for SEO — this style intentionally keeps headings
as styled spans inside a `<pre>` to preserve the markdown-source look.

## Core idea

Keep the markdown syntax **visible** (`#`, `|`, `[`, `](`, `)`, `` ` ``, `*`)
but wrap each syntax character in `<span class="sr">` — a visually-hidden
span. Sighted users see `Home · About` as styled links; screen readers
read `[Home](/) · [About](/about)`; view-source looks like a markdown file.

Other rules:
- Monospace throughout (Geist Mono), 14px, line-height 1.6
- Centered 52rem column, 2rem vertical padding
- Light mode: `#6e6e6e` on `#fff`. Dark mode: `#8f8f8f` on `#0a0a0a`
- Headings use `.h` class (darker `#171717` / `#ededed`), **not** real `<h*>` tags
- Links use `oklch(73.08% .1583 248.133)` — Vercel's signature blue
- Body content lives inside `<pre>` with `white-space: pre-wrap`
- Tables are real `<table>` elements so columns align

## How to use

1. Start from `assets/template.html` — it has the full CSS. Replace `{{TITLE}}` and `{{BODY}}`.
2. Transform the user's markdown into the body HTML using the rules below.
3. Wrap normal content in a single `<pre>...</pre>`. Flush the `<pre>`, emit a `<table>`, then open a new `<pre>` for following content.

`assets/example.md` shows every element; `assets/template.html` has the CSS.

## Transformation rules

Always HTML-escape `&`, `<`, `>` in text content first. The `.sr` spans wrap raw markdown characters — they are invisible on screen but readable by screen readers. Never omit them; they are what makes the page look like plaintext.

### Inline

| Markdown | HTML |
| --- | --- |
| `[label](url)` | `<span class="sr">[</span><a href="url">label</a><span class="sr">](url)</span>` |
| `**bold**` | `<span class="sr">**</span><strong>bold</strong><span class="sr">**</span>` |
| `*italic*` | `<span class="sr">*</span><em>italic</em><span class="sr">*</span>` |
| `` `code` `` | `<span class="sr">` `` ` `` `</span><code>code</code><span class="sr">` `` ` `` `</span>` |

Same pattern for `__bold__` and `_italic_`. Process code spans first, then links, then bold, then italic — so emphasis inside link labels still renders.

### Block elements (inside `<pre>`)

- **Headings** `# Title` → `<span class="h"># Title</span>` (keep the `#` characters visible; only the wrapping span changes)
- **List items** `- item` → `<span class="sr">-</span> item` (same for `*`, `+`, and `1.`)
- **Blockquotes** `> text` → `<span class="sr">&gt; </span>text`
- **Horizontal rules** `---` → wrap the whole line in `<span class="sr">---</span>`
- **Fenced code blocks** — emit `<span class="sr">```</span>` on its own line, then `<code>…escaped body…</code>`, then closing `<span class="sr">```</span>`
- **Plain paragraphs / blank lines** — pass through as-is (the `<pre>` preserves them)

### Tables (real `<table>`, not inside `<pre>`)

Detect by a `|---|---|` separator line on the second row. Render:

```html
<table>
  <tr>
    <th><span class="sr">|</span> Header1</th>
    <th><span class="sr">|</span> Header2 <span class="sr">|</span></th>
  </tr>
  <tr class="sep"><td colspan="2"><span class="sr">| --- | --- |</span></td></tr>
  <tr>
    <td><span class="sr">|</span> cell1</td>
    <td><span class="sr">|</span> cell2 <span class="sr">|</span></td>
  </tr>
</table>
```

- First cell of each row gets a leading `<span class="sr">|</span>`
- Last cell gets a trailing `<span class="sr">|</span>` too
- A row with all-empty cells uses `<tr class="blank">` (adds one line of vertical space)
- A row whose first cell is a markdown heading (e.g. `## Shipped`) — render that cell as `<span class="h">## Shipped</span>` to create an in-table section label (Vercel uses this pattern)

### Escaping inside `<code>`

HTML-escape the contents of `<code>` blocks (both inline and fenced). Do not apply inline-markdown transformations inside code.

## Processing order (for a full document)

1. Read line by line, maintain a `pre_buffer` list.
2. On a fenced-code opener, collect lines until the closer; emit as a `<code>` block inside the pre buffer.
3. On a table header + separator, flush `pre_buffer` into a `<pre>`, emit the `<table>`, then restart the buffer.
4. On any other line, transform per the rules above and append to the buffer.
5. At EOF, flush the buffer into a final `<pre>`.
6. Inject the assembled blocks into `{{BODY}}` of `assets/template.html`. Pick `{{TITLE}}` from the first H1 or a caller-provided title.

## Multi-page sites

Produce one HTML file per markdown file. Keep link hrefs pointing at `.md`
paths (as Vercel does) if you want to serve both raw markdown and rendered
HTML from the same URL — configure the host to rewrite `/foo.md` → `/foo.html`
for browsers and keep raw `.md` for `curl`. Vercel `vercel.json` rewrites or
Cloudflare Pages `_redirects` handle this in one line.

## Customization

- Swap the font-family string in `template.html` — any monospace works
- Change the accent color in the two spots in the CSS (light and dark)
- Adjust `.container { max-width }` for wider or narrower columns
- Do **not** remove the `.sr` class — it is load-bearing for accessibility

## Files

- `assets/template.html` — HTML skeleton with the full CSS, with `{{TITLE}}` and `{{BODY}}` placeholders
- `assets/example.md` — reference input demonstrating every supported element

## Why not a real markdown renderer?

A normal `markdown → HTML` pipeline produces `<h1>`, `<p>`, `<ul>`, etc.
That loses the plaintext-source feel. This skill keeps the raw syntax
*visible as text* and only uses real HTML elements for interactive or
layout-critical things (`<a>` for links, `<table>` for column alignment,
`<code>` for inline code styling). The result: a page that reads like
a `.md` file but behaves like a website.
