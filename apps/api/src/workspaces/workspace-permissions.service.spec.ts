import { WorkspacePermissionsService } from './workspace-permissions.service';
import { PERMISSIONS } from './permissions';

describe('WorkspacePermissionsService.filterUsersWhoCanViewChannel', () => {
  let service: WorkspacePermissionsService;
  let hasChannelPermission: jest.SpyInstance;

  beforeEach(() => {
    service = new WorkspacePermissionsService({} as never);
    hasChannelPermission = jest.spyOn(service, 'hasChannelPermission');
  });

  it('keeps only users with VIEW_CHANNEL, in the given order', async () => {
    hasChannelPermission.mockImplementation(
      (_ws: string, _channel: string, userId: string) =>
        Promise.resolve(userId !== 'outsider'),
    );

    await expect(
      service.filterUsersWhoCanViewChannel('ws-1', 'private-1', [
        'member',
        'outsider',
        'admin',
      ]),
    ).resolves.toEqual(['member', 'admin']);
    expect(hasChannelPermission).toHaveBeenCalledWith(
      'ws-1',
      'private-1',
      'outsider',
      PERMISSIONS.VIEW_CHANNEL,
    );
  });

  it('checks each user once', async () => {
    hasChannelPermission.mockResolvedValue(true);

    await expect(
      service.filterUsersWhoCanViewChannel('ws-1', 'private-1', [
        'member',
        'member',
      ]),
    ).resolves.toEqual(['member']);
    expect(hasChannelPermission).toHaveBeenCalledTimes(1);
  });

  it('returns nothing without checking when there are no users', async () => {
    await expect(
      service.filterUsersWhoCanViewChannel('ws-1', 'private-1', []),
    ).resolves.toEqual([]);
    expect(hasChannelPermission).not.toHaveBeenCalled();
  });
});

type AccessContext = {
  isPrivate: Map<string, boolean>;
  memberOf: Set<string>;
};

type Internals = {
  getMembership: (
    workspaceId: string,
    userId: string,
  ) => Promise<{ role: string } | null>;
  resolvePermissionChannelId: (channelId: string) => Promise<string | null>;
  loadChannelAccessContext: (
    userId: string,
    channelIds: string[],
  ) => Promise<AccessContext>;
  getUserRoles: (
    workspaceId: string,
    userId: string,
  ) => Promise<
    { id: string; isAdministrator: boolean; permissions: string[] }[]
  >;
};

function buildService(channelRows: { channelType: string }[]) {
  const db = {
    select: () => ({ from: () => ({ where: () => channelRows }) }),
  };
  const service = new WorkspacePermissionsService({ db } as never);
  const internals = service as unknown as Internals;
  const getMembership = jest.spyOn(internals, 'getMembership');
  const loadChannelAccessContext = jest.spyOn(
    internals,
    'loadChannelAccessContext',
  );
  const getUserRoles = jest.spyOn(internals, 'getUserRoles');
  jest
    .spyOn(internals, 'resolvePermissionChannelId')
    .mockImplementation((channelId) => Promise.resolve(channelId));
  return { service, getMembership, loadChannelAccessContext, getUserRoles };
}

describe('WorkspacePermissionsService.hasChannelPermission', () => {
  const memberOf = (...ids: string[]): AccessContext => ({
    isPrivate: new Map(),
    memberOf: new Set(ids),
  });

  it('denies a removed user their leftover DM membership', async () => {
    const { service, getMembership, loadChannelAccessContext } = buildService([
      { channelType: 'dm' },
    ]);
    getMembership.mockResolvedValue(null);
    loadChannelAccessContext.mockResolvedValue(memberOf('dm-1'));

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'dm-1',
        'removed',
        PERMISSIONS.VIEW_CHANNEL,
      ),
    ).resolves.toBe(false);
  });

  it('denies a removed user their leftover private channel membership', async () => {
    const { service, getMembership, loadChannelAccessContext } = buildService([
      { channelType: 'channel' },
    ]);
    getMembership.mockResolvedValue(null);
    loadChannelAccessContext.mockResolvedValue(memberOf('private-1'));

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'private-1',
        'removed',
        PERMISSIONS.SEND_MESSAGES,
      ),
    ).resolves.toBe(false);
  });

  it('denies a removed user their leftover role assignment', async () => {
    const { service, getMembership, getUserRoles } = buildService([
      { channelType: 'channel' },
    ]);
    getMembership.mockResolvedValue(null);
    getUserRoles.mockResolvedValue([
      { id: 'role-1', isAdministrator: true, permissions: [] },
    ]);

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'general',
        'removed',
        PERMISSIONS.VIEW_CHANNEL,
      ),
    ).resolves.toBe(false);
  });

  it('still lets a workspace member into a DM they belong to', async () => {
    const { service, getMembership, loadChannelAccessContext } = buildService([
      { channelType: 'dm' },
    ]);
    getMembership.mockResolvedValue({ role: 'member' });
    loadChannelAccessContext.mockResolvedValue(memberOf('dm-1'));

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'dm-1',
        'member',
        PERMISSIONS.VIEW_CHANNEL,
      ),
    ).resolves.toBe(true);
  });

  it('keeps a workspace member out of a DM they do not belong to', async () => {
    const { service, getMembership, loadChannelAccessContext } = buildService([
      { channelType: 'dm' },
    ]);
    getMembership.mockResolvedValue({ role: 'owner' });
    loadChannelAccessContext.mockResolvedValue(memberOf());

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'dm-1',
        'owner',
        PERMISSIONS.VIEW_CHANNEL,
      ),
    ).resolves.toBe(false);
  });

  it('lets a workspace owner into any channel', async () => {
    const { service, getMembership } = buildService([
      { channelType: 'channel' },
    ]);
    getMembership.mockResolvedValue({ role: 'owner' });

    await expect(
      service.hasChannelPermission(
        'ws-1',
        'private-1',
        'owner',
        PERMISSIONS.MANAGE_CHANNEL,
      ),
    ).resolves.toBe(true);
  });
});

describe('WorkspacePermissionsService.filterViewableChannelIds', () => {
  it('returns nothing for a user who is not in the workspace', async () => {
    const { service, getMembership, getUserRoles } = buildService([]);
    getMembership.mockResolvedValue(null);

    await expect(
      service.filterViewableChannelIds('ws-1', 'removed', ['a', 'dm-1']),
    ).resolves.toEqual(new Set());
    expect(getUserRoles).not.toHaveBeenCalled();
  });

  it('returns every channel for a workspace owner without DMs', async () => {
    const { service, getMembership } = buildService([]);
    getMembership.mockResolvedValue({ role: 'owner' });

    await expect(
      service.filterViewableChannelIds('ws-1', 'owner', ['a', 'b']),
    ).resolves.toEqual(new Set(['a', 'b']));
  });
});
