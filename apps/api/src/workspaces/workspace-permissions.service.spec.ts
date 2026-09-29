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
