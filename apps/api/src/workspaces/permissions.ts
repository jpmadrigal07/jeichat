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

export const DEFAULT_ADMIN_ROLE_NAME = 'Administrator';

export function parsePermissions(json: string): Permission[] {
  try {
    const parsed: unknown = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is Permission =>
      ALL_PERMISSIONS.includes(p as Permission),
    );
  } catch {
    return [];
  }
}

export type RolePermissionContext = {
  id: string;
  isAdministrator: boolean;
  permissions: Permission[];
};

export type ChannelPermissionOverride = {
  allowPermissions: Permission[];
  denyPermissions: Permission[];
};

export const CHANNEL_MEMBER_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_CHANNEL,
  PERMISSIONS.SEND_MESSAGES,
];

/** Workspace members with no extra role still get public-channel access. */
export const DEFAULT_MEMBER_PERMISSIONS: Permission[] = [
  PERMISSIONS.VIEW_CHANNEL,
  PERMISSIONS.SEND_MESSAGES,
];

const EVERYONE_ROLE: RolePermissionContext = {
  id: '__everyone__',
  isAdministrator: false,
  permissions: DEFAULT_MEMBER_PERMISSIONS,
};

export function withDefaultMemberRole(
  roles: RolePermissionContext[],
  isWorkspaceMember: boolean,
): RolePermissionContext[] {
  if (roles.length > 0) return roles;
  if (!isWorkspaceMember) return [];
  return [EVERYONE_ROLE];
}

export const PRIVATE_CHANNEL_WORKSPACE_PERMISSIONS: Permission[] = [
  PERMISSIONS.MANAGE_CHANNEL,
  PERMISSIONS.MANAGE_ROLES,
];

export function isChannelMemberPermission(permission: Permission): boolean {
  return CHANNEL_MEMBER_PERMISSIONS.includes(permission);
}

export function resolveChannelPermission(
  roles: RolePermissionContext[],
  channelOverrides: Map<string, ChannelPermissionOverride>,
  permission: Permission,
  options?: { privateChannel?: boolean },
): boolean {
  if (roles.some((role) => role.isAdministrator)) return true;
  if (roles.length === 0) return false;

  const privateChannel = options?.privateChannel ?? false;
  let allowed = false;
  let denied = false;

  for (const role of roles) {
    const override = channelOverrides.get(role.id);
    if (override?.denyPermissions.includes(permission)) {
      denied = true;
    }

    const workspaceGrant = privateChannel
      ? PRIVATE_CHANNEL_WORKSPACE_PERMISSIONS.includes(permission) &&
        role.permissions.includes(permission)
      : role.permissions.includes(permission);

    const managesPrivateChannel =
      privateChannel &&
      permission === PERMISSIONS.VIEW_CHANNEL &&
      role.permissions.includes(PERMISSIONS.MANAGE_CHANNEL);

    if (
      workspaceGrant ||
      managesPrivateChannel ||
      override?.allowPermissions.includes(permission)
    ) {
      allowed = true;
    }
  }

  if (denied) return false;
  return allowed;
}
