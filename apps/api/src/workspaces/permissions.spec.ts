import {
  withDefaultMemberRole,
  resolveChannelPermission,
  PERMISSIONS,
  type RolePermissionContext,
  type ChannelPermissionOverride,
} from './permissions';

const adminRole: RolePermissionContext = {
  id: 'admin',
  isAdministrator: true,
  permissions: [],
};

describe('withDefaultMemberRole', () => {
  it('keeps assigned roles', () => {
    expect(withDefaultMemberRole([adminRole], true)).toEqual([adminRole]);
  });

  it('gives invited members public channel access', () => {
    const roles = withDefaultMemberRole([], true);
    expect(roles).toHaveLength(1);
    expect(roles[0]?.permissions).toEqual([
      PERMISSIONS.VIEW_CHANNEL,
      PERMISSIONS.SEND_MESSAGES,
    ]);
  });

  it('does not grant access to non-members', () => {
    expect(withDefaultMemberRole([], false)).toEqual([]);
  });

  it('replaces implicit grants when any role is assigned', () => {
    const narrow: RolePermissionContext = {
      id: 'ticket-bot',
      isAdministrator: false,
      permissions: [PERMISSIONS.MANAGE_CHANNEL],
    };
    const roles = withDefaultMemberRole([narrow], true);
    expect(roles).toEqual([narrow]);
    expect(roles[0]?.permissions).not.toContain(PERMISSIONS.VIEW_CHANNEL);
    expect(roles[0]?.permissions).not.toContain(PERMISSIONS.SEND_MESSAGES);
  });
});

const member: RolePermissionContext = {
  id: 'member',
  isAdministrator: false,
  permissions: [PERMISSIONS.VIEW_CHANNEL, PERMISSIONS.SEND_MESSAGES],
};

const manager: RolePermissionContext = {
  id: 'manager',
  isAdministrator: false,
  permissions: [PERMISSIONS.MANAGE_CHANNEL],
};

function emptyOverrides() {
  return new Map<string, ChannelPermissionOverride>();
}

describe('resolveChannelPermission', () => {
  it('lets an administrator bypass overrides and private-channel rules', () => {
    const denyAll: ChannelPermissionOverride = {
      allowPermissions: [],
      denyPermissions: [
        PERMISSIONS.VIEW_CHANNEL,
        PERMISSIONS.SEND_MESSAGES,
        PERMISSIONS.MANAGE_CHANNEL,
      ],
    };
    const overrides = new Map([[adminRole.id, denyAll]]);
    expect(
      resolveChannelPermission([adminRole], overrides, PERMISSIONS.VIEW_CHANNEL, {
        privateChannel: true,
      }),
    ).toBe(true);
  });

  it('returns false when the member has no roles', () => {
    expect(
      resolveChannelPermission([], emptyOverrides(), PERMISSIONS.VIEW_CHANNEL),
    ).toBe(false);
  });

  it('lets a deny override beat an allow override', () => {
    const overrides = new Map<string, ChannelPermissionOverride>([
      [
        member.id,
        {
          allowPermissions: [PERMISSIONS.SEND_MESSAGES],
          denyPermissions: [PERMISSIONS.SEND_MESSAGES],
        },
      ],
    ]);
    expect(
      resolveChannelPermission([member], overrides, PERMISSIONS.SEND_MESSAGES),
    ).toBe(false);
  });

  it('ignores workspace VIEW_CHANNEL and SEND_MESSAGES on a private channel', () => {
    expect(
      resolveChannelPermission(
        [member],
        emptyOverrides(),
        PERMISSIONS.VIEW_CHANNEL,
        { privateChannel: true },
      ),
    ).toBe(false);
    expect(
      resolveChannelPermission(
        [member],
        emptyOverrides(),
        PERMISSIONS.SEND_MESSAGES,
        { privateChannel: true },
      ),
    ).toBe(false);
  });

  it('grants VIEW_CHANNEL on a private channel to roles with MANAGE_CHANNEL', () => {
    expect(
      resolveChannelPermission(
        [manager],
        emptyOverrides(),
        PERMISSIONS.VIEW_CHANNEL,
        { privateChannel: true },
      ),
    ).toBe(true);
  });

  it('drops public-channel access for a narrow role without VIEW_CHANNEL', () => {
    expect(
      resolveChannelPermission(
        [manager],
        emptyOverrides(),
        PERMISSIONS.VIEW_CHANNEL,
      ),
    ).toBe(false);
    expect(
      resolveChannelPermission(
        [manager],
        emptyOverrides(),
        PERMISSIONS.SEND_MESSAGES,
      ),
    ).toBe(false);
  });
});
