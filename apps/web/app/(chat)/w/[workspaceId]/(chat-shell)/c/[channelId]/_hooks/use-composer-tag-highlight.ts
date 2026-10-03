'use client';

import { useRef, type RefObject } from 'react';
import type { MentionableMember } from '@chat/_helpers/mentions';
import {
  splitMessageContent,
  type TaggableChannel,
  type TaggableTicket,
} from '@chat/_helpers/ticket-mentions';

/**
 * No padding — it would shift the backdrop text out of line with the
 * textarea. The shadow grows the pill without affecting layout.
 */
const TAG_HIGHLIGHT_CLASS =
  'rounded-sm bg-tag text-transparent shadow-[0_0_0_2px_var(--tag)] box-decoration-clone';

type UseComposerTagHighlightArgs = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
};

/**
 * Paints tag pills behind an uncontrolled textarea. The backdrop mirrors the
 * textarea's text with transparent glyphs so only the pill backgrounds show
 * through the textarea's transparent background.
 */
export function useComposerTagHighlight({
  textareaRef,
  members,
  tickets,
  channels,
}: UseComposerTagHighlightArgs) {
  const highlightRef = useRef<HTMLDivElement>(null);

  function syncHighlightScroll() {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;
    highlight.scrollTop = textarea.scrollTop;
  }

  function syncHighlight() {
    const textarea = textareaRef.current;
    const highlight = highlightRef.current;
    if (!textarea || !highlight) return;

    const fragment = document.createDocumentFragment();
    for (const part of splitMessageContent(
      textarea.value,
      members,
      tickets,
      channels,
    )) {
      if (part.kind === 'text') {
        fragment.append(part.text);
        continue;
      }
      const pill = document.createElement('span');
      pill.className = TAG_HIGHLIGHT_CLASS;
      pill.textContent = part.text;
      fragment.append(pill);
    }
    // A trailing newline takes up a line in a textarea but not in a div.
    fragment.append('​');
    highlight.replaceChildren(fragment);

    // Match the textarea's content width when a classic scrollbar shows.
    highlight.style.paddingRight = `${textarea.offsetWidth - textarea.clientWidth}px`;
    syncHighlightScroll();
  }

  return { highlightRef, syncHighlight, syncHighlightScroll };
}
