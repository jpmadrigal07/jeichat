export type MessageCursor = {
  createdAt: Date;
  id: string;
};

export function encodeMessageCursor(createdAt: Date, id: string): string {
  return `${createdAt.toISOString()}_${id}`;
}

export function parseMessageCursor(cursor: string): MessageCursor | null {
  const separatorIndex = cursor.indexOf('_');
  if (separatorIndex === -1) return null;
  const createdAt = new Date(cursor.slice(0, separatorIndex));
  const id = cursor.slice(separatorIndex + 1);
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

export function aroundWindowSizes(limit: number): {
  older: number;
  newer: number;
} {
  const older = Math.floor(limit / 2);
  const newer = Math.max(limit - older - 1, 0);
  return { older, newer };
}
