'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MentionableMember } from '@chat/_helpers/mentions';
import { MAX_TICKET_DESCRIPTION_LENGTH } from '@chat/_helpers/ticket-fields';
import type {
  TaggableChannel,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { cn } from '@/lib/utils';
import { MarkdownWritePreview } from './markdown-write-preview';
import { MessageMarkdown } from './message-markdown';

type TicketDescriptionProps = {
  workspaceId: string;
  description: string | null;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels?: TaggableChannel[];
  onSave: (description: string | null) => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
};

export function TicketDescription({
  workspaceId,
  description,
  members,
  tickets,
  channels,
  onSave,
  expanded,
  onExpandedChange,
  editing,
  onEditingChange,
}: TicketDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [canCollapse, setCanCollapse] = useState(false);

  useLayoutEffect(() => {
    if (editing) return;
    const preview = previewRef.current;
    if (!preview || !description) {
      setCanCollapse(false);
      return;
    }
    const el: HTMLElement = preview;

    function measure() {
      if (expanded) return;
      if (el.clientHeight === 0) return;
      setCanCollapse(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    const content = el.firstElementChild;
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [description, editing, expanded]);

  function startEdit() {
    onEditingChange(true);
  }

  function cancel() {
    onEditingChange(false);
  }

  function save() {
    const value = textareaRef.current?.value ?? description ?? '';
    if (value.length > MAX_TICKET_DESCRIPTION_LENGTH) {
      toast.error(
        `Ticket description must be ${MAX_TICKET_DESCRIPTION_LENGTH} characters or fewer`,
      );
      return;
    }
    const next = value.trim() || null;
    if (next !== (description ?? null)) onSave(next);
    onExpandedChange(false);
    onEditingChange(false);
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <MarkdownWritePreview
          key={`edit-${description ?? ''}`}
          textareaRef={textareaRef}
          defaultValue={description ?? ''}
          placeholder="Add a description. Markdown is supported."
          maxLength={MAX_TICKET_DESCRIPTION_LENGTH}
          autoFocus
          workspaceId={workspaceId}
          members={members}
          tickets={tickets}
          channels={channels}
          textareaClassName="min-h-24 border-transparent bg-transparent px-0 shadow-none dark:bg-transparent"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
        />
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={save}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!description) {
    return (
      <Button
        type="button"
        variant="ghost"
        className="h-auto justify-start px-0 py-1 text-sm font-normal text-muted-foreground hover:bg-transparent"
        onClick={startEdit}
      >
        Add a description
      </Button>
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 gap-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1">
        <div
          ref={previewRef}
          className={cn(
            'relative min-h-0',
            !expanded &&
              'max-h-48 overflow-hidden sm:h-0 sm:max-h-none sm:flex-1',
          )}
        >
          <MessageMarkdown
            content={description}
            className="md-ticket text-sm"
            members={members}
            tickets={tickets}
            channels={channels}
            workspaceId={workspaceId}
          />
          {!expanded && canCollapse ? (
            <>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-background from-40%" />
              <Button
                type="button"
                variant="link"
                size="sm"
                className="absolute bottom-0 left-0 z-10 h-auto px-0"
                onClick={() => onExpandedChange(true)}
              >
                See more
              </Button>
            </>
          ) : null}
        </div>
        {expanded && canCollapse ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto shrink-0 self-start px-0"
            onClick={() => onExpandedChange(false)}
          >
            See less
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0 self-start"
        onClick={startEdit}
      >
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
    </div>
  );
}
