export const PERMISSIONS = {
  VIEW_CHANNEL: 'VIEW_CHANNEL',
  SEND_MESSAGES: 'SEND_MESSAGES',
  MANAGE_CHANNEL: 'MANAGE_CHANNEL',
  MANAGE_MESSAGES: 'MANAGE_MESSAGES',
  MANAGE_ROLES: 'MANAGE_ROLES',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export const PERMISSION_LABELS: Record<Permission, string> = {
  VIEW_CHANNEL: 'View channel',
  SEND_MESSAGES: 'Send messages',
  MANAGE_CHANNEL: 'Manage channel',
  MANAGE_MESSAGES: 'Manage messages',
  MANAGE_ROLES: 'Manage roles',
};
