import {
  ticketDisplayId,
  ticketPrefixOf,
} from '../channels/ticket-fields';

export type PushNotificationPayload = {
  title: string;
  body: string;
  href: string;
  tag: string;
  icon?: string;
};

export type MessagePushInput = {
  workspaceId: string;
  channel: {
    id: string;
    name: string;
    parentId: string | null;
    ticketNumber: number | null;
    ticketKey: string | null;
    channelType: string;
  };
  parent: {
    id: string;
    name: string;
    ticketKey: string | null;
  } | null;
  message: {
    id: string;
    content: string;
    sender?: { name: string | null; image: string | null } | null;
    attachments?: { filename: string }[];
  };
};

function targetLabel(notification: MessagePushInput) {
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

function snippet(notification: MessagePushInput) {
  const content = notification.message.content.trim();
  if (content) {
    return content.length > 140 ? `${content.slice(0, 137)}…` : content;
  }

  const attachments = notification.message.attachments ?? [];
  if (attachments.length === 1) return attachments[0]?.filename ?? 'Attachment';
  if (attachments.length > 1) return `${attachments.length} attachments`;
  return 'New message';
}

function absoluteUrl(value: string | null | undefined) {
  if (!value) return undefined;
  try {
    return new URL(
      value,
      process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    ).toString();
  } catch {
    return undefined;
  }
}

export function toPushNotificationPayload(
  notification: MessagePushInput,
): PushNotificationPayload {
  const senderName = notification.message.sender?.name ?? 'Someone';
  const target = targetLabel(notification);
  const text = snippet(notification);

  return {
    title: senderName,
    body: `${target}\n${text}`,
    href: `/w/${notification.workspaceId}/c/${notification.channel.id}?message=${notification.message.id}`,
    tag: `jeichat:message:${notification.workspaceId}:${notification.channel.id}`,
    icon: absoluteUrl(notification.message.sender?.image),
  };
}
