# Step 3 — Wire the renderer into the message list

## File to change

`apps/web/app/(chat)/w/(chat-shell)/[workspaceId]/c/[channelId]/_components/message-item.tsx`

## Current state

The non-editing branch currently does:

```tsx
{message.content ? (
  <p className="text-sm whitespace-pre-wrap break-words">
    {message.content}
  </p>
) : null}
<MessageAttachments attachments={message.attachments} />
```

Plain text with `whitespace-pre-wrap`. We are replacing the `<p>` with the Markdown renderer.

## Change

Replace the `<p>` block with:

```tsx
{message.content ? (
  <MessageMarkdown
    content={message.content}
    className="text-sm break-words"
  />
) : null}
<MessageAttachments attachments={message.attachments} />
```

Import:

```ts
import { MessageMarkdown } from './message-markdown';
```

Remove the unused `whitespace-pre-wrap` class — `remark-breaks` handles soft breaks, and block elements (lists, code) have their own spacing.

## Edit dialog — leave alone

The edit branch already uses `<Textarea defaultValue={message.content} />`. That's correct: edit operates on the **raw Markdown source**, not the rendered HTML. Do not change that branch. The only adjustment: increase `min-h` slightly if multi-line Markdown is common (optional; can be deferred).

## Reply / quote previews

If/when a reply preview is added (out of scope today), it should call `<MessageMarkdown />` with a one-line truncation wrapper, not duplicate the rendering logic.

## Attachments unchanged

`<MessageAttachments />` stays exactly where it is, immediately after the rendered Markdown. Markdown text and uploaded attachments are independent and both can be present.

## Scrolling behavior

The channel view auto-scrolls to bottom on new messages. Markdown rendering can change the rendered height (a multi-line code block is taller than a one-liner). Verify that the existing scroll observer still pins to bottom after the renderer mounts — if it measures *before* the code block paints, it may stop one row short. Run the manual test in step 7 to confirm.

## Real-time updates

Messages flow in through the channel socket (`message.created`, `message.updated`). No socket changes are needed; the renderer is purely a frontend transformation of the same `content` field.
