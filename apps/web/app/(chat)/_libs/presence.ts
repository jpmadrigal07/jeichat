export const presenceQueryKey = (workspaceId: string) =>
  ['presence', workspaceId] as const;

export type PresenceSnapshot = {
  workspaceId: string;
  userIds: string[];
};

export type PresenceUpdate = {
  workspaceId: string;
  userId: string;
  online: boolean;
};
