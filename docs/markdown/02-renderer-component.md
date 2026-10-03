# Step 2 — Shared `<MessageMarkdown />` component

## File

Create the renderer once and share it across the message list (and any future surfaces like search results, notifications, exports):

```
apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/_components/message-markdown.tsx
```

It is a client component (uses `react-markdown`). It receives the raw content string and returns a React tree.

## Responsibilities

- Run the plugin chain (`remark-gfm`, `remark-breaks`, `rehype-sanitize`, `rehype-highlight`).
- Map a small set of element names to safer/styled React components:
  - `a` → opens in a new tab with `rel="noopener noreferrer nofollow"` and a `target="_blank"`; blocks `javascript:` / `data:` schemes at the component level as defense-in-depth.
  - `code` → distinguish *inline* (`code` without a `pre` parent) from *block* (`pre > code`). Inline gets a chip-style background. Block gets the `pre.hljs` frame and a small language tag if present.
  - `pre` → wrap in a scrollable container so long lines don't break message-row layout.
  - `img` → render as plain text (or a small badge with the alt text). Image embeds via Markdown are intentionally disabled — uploaded attachments are the only image surface.
  - `table` → wrap in `overflow-x-auto` so wide tables don't break the row.

## Sanitization schema

Start from `rehype-sanitize`'s `defaultSchema` and tighten it:

- Disallow `iframe`, `script`, `style`, `form`, `input`, `button`, `link`, `meta`.
- Disallow `img` entirely (no remote images for v1).
- For `a`, allow only `href`, `title`. Constrain `href` to `http:`, `https:`, `mailto:` via the URL filter.
- For `code` / `pre`, allow `className` (so `language-xyz` survives for `rehype-highlight`).
- Strip every `on*` attribute (handled by the default schema, but assert it in a unit test).

## Component props

```ts
type MessageMarkdownProps = {
  content: string;
  className?: string;
};
```

No other knobs. If a different surface needs different rendering (e.g. exports), it can build its own wrapper rather than expanding this API.

## Empty / whitespace input

- If `content.trim()` is empty, render nothing (the caller already guards on this).
- Trim trailing whitespace but **not** internal whitespace — line breaks matter.

## Memoization

Wrap the component body in `React.memo` keyed on `content` so re-renders of the surrounding message row (hover state, edit toggle) don't re-parse Markdown. The message list can have hundreds of items.

## Smoke test fixtures

Keep a small fixture string for manual verification:

```text
**bold** *italic* ~~strike~~ `inline`

> a quote line
> a second quote line

1. one
2. two
   - nested
   - with `code`

```ts
const x: number = 1;
console.log(x);
```

[click me](https://example.com) and https://autolink.example
```

This is also the seed for the unit tests in step 7.
