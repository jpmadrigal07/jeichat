'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MentionableMember } from '@chat/_helpers/mentions';
import { MAX_TICKET_DESCRIPTION_LENGTH } from '@chat/_helpers/ticket-fields';
import type { TaggableTicket } from '@chat/_helpers/ticket-mentions';
import { cn } from '@/lib/utils';
import { MarkdownWritePreview } from './markdown-write-preview';
import { MessageMarkdown } from './message-markdown';

const COLLAPSED_MAX_CLASS = 'max-h-36';
const COLLAPSED_MAX_REM = 9;

type TicketDescriptionProps = {
  workspaceId: string;
  description: string | null;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  onSave: (description: string | null) => void;
};

export function TicketDescription({
  workspaceId,
  description,
  members,
  tickets,
  onSave,
}: TicketDescriptionProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [canCollapse, setCanCollapse] = useState(false);

  useLayoutEffect(() => {
    const node = previewRef.current;
    if (!node || editing || !description) {
      setCanCollapse(false);
      return;
    }

    function measure() {
      const rem = parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      setCanCollapse(node.scrollHeight > rem * COLLAPSED_MAX_REM + 1);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [description, editing]);

  function startEdit() {
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
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
    setExpanded(false);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
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
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="relative min-w-0">
          <div
            ref={previewRef}
            className={cn(!expanded && `${COLLAPSED_MAX_CLASS} overflow-hidden`)}
          >
            <MessageMarkdown
              content={description}
              className="md-ticket text-sm"
              members={members}
              tickets={tickets}
              workspaceId={workspaceId}
            />
          </div>
          {!expanded && canCollapse ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-linear-to-t from-background" />
          ) : null}
        </div>
        {canCollapse ? (
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto self-start px-0"
            onClick={() => setExpanded((open) => !open)}
          >
            {expanded ? 'See less' : 'See more'}
          </Button>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={startEdit}
      >
        <Pencil data-icon="inline-start" />
        Edit
      </Button>
    </div>
  );
}
