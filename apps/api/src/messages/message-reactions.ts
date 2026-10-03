import { BadRequestException } from '@nestjs/common';

const MAX_EMOJI_LENGTH = 32;

export function normalizeReactionEmoji(raw: string): string {
  const emoji = raw.trim();
  if (!emoji) {
    throw new BadRequestException('Emoji is required');
  }
  if (emoji.length > MAX_EMOJI_LENGTH) {
    throw new BadRequestException('Emoji is too long');
  }
  if (/[\u0000-\u001F\u007F]/.test(emoji)) {
    throw new BadRequestException('Invalid emoji');
  }
  return emoji;
}

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe: boolean;
  users: { id: string; name: string }[];
};

export type MessageReactionsPayload = {
  messageId: string;
  channelId: string;
  reactions: MessageReactionSummary[];
};
