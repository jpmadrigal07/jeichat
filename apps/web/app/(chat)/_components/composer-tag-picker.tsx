'use client';

import { Hash, MessageSquare } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  personInitials,
  TICKET_STATUS_META,
  ticketStatusOf,
} from '../_helpers/ticket-fields';
import type { MentionableMember } from '../_helpers/mentions';
import {
  messageMentionLabel,
  type HashPickerItem,
} from '../_helpers/ticket-mentions';

type ComposerTagPickerProps = {
  mentionOpen: boolean;
  mentionMembers: MentionableMember[];
  hashOpen: boolean;
  hashItems: HashPickerItem[];
  selectedIndex: number;
  isSearching?: boolean;
  placement?: 'above' | 'below';
  onMention: (member: MentionableMember) => void;
  onHashItem: (item: HashPickerItem) => void;
};

export function ComposerTagPicker({
  mentionOpen,
  mentionMembers,
  hashOpen,
  hashItems,
  selectedIndex,
  isSearching = false,
  placement = 'above',
  onMention,
  onHashItem,
}: ComposerTagPickerProps) {
  if (!mentionOpen && !hashOpen) return null;

  return (
    <div
      className={cn(
        'absolute inset-x-0 z-10 flex max-h-72 flex-col gap-1 overflow-y-auto rounded-md border bg-popover p-1 shadow-md',
        placement === 'above' ? 'bottom-full mb-1' : 'top-full mt-1',
      )}
    >
      {mentionOpen
        ? mentionMembers.map((member, index) => (
            <Button
              key={member.userId}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'w-full justify-start text-left font-normal',
                index === selectedIndex && 'bg-muted',
              )}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onMention(member)}
            >
              <Avatar size="sm">
                <AvatarImage src={member.image ?? undefined} alt="" />
                <AvatarFallback>{personInitials(member.name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{member.name}</span>
            </Button>
          ))
        : null}
      {hashOpen
        ? hashItems.map((item, index) => {
            if (item.kind === 'ticket') {
              const meta =
                TICKET_STATUS_META[ticketStatusOf(item.ticket.status)];
              const StatusIcon = meta.icon;
              return (
                <Button
                  key={`ticket-${item.ticket.id}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    index === selectedIndex && 'bg-muted',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onHashItem(item)}
                >
                  <StatusIcon
                    data-icon="inline-start"
                    className={meta.iconClassName}
                  />
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {item.ticket.displayId}
                  </span>
                  <span className="truncate">{item.ticket.name}</span>
                </Button>
              );
            }
            if (item.kind === 'channel') {
              return (
                <Button
                  key={`channel-${item.channel.id}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    index === selectedIndex && 'bg-muted',
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onHashItem(item)}
                >
                  <Hash data-icon="inline-start" />
                  <span className="truncate">{item.channel.name}</span>
                </Button>
              );
            }
            return (
              <Button
                key={`message-${item.message.id}`}
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  index === selectedIndex && 'bg-muted',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onHashItem(item)}
              >
                <MessageSquare data-icon="inline-start" />
                <span className="min-w-0 flex-1 truncate text-left">
                  {messageMentionLabel(item.message)}
                </span>
                {item.message.channelName ? (
                  <span className="max-w-24 shrink-0 truncate text-xs text-muted-foreground">
                    #{item.message.channelName}
                  </span>
                ) : null}
              </Button>
            );
          })
        : null}
      {hashOpen && isSearching && hashItems.every((item) => item.kind !== 'message')
        ? Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))
        : null}
    </div>
  );
}
