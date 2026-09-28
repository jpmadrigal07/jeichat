'use client';

import { useMemo, useState, type KeyboardEvent, type RefObject } from 'react';
import {
  ALL_MENTION,
  filterMentionMembers,
  insertMention,
  matchesAllMention,
  type MentionableMember,
} from '../_helpers/mentions';
import {
  activeComposerTag,
  hashPickerItems,
  insertChannelTag,
  insertMessageLink,
  insertTicketTag,
  mergeTaggableMessages,
  messageMentionLabel,
  taggableMessages,
  type ComposerTag,
  type HashPickerItem,
  type TaggableChannel,
  type TaggableMessage,
  type TaggableTicket,
} from '../_helpers/ticket-mentions';
import { messagePageHref } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';
import { useWorkspaceSearch } from './use-search';

type UseComposerTagPickerArgs = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  workspaceId: string;
  members: MentionableMember[];
  currentUserId?: string;
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  localMessages?: TaggableMessage[];
  /** Offer `@all` as the first mention option. */
  allowAllMention?: boolean;
  onValueChange?: (value: string) => void;
};

export function useComposerTagPicker({
  textareaRef,
  workspaceId,
  members,
  currentUserId,
  tickets,
  channels,
  localMessages = [],
  allowAllMention = false,
  onValueChange,
}: UseComposerTagPickerArgs) {
  const [composerTag, setComposerTag] = useState<ComposerTag | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const hashQuery = composerTag?.type === 'hash' ? composerTag.query : '';
  const { results } = useWorkspaceSearch(workspaceId, hashQuery);

  const searchedMessages = useMemo(
    () => taggableMessages(results.data ?? []),
    [results.data],
  );

  const mentionMembers = filterMentionMembers(
    currentUserId
      ? members.filter((member) => member.userId !== currentUserId)
      : members,
    composerTag?.type === 'mention' ? composerTag.query : '',
  ).slice(0, 8);

  const hashItems = hashPickerItems(
    tickets,
    channels,
    mergeTaggableMessages(searchedMessages, localMessages.slice().reverse()),
    hashQuery,
  );

  const mentionAll =
    allowAllMention &&
    composerTag?.type === 'mention' &&
    matchesAllMention(composerTag.query);
  // `@all` takes index 0 when shown, so members shift down by one.
  const mentionOffset = mentionAll ? 1 : 0;

  const mentionOpen =
    composerTag?.type === 'mention' &&
    (mentionAll || mentionMembers.length > 0);
  const hashOpen =
    composerTag?.type === 'hash' &&
    (hashItems.length > 0 || Boolean(hashQuery && results.isFetching));
  const pickerItemCount = mentionOpen
    ? mentionMembers.length + mentionOffset
    : hashItems.length;
  const pickerOpen = mentionOpen || hashOpen;
  const clampedIndex = pickerOpen
    ? Math.min(selectedIndex, Math.max(pickerItemCount - 1, 0))
    : 0;

  function syncFromTextarea() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const next = activeComposerTag(
      textarea.value,
      textarea.selectionStart ?? textarea.value.length,
    );
    const same =
      composerTag?.type === next?.type &&
      composerTag?.start === next?.start &&
      composerTag?.query === next?.query;
    setComposerTag(next);
    if (!same) setSelectedIndex(0);
  }

  function applyInsertedText(next: string, caret: number) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.value = next;
    textarea.setSelectionRange(caret, caret);
    setComposerTag(null);
    setSelectedIndex(0);
    onValueChange?.(next);
    requestAnimationFrame(() => {
      textarea.focus();
    });
  }

  function insertMentionName(name: string) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'mention') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const next = insertMention(textarea.value, composerTag.start, cursor, name);
    applyInsertedText(next, composerTag.start + name.length + 2);
  }

  function applyMention(member: MentionableMember) {
    insertMentionName(member.name);
  }

  function applyAllMention() {
    insertMentionName(ALL_MENTION);
  }

  function applyTicketTag(ticket: TaggableTicket) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'hash') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const next = insertTicketTag(
      textarea.value,
      composerTag.start,
      cursor,
      ticket.displayId,
    );
    applyInsertedText(next, composerTag.start + ticket.displayId.length + 2);
  }

  function applyChannelTag(channel: TaggableChannel) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'hash') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const next = insertChannelTag(
      textarea.value,
      composerTag.start,
      cursor,
      channel.name,
    );
    applyInsertedText(next, composerTag.start + channel.name.length + 2);
  }

  function applyMessageTag(message: TaggableMessage) {
    const textarea = textareaRef.current;
    if (!textarea || composerTag?.type !== 'hash') return;
    const cursor = textarea.selectionStart ?? textarea.value.length;
    const label = messageMentionLabel(message);
    const href = messagePageHref(
      workspaceId,
      { id: message.channelId, parentId: message.parentId },
      message.id,
    );
    const token = `[${label}](${href}) `;
    const next = insertMessageLink(
      textarea.value,
      composerTag.start,
      cursor,
      label,
      href,
    );
    applyInsertedText(next, composerTag.start + token.length);
  }

  function applyHashItem(item: HashPickerItem) {
    if (item.kind === 'ticket') applyTicketTag(item.ticket);
    else if (item.kind === 'channel') applyChannelTag(item.channel);
    else applyMessageTag(item.message);
  }

  function handlePickerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!pickerOpen) return false;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (pickerItemCount === 0) return true;
      setSelectedIndex((index) => (index + 1) % pickerItemCount);
      return true;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (pickerItemCount === 0) return true;
      setSelectedIndex(
        (index) => (index - 1 + pickerItemCount) % pickerItemCount,
      );
      return true;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      if (mentionOpen) {
        if (mentionAll && clampedIndex === 0) {
          applyAllMention();
        } else {
          const member = mentionMembers[clampedIndex - mentionOffset];
          if (member) applyMention(member);
        }
      } else {
        const item = hashItems[clampedIndex];
        if (item) applyHashItem(item);
      }
      return true;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setComposerTag(null);
      return true;
    }
    return false;
  }

  return {
    mentionOpen,
    mentionAll,
    mentionMembers,
    hashOpen,
    hashItems,
    selectedIndex: clampedIndex,
    isSearching: Boolean(hashQuery) && results.isFetching,
    pickerOpen,
    syncFromTextarea,
    handlePickerKeyDown,
    applyMention,
    applyAllMention,
    applyHashItem,
  };
}
