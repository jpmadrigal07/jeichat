import {
  withDefaultMemberRole,
  PERMISSIONS,
  type RolePermissionContext,
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
});
