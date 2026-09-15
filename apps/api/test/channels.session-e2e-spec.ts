import {
  guestEmail,
  resetPublicTables,
  signUp,
  signUpCreator,
  uniqueSuffix,
} from './helpers/session-client';

type ChannelRow = { id: string; name: string; parentId: string | null };

async function createWorkspaceWithGeneral() {
  const owner = await signUpCreator(0);
  const workspace = await owner.agent
    .post('/workspaces')
    .send({ name: `Tickets ${uniqueSuffix()}` });
  expect([200, 201]).toContain(workspace.status);
  const workspaceId = workspace.body.id as string;
  const channels = (await owner.agent
    .get(`/workspaces/${workspaceId}/channels`)
    .expect(200)).body as ChannelRow[];
  const general = channels.find((channel) => !channel.parentId);
  expect(general).toBeDefined();
  return { owner, workspaceId, general: general! };
}

describe('session e2e — channels and tickets', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('lets a member patch thread status and rejects ticket fields on a parent channel', async () => {
    const { owner, workspaceId, general } = await createWorkspaceWithGeneral();
    const member = await signUp(guestEmail(), 'Member');
    await owner.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ userId: member.user.id })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const thread = await member.agent
      .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
      .send({ name: `Ticket ${uniqueSuffix()}` });
    expect([200, 201]).toContain(thread.status);

    const patched = await member.agent
      .patch(`/workspaces/${workspaceId}/channels/${thread.body.id}`)
      .send({ status: 'done' });
    expect([200, 201]).toContain(patched.status);
    expect(patched.body.status).toBe('done');

    await member.agent
      .patch(`/workspaces/${workspaceId}/channels/${general.id}`)
      .send({ status: 'done' })
      .expect(400);
  });

  it('forbids a plain member from renaming a channel', async () => {
    const { owner, workspaceId, general } = await createWorkspaceWithGeneral();
    const member = await signUp(guestEmail(), 'Member');
    await owner.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ userId: member.user.id })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    await member.agent
      .patch(`/workspaces/${workspaceId}/channels/${general.id}`)
      .send({ name: 'hijacked' })
      .expect(403);
  });

  it('forbids a non-member from listing or posting in another workspace', async () => {
    const { workspaceId, general } = await createWorkspaceWithGeneral();
    const stranger = await signUp(guestEmail(), 'Stranger');

    await stranger.agent
      .get(`/workspaces/${workspaceId}/channels`)
      .expect(403);
    await stranger.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: 'nope' })
      .expect(403);
  });
});
