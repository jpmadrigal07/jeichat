# Step 4 — Composer affordances

## File to change

`apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/_components/message-input.tsx`

## Principle

Keep the composer a plain `<Textarea>`. Markdown is the *interpretation* applied at render time, not a mode the user toggles. The composer must still feel like a chat input — instant, no formatting toolbar, no preview pane.

We add three small affordances:

1. **Hint text** below or beside the input: `Markdown supported · **bold** *italic* \`code\``. Keep it muted (`text-xs text-muted-foreground`), small, and unobtrusive. Hide on narrow viewports if it competes with the send button.
2. **Keyboard shortcuts** for common formatting, applied to the current selection inside the textarea:
   - `Cmd/Ctrl + B` → wrap selection in `**…**`
   - `Cmd/Ctrl + I` → wrap selection in `*…*`
   - `Cmd/Ctrl + E` → wrap selection in `` `…` `` (inline code)
   - `Cmd/Ctrl + K` → wrap selection as `[text](url)` and place cursor inside the URL
3. **Shift+Enter for newline** — already supported by the existing `handleKeyDown`. Just document it; no code change.

## Implementation notes

- Shortcuts manipulate `textareaRef.current.value` directly and dispatch an `input` event to keep the auto-resize and `hasText` state in sync, since we don't drive the textarea from React state.
- If no text is selected, `Cmd+B` inserts `****` and places the caret in the middle (so the next keystroke types inside the bold). Same pattern for `*…*` and `` `…` ``.
- Implement the shortcut handling in a small helper module so it can be unit-tested independent of React:

```
apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/_helpers/markdown-shortcuts.ts
```

Export a pure function `wrapSelection(value: string, selectionStart: number, selectionEnd: number, prefix: string, suffix: string)` that returns the new value plus the new caret range. The component layer wires this to the keydown handler and updates the DOM.

## Submit semantics — unchanged

`submit()` already trims trailing whitespace and sends the raw string. That's the right behavior for Markdown too — do not pre-render to HTML on the client before sending. The DB stores raw source.

## Auto-resize — unchanged

The `handleAutoResize` logic already caps the textarea at 200px scroll height. Markdown source is usually short, so this stays.

## Send button — unchanged

`canSend` only considers presence of text or ready attachments. No change.

## Placeholder

Optionally update the placeholder to suggest Markdown:

```ts
placeholder={`Message #${channelName ?? '...'} — Markdown supported`}
```

Keep this short; the hint text below handles the longer explanation.
