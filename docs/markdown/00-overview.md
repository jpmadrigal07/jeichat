# Feature: Markdown in Chat Messages

Let users write messages in Markdown and render the formatted output in the message list. The composer accepts Markdown by default (no toggle), and the message list renders sanitized HTML with Discord/Slack-style formatting: **bold**, *italic*, `inline code`, fenced code blocks with syntax highlighting, lists, blockquotes, links, and headings.

## Goals

- Users type Markdown directly into the chatbox; what they send is what the database stores (raw Markdown).
- The message list renders Markdown to safe HTML with consistent typography.
- Sensible chat-friendly defaults: single `\n` is a hard line break (like Slack/Discord), no surprise heading-on-`#hashtag`.
- Lightweight: GFM features only (tables, strikethrough, autolinks, task lists, fenced code).
- Safe: no `<script>`, no raw HTML injection, no `javascript:` URLs. All rendered HTML passes through a sanitizer.
- Preserves existing features unchanged: edit, delete, attachments, mentions (future), typing indicator, scroll-to-bottom.

## Non-goals (v1)

- No WYSIWYG editor or formatting toolbar — plain textarea, Markdown is "by default" only in the sense that the input is *interpreted* as Markdown when rendered.
- No live preview pane while typing (Discord doesn't have one either). A future enhancement may add an inline preview.
- No custom emoji, mentions, or channel-link syntax — leave those to a follow-up.
- No KaTeX / math rendering.
- No Mermaid or diagram rendering.
- No image embedding via Markdown `![]()` — images come from the attachments pipeline, not from arbitrary remote URLs (security + LB hot-linking).

## Storage model

Messages already store a plain `content: string` column. **We keep storing the raw Markdown source.** No schema change, no migration. Rendering is purely a frontend concern.

Why store raw source:
- Round-trips edits cleanly (edit dialog shows what the user wrote).
- Lets us change the renderer / sanitizer later without re-processing rows.
- Export (CSV/JSON) keeps the original characters.

## High-level architecture

```
[Composer: message-input.tsx]
   │  user types Markdown into <Textarea>
   │  Enter sends raw string  ───────────────────────────────┐
                                                             │
                                                             ▼
                                                   [POST /channels/:id/messages]
                                                   stores `content` verbatim
                                                             │
                                                             ▼
                                       [Channel socket: message.created]
                                                             │
                                                             ▼
[Message list: message-item.tsx]
   │  receives `message.content` (raw Markdown)
   │
   ├─ <Markdown source={content} />  ── react-markdown
   │     │
   │     ├─ remark-gfm (GFM extensions)
   │     ├─ remark-breaks (single \n → <br />)
   │     ├─ rehype-sanitize (allowlist schema)
   │     └─ rehype-highlight (code block syntax)
   │
   └─ rendered HTML in a `.prose-chat` styled wrapper
```

Everything runs client-side. No server changes required for v1.

## Step-by-step plan

The plan is split into ordered files. Work through them in order; each step is independently shippable behind the next one.

1. [01-library-choice.md](01-library-choice.md) — Pick the Markdown stack (react-markdown + remark/rehype plugins), install, verify.
2. [02-renderer-component.md](02-renderer-component.md) — Build a shared `<MessageMarkdown />` component with the right plugin chain and sanitization schema.
3. [03-message-list-integration.md](03-message-list-integration.md) — Wire the renderer into `message-item.tsx`, preserve attachments, "edited" badge, and whitespace behavior.
4. [04-composer-affordances.md](04-composer-affordances.md) — Keep the composer a plain textarea; add a small "Markdown supported" hint, keyboard shortcuts for **bold** / *italic* / `code`, and shift-enter for newline (already supported, just document).
5. [05-styling.md](05-styling.md) — Tailwind `prose-chat` rules: tight line-height, link color, `code` background, `pre` block frame, list bullet alignment, blockquote stripe.
6. [06-security.md](06-security.md) — Sanitizer allowlist, URL scheme guard, link target/rel hardening, paste-from-Word safety.
7. [07-testing-rollout.md](07-testing-rollout.md) — Manual test matrix (golden + adversarial), unit tests for the renderer, rollout checklist.

## Definition of done

- [ ] Typing `**bold**`, `*italic*`, `` `code` ``, `~~strike~~`, fenced ` ```ts ` blocks renders correctly in the message list.
- [ ] Single `Enter`-newlines (Shift+Enter while composing) render as line breaks, not joined paragraphs.
- [ ] Links open in a new tab with `rel="noopener noreferrer nofollow"`.
- [ ] Pasting HTML with `<script>` or `javascript:` URLs renders as inert text.
- [ ] Edit dialog shows raw Markdown source, not rendered HTML.
- [ ] Long fenced code blocks scroll horizontally inside the message bubble without breaking message layout.
- [ ] Bundle impact for the web app stays under ~80 KB gzipped delta (react-markdown + plugins).
- [ ] Existing attachments, edit, delete, scroll behavior all still work.
