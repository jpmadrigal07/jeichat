import type { Message } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';

export type MessageNotification = {
  workspaceId: string;
  channel: {
    id: string;
    name: string;
    parentId: string | null;
    ticketNumber: number | null;
    ticketKey: string | null;
    channelType: 'channel' | 'dm';
  };
  parent: {
    id: string;
    name: string;
    ticketKey: string | null;
  } | null;
  message: Message;
  /**
   * Set for recipients who muted the channel (or only want mentions): update
   * the unread count, but skip the sound, toast and desktop notification.
   */
  silent?: boolean;
};
