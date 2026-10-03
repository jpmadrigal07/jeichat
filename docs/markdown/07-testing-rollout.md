# Step 7 — Testing and rollout

## Manual test matrix

Run against the channel view with two users in the same workspace (sender + viewer) so socket round-trips are exercised.

### Golden path — formatting renders

| Input | Expected render |
|---|---|
| `**bold**` | bold text |
| `*italic*` or `_italic_` | italic text |
| `~~strike~~` | strikethrough |
| `` `inline` `` | inline code chip |
| Triple-backtick block with ` ```ts ` fence | code block, monospace, syntax-highlighted, scrolls horizontally if wide |
| `> quote` | blockquote with left border |
| `- a` / `- b` (multi-line) | bulleted list |
| `1. a` / `2. b` | numbered list |
| `- [ ] task` / `- [x] done` | task list with checkboxes (read-only display) |
| `# heading` | heading at body size, bold |
| Table syntax | rendered table, horizontally scrollable if wide |
| `[link](https://example.com)` | underlined link, opens new tab |
| `https://example.com` | autolinked |
| Single Enter then more text | soft line break (`<br />`) |
| Double Enter | new paragraph |
| Plain text with no Markdown | renders unchanged |

### Adversarial — sanitizer holds

| Input | Expected |
|---|---|
| `<script>alert(1)</script>` | rendered as text, no alert |
| `<img src=x onerror=alert(1)>` | rendered as text |
| `[click](javascript:alert(1))` | link href stripped or inert |
| `[click](data:text/html,<script>...)` | link href stripped or inert |
| `<iframe src="https://evil"></iframe>` | rendered as text |
| `<a href="https://x" target="_blank">x</a>` typed literally | shown as text; only Markdown links become anchors |
| `<style>body{display:none}</style>` | rendered as text |
| `<a onclick="alert(1)">x</a>` typed literally | rendered as text |
| Pasted Word document with `<o:p>`/`<v:shape>` HTML | textarea receives plain text only |

### Chat behavior

- Send a Markdown message; the receiver sees the rendered output immediately.
- Edit a Markdown message; the edit textarea shows raw source (not rendered HTML).
- Save an edit; the rendered output updates in place for both users.
- Delete; the message disappears for both.
- Long code block doesn't break the row layout — it scrolls inside the bubble.
- Auto-scroll-to-bottom still pins on new messages, including tall code blocks.
- Attachments + Markdown text on the same message both render (text above, attachments below).

### Composer

- `Cmd/Ctrl + B` with selection → wraps `**…**` with cursor after suffix.
- `Cmd/Ctrl + B` with no selection → inserts `****` with cursor between asterisks.
- Same for `Cmd/Ctrl + I` (`*…*`) and `Cmd/Ctrl + E` (`` `…` ``).
- `Cmd/Ctrl + K` with selection → `[selection](url)` with cursor inside the parentheses.
- Shift+Enter inserts a newline (existing behavior).
- Enter sends (existing behavior).
- Hint text is visible and not crowding the send button.

## Automated tests

### Unit — renderer

`apps/web/__tests__/message-markdown.test.tsx` (or co-located `message-markdown.test.tsx`). Use the project's existing test setup (Jest + RTL or Vitest — match what already exists).

Cover:
1. Inline formatting basics (bold/italic/code/strike).
2. Code block with language class survives sanitizer.
3. `<script>` typed literally is rendered as text.
4. `javascript:` link href is stripped/inerted.
5. `mailto:` link is preserved.
6. Single newline becomes `<br />`.
7. Markdown image syntax does NOT render an `<img>` element.
8. Heading text is normal body size in DOM (verify via computed font-size or class assertion).

### Unit — shortcut helper

`apps/web/__tests__/markdown-shortcuts.test.ts`. The `wrapSelection` helper is pure — easy to test:
- Wrap with selection collapsed at end.
- Wrap with selection collapsed at start.
- Wrap with non-empty selection.
- Unwrap (toggle) — optional v1.5 enhancement; not required for ship.

### E2E — optional

If the project has Playwright/Cypress hooked up, add one e2e for the round-trip: user A sends `**hi**`, user B sees a `<strong>hi</strong>` in the rendered DOM. Otherwise rely on the manual matrix above.

## Bundle check

```bash
cd apps/web && bun run build
```

Confirm the chat route bundle delta is within the budget set in step 1 (< ~80 KB gzipped). If exceeded, switch from `rehype-highlight` to a curated `lowlight` grammar set.

## Rollout

This is a render-time-only change. There is no schema migration, no API change, no flag flip. The release sequence:

1. Land all PRs in dev.
2. Smoke test the manual matrix in the dev environment.
3. Merge to `main`.
4. Deploy.
5. Post a short note in the product changelog: "Messages now support Markdown — bold, italic, code blocks, lists, links, and more."

### Rollback

If the renderer misbehaves in production, revert the change to `message-item.tsx` (one line — swap `<MessageMarkdown />` back to the `<p>` block). Stored content is unchanged, so rollback is instant and lossless.

## Follow-ups (not blocking)

- Mentions (`@user`) and channel links (`#channel`) — separate feature, but the renderer is the right place to add them.
- Per-theme highlight.js stylesheets when dark mode ships.
- Live preview pane (toggleable) for power users.
- Slack-style single-asterisk-for-bold compatibility — would require a custom remark plugin; defer until requested.
