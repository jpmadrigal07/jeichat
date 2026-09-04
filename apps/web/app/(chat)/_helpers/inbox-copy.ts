import {
  ticketDisplayId,
  ticketPrefixOf,
} from './ticket-fields';
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
  return `${notification.actor.name} mentioned you in ${target}`;
}

export function inboxSnippet(notification: InboxNotification) {
  const content = notification.message?.content.trim();
  if (!content) return null;
  return content.length > 140 ? `${content.slice(0, 137)}…` : content;
}
