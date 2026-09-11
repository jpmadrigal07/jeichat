'use client';

import { useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableMessage,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { ComposerTagPicker } from '@chat/_components/composer-tag-picker';
import { useComposerTagPicker } from '@chat/_hooks/use-composer-tag-picker';
import { cn } from '@/lib/utils';
import { MessageMarkdown } from './message-markdown';

type MarkdownWritePreviewProps = {
  id?: string;
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  textareaClassName?: string;
  workspaceId: string;
  currentUserId?: string;
  members?: MentionableMember[];
  tickets?: TaggableTicket[];
  channels?: TaggableChannel[];
  mentionMessages?: TaggableMessage[];
  autoFocus?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

export function MarkdownWritePreview({
  id,
  name,
  defaultValue = '',
  placeholder,
  maxLength,
  rows = 6,
  className,
  textareaClassName,
  workspaceId,
  currentUserId,
  members = [],
  tickets = [],
  channels = [],
  mentionMessages = [],
  autoFocus,
  onKeyDown,
  textareaRef,
}: MarkdownWritePreviewProps) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState('write');
  const [preview, setPreview] = useState(defaultValue);
  const ref = textareaRef ?? innerRef;
  const picker = useComposerTagPicker({
    textareaRef: ref,
    workspaceId,
    members,
    currentUserId,
    tickets,
    channels,
    localMessages: mentionMessages,
  });

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        if (value === 'preview') {
          setPreview(ref.current?.value ?? '');
        }
        setTab(value);
      }}
      className={cn('gap-2', className)}
    >
      <TabsList variant="line">
        <TabsTrigger value="write">Write</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="write" forceMount hidden={tab !== 'write'}>
        <div className="relative">
          <Textarea
            ref={ref}
            id={id}
            name={name}
            defaultValue={defaultValue}
            placeholder={placeholder}
            maxLength={maxLength}
            rows={rows}
            autoFocus={autoFocus}
            onKeyDown={(event) => {
              if (picker.handlePickerKeyDown(event)) return;
              onKeyDown?.(event);
            }}
            onSelect={picker.syncFromTextarea}
            onInput={picker.syncFromTextarea}
            className={textareaClassName}
          />
          <ComposerTagPicker
            mentionOpen={picker.mentionOpen}
            mentionMembers={picker.mentionMembers}
            hashOpen={picker.hashOpen}
            hashItems={picker.hashItems}
            selectedIndex={picker.selectedIndex}
            isSearching={picker.isSearching}
            placement="below"
            onMention={picker.applyMention}
            onHashItem={picker.applyHashItem}
          />
        </div>
      </TabsContent>
      <TabsContent value="preview">
        {preview.trim() ? (
          <MessageMarkdown
            content={preview}
            className="md-ticket min-h-16 text-sm"
            members={members}
            tickets={tickets}
            channels={channels}
            workspaceId={workspaceId}
          />
        ) : (
          <p className="min-h-16 text-sm text-muted-foreground">
            Nothing to preview
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
