# Step 1 — Library choice and install

## Decision

Use **react-markdown** as the renderer with this plugin chain:

| Plugin | Type | Purpose |
|---|---|---|
| `remark-gfm` | remark | GitHub-Flavored Markdown: tables, strikethrough, task lists, autolinks |
| `remark-breaks` | remark | Convert single `\n` to `<br />` (Slack/Discord-style soft breaks) |
| `rehype-sanitize` | rehype | Allowlist-based HTML sanitization (XSS guard) |
| `rehype-highlight` | rehype | Syntax highlighting for fenced code blocks via highlight.js grammars |

Rationale:
- `react-markdown` is widely used, React-first (no `dangerouslySetInnerHTML`), and renders to a React tree we can style and intercept (e.g. custom link component).
- `remark-gfm` gives us the formatting set users expect from any modern chat product.
- `remark-breaks` matches chat UX expectations — without it, a single `\n` becomes a space and users lose line breaks.
- `rehype-sanitize` runs at the HAST layer **after** plugins, so any HTML smuggled through Markdown (`<script>foo</script>` literally typed) is stripped.
- `rehype-highlight` is small (vs. Prism + theme), themable with a single CSS file, and works without runtime config.

## Install

From the monorepo root (`bun` only — never npm/npx):

```bash
cd apps/web
bun add react-markdown remark-gfm remark-breaks rehype-sanitize rehype-highlight
bun add -D @types/hast
```

Notes:
- `react-markdown` ships its own types.
- `rehype-highlight` bundles highlight.js grammars; we'll import a single theme CSS in `globals.css` (see step 5).
- Do NOT pull `dompurify` — `rehype-sanitize` operates on the HAST tree and is the right tool for a React-rendered pipeline.

## Verify

After install, confirm the dev server still boots:

```bash
bun run dev
```

The frontend should compile with no new warnings. We won't render anything yet — step 2 builds the component.

## Bundle budget

Run a production build before and after to confirm the delta is acceptable:

```bash
cd apps/web && bun run build
```

Target: < ~80 KB gzipped added to the chat route. If `rehype-highlight` pushes us past budget, fall back to importing only a curated subset of languages from `lowlight` and wiring it manually — but only if the budget is breached.
