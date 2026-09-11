import {
  ticketDisplayId,
  ticketPrefixOf,
} from './ticket-fields';
import { channelPageHref } from '../_libs/channels';
import { MESSAGE_HIGHLIGHT_PARAM } from '../w/[workspaceId]/(chat-shell)/c/[channelId]/_libs/messages';
import type { InboxNotification } from '../_libs/inbox';

export function inboxTargetLabel(notification: InboxNotification) {
  const channel = notification.channel;
  if (!channel.parentId) return `#${channel.name}`;

  const parent = notification.parent ?? { name: channel.name, ticketKey: null };
  const prefix = ticketPrefixOf({
    ticketKey: parent.ticketKey,
    name: parent.name,
  });
  if (channel.ticketNumber && channel.ticketNumber > 0) {
    return `${ticketDisplayId(prefix, channel.ticketNumber)} ${channel.name}`;
  }
  return channel.name;
}

export function inboxEventLabel(notification: InboxNotification) {
  const target = inboxTargetLabel(notification);
  if (notification.type === 'assigned') {
    return `${notification.actor.name} assigned you ${target}`;
  }
  if (notification.type === 'watched') {
    return `${notification.actor.name} added you as a watcher on ${target}`;
  }
  if (notification.type === 'reaction') {
    const emoji = notification.emoji ?? '👍';
    return `${notification.actor.name} reacted ${emoji} to your message in ${target}`;
  }
  return `${notification.actor.name} mentioned you in ${target}`;
}

export function inboxSnippet(notification: InboxNotification) {
  const content = notification.message?.content.trim();
  if (!content) return null;
  return content.length > 140 ? `${content.slice(0, 137)}…` : content;
}

export function inboxItemHref(workspaceId: string, notification: InboxNotification) {
  if (notification.message?.id) {
    const params = new URLSearchParams();
    params.set(MESSAGE_HIGHLIGHT_PARAM, notification.message.id);
    return `${channelPageHref(workspaceId, notification.channel.id)}?${params.toString()}`;
  }
  return channelPageHref(workspaceId, notification.channel.id);
}
