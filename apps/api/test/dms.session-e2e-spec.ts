import {
  guestEmail,
  resetPublicTables,
  signUp,
  signUpCreator,
  uniqueSuffix,
} from './helpers/session-client';

describe('session e2e — dms', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('returns the same channel for a repeated pair and rejects self or non-member targets', async () => {
    const owner = await signUpCreator(0);
    const workspace = await owner.agent
      .post('/workspaces')
      .send({ name: `DMs ${uniqueSuffix()}` });
    expect([200, 201]).toContain(workspace.status);
    const workspaceId = workspace.body.id as string;

    const peer = await signUp(guestEmail(), 'Peer');
    await owner.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ userId: peer.user.id })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const first = await owner.agent
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: peer.user.id });
    expect([200, 201]).toContain(first.status);

    const second = await owner.agent
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: peer.user.id });
    expect([200, 201]).toContain(second.status);
    expect(second.body.id).toBe(first.body.id);

    await owner.agent
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: owner.user.id })
      .expect(400);

    const outsider = await signUp(guestEmail(), 'Outsider');
    await owner.agent
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: outsider.user.id })
      .expect(400);
  });
});
