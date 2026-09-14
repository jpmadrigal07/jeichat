export function uniqueRecipientIds(
  actorId: string,
  candidateIds: Array<string | null | undefined>,
): string[] {
  const ids = new Set<string>();
  for (const id of candidateIds) {
    if (id && id !== actorId) ids.add(id);
  }
  return [...ids];
}

export function messageNotificationRecipientIds(input: {
  isTicket: boolean;
  senderId: string;
  assigneeId: string | null;
  watcherIds: string[];
  memberIds: string[];
  mentionedUserIds?: string[];
}): string[] {
  const mentionedUserIds = input.mentionedUserIds ?? [];
  if (input.isTicket) {
    return uniqueRecipientIds(input.senderId, [
      input.assigneeId,
      ...input.watcherIds,
      ...mentionedUserIds,
    ]);
  }

  return uniqueRecipientIds(input.senderId, [
    ...input.memberIds,
    ...mentionedUserIds,
  ]);
}

export function isTicketMessageParticipant(
  userId: string,
  assigneeId: string | null,
  watcherIds: string[],
) {
  return assigneeId === userId || watcherIds.includes(userId);
}
