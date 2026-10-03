'use client';

import { useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ComposerTagPicker } from '@chat/_components/composer-tag-picker';
import { useComposerTagPicker } from '@chat/_hooks/use-composer-tag-picker';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableMessage,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { shouldSubmitOnEnter } from '../_helpers/enter-to-submit';
import { useComposerTagHighlight } from '../_hooks/use-composer-tag-highlight';

type MessageEditComposerProps = {
  initialContent: string;
  workspaceId: string;
  currentUserId: string;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  mentionMessages: TaggableMessage[];
  allowAllMention: boolean;
  onSave: (content: string) => void;
  onCancel: () => void;
};

export function MessageEditComposer({
  initialContent,
  workspaceId,
  currentUserId,
  members,
  tickets,
  channels,
  mentionMessages,
  allowAllMention,
  onSave,
  onCancel,
}: MessageEditComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlight = useComposerTagHighlight({
    textareaRef,
    members,
    tickets,
    channels,
  });
  const picker = useComposerTagPicker({
    textareaRef,
    workspaceId,
    members,
    currentUserId,
    tickets,
    channels,
    localMessages: mentionMessages,
    allowAllMention,
    onValueChange: () => {
      highlight.syncHighlight();
    },
  });

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    const end = node.value.length;
    node.focus();
    node.setSelectionRange(end, end);
    highlight.syncHighlight();
  }, []);

  function handleSave() {
    const value = textareaRef.current?.value.trim();
    if (value) onSave(value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (picker.handlePickerKeyDown(e)) return;
    if (shouldSubmitOnEnter(e)) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      onCancel();
    }
  }

  return (
    <div className="relative mt-1">
      <div className="relative">
        <ComposerTagPicker
          mentionOpen={picker.mentionOpen}
          mentionAll={picker.mentionAll}
          mentionMembers={picker.mentionMembers}
          hashOpen={picker.hashOpen}
          hashItems={picker.hashItems}
          selectedIndex={picker.selectedIndex}
          isSearching={picker.isSearching}
          placement="below"
          className="z-50"
          onMention={picker.applyMention}
          onMentionAll={picker.applyAllMention}
          onHashItem={picker.applyHashItem}
        />
        <div
          ref={highlight.highlightRef}
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md border border-transparent px-2 py-2 text-sm/relaxed wrap-break-word whitespace-pre-wrap text-transparent md:text-sm/relaxed"
        />
        <Textarea
          ref={textareaRef}
          defaultValue={initialContent}
          onKeyDown={handleKeyDown}
          onSelect={picker.syncFromTextarea}
          onScroll={highlight.syncHighlightScroll}
          onInput={() => {
            picker.syncFromTextarea();
            highlight.syncHighlight();
          }}
          className="relative min-h-15 resize-none bg-transparent text-sm/relaxed md:text-sm/relaxed"
        />
      </div>
      <div className="mt-1 flex gap-1">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          <X className="mr-1 h-3.5 w-3.5" />
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          <Check className="mr-1 h-3.5 w-3.5" />
          Save
        </Button>
      </div>
    </div>
  );
}
