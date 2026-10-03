import {
  ticketDisplayId,
  ticketPrefixOf,
} from './ticket-fields';
import { conversationPageHref } from '../_libs/channels';
import type { MessageNotification } from '../_libs/message-notifications';
import { MESSAGE_HIGHLIGHT_PARAM } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';

export function messageNotificationTargetLabel(
  notification: MessageNotification,
) {
  const channel = notification.channel;
  if (channel.channelType === 'dm') return 'Direct message';
  if (!channel.parentId) return `#${channel.name}`;

  const parent = notification.parent ?? {
    name: channel.name,
    ticketKey: channel.ticketKey,
  };
  const prefix = ticketPrefixOf({
    ticketKey: parent.ticketKey,
    name: parent.name,
  });
  if (channel.ticketNumber && channel.ticketNumber > 0) {
    return `${ticketDisplayId(prefix, channel.ticketNumber)} ${channel.name}`;
  }
  return channel.name;
}

export function messageNotificationSnippet(
  notification: MessageNotification,
) {
  const content = notification.message.content.trim();
  if (content) {
    return content.length > 140 ? `${content.slice(0, 137)}…` : content;
  }

  const attachments = notification.message.attachments ?? [];
  if (attachments.length === 1) return attachments[0]?.filename ?? 'Attachment';
  if (attachments.length > 1) return `${attachments.length} attachments`;
  return 'New message';
}

export function messageNotificationHref(
  notification: MessageNotification,
) {
  const params = new URLSearchParams();
  params.set(MESSAGE_HIGHLIGHT_PARAM, notification.message.id);
  return `${conversationPageHref(notification.workspaceId, notification.channel)}?${params.toString()}`;
}
