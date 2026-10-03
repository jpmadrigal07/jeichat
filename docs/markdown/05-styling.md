# Step 5 — Styling

## Goal

Make rendered Markdown look at home inside a chat message row: tight vertical rhythm, restrained typography, no oversized headings, code that pops without dominating.

Do **not** use `@tailwindcss/typography` (`.prose`) out of the box — it's tuned for long-form articles and adds too much vertical space for chat. We define a small set of utilities and apply them at the `<MessageMarkdown />` root.

## Approach

1. Add a single CSS class block in `apps/web/app/globals.css` (or a sibling chat-specific stylesheet) named `.md-chat`. It targets descendants and overrides browser defaults.
2. Import one highlight.js theme CSS file in `globals.css` (e.g. `highlight.js/styles/github-dark.css`). Pick light or dark to match the app theme; we can swap per theme later.
3. Apply `className="md-chat"` to the wrapper `<div>` returned by `<MessageMarkdown />`.

## Rules (sketch — refine during implementation)

```css
.md-chat {
  /* Tight chat rhythm */
  line-height: 1.45;
}
.md-chat > :first-child { margin-top: 0; }
.md-chat > :last-child  { margin-bottom: 0; }

.md-chat p { margin: 0; }                     /* paragraphs sit flush */
.md-chat p + p { margin-top: 0.25rem; }       /* small gap between paragraphs */

.md-chat h1, .md-chat h2, .md-chat h3,
.md-chat h4, .md-chat h5, .md-chat h6 {
  font-weight: 600;
  font-size: inherit;                          /* no oversized headings in chat */
  margin: 0.25rem 0;
}

.md-chat a {
  color: hsl(var(--primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
.md-chat a:hover { text-decoration-thickness: 2px; }

.md-chat code:not(pre code) {
  background: hsl(var(--muted));
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  font-size: 0.9em;
}

.md-chat pre {
  background: hsl(var(--muted));
  border-radius: 0.375rem;
  padding: 0.625rem 0.75rem;
  overflow-x: auto;
  font-size: 0.85em;
  margin: 0.375rem 0;
}

.md-chat blockquote {
  border-left: 3px solid hsl(var(--border));
  padding-left: 0.625rem;
  color: hsl(var(--muted-foreground));
  margin: 0.25rem 0;
}

.md-chat ul, .md-chat ol {
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.md-chat li + li { margin-top: 0.125rem; }

.md-chat table {
  border-collapse: collapse;
  font-size: 0.9em;
}
.md-chat th, .md-chat td {
  border: 1px solid hsl(var(--border));
  padding: 0.25rem 0.5rem;
}

.md-chat hr {
  border: 0;
  border-top: 1px solid hsl(var(--border));
  margin: 0.5rem 0;
}
```

Tweak values during the visual pass — these are starting points.

## Code block frame

Inside `<MessageMarkdown />`, wrap `<pre>` in an outer `<div className="md-chat-pre-wrap">` if we want a language tag badge in the top-right corner. Hold off until we see how often users actually use fenced code in real conversations.

## Long lines

`pre { overflow-x: auto }` keeps wide code from blowing out the row. Inline code never wraps — that's fine for chat-length snippets.

## Theme

If the app supports a dark mode toggle, swap the highlight.js theme accordingly. Two options:

1. Import both themes and gate via a `[data-theme="dark"]` selector.
2. Use CSS variables for the highlight palette and define them per theme.

Start with one theme that matches the current dominant scheme; refine when theme switching becomes user-facing.
