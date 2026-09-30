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

  describe('creating a ticket with an assignee', () => {
    type InboxItem = { type: string; channel: { id: string } };

    async function addMember(
      owner: Awaited<ReturnType<typeof createWorkspaceWithGeneral>>['owner'],
      workspaceId: string,
      name: string,
    ) {
      const member = await signUp(guestEmail(), name);
      await owner.agent
        .post(`/workspaces/${workspaceId}/members`)
        .send({ userId: member.user.id })
        .expect((res) => {
          expect([200, 201]).toContain(res.status);
        });
      return member;
    }

    async function assignedNotifications(
      member: Awaited<ReturnType<typeof signUp>>,
      workspaceId: string,
    ) {
      const inbox = await member.agent
        .get(`/workspaces/${workspaceId}/inbox`)
        .expect(200);
      return (inbox.body.items as InboxItem[]).filter(
        (item) => item.type === 'assigned',
      );
    }

    it('saves the assignee and notifies them', async () => {
      const { owner, workspaceId, general } = await createWorkspaceWithGeneral();
      const member = await addMember(owner, workspaceId, 'Assignee');

      const thread = await owner.agent
        .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
        .send({ name: `Ticket ${uniqueSuffix()}`, assigneeId: member.user.id });
      expect([200, 201]).toContain(thread.status);
      expect(thread.body.assigneeId).toBe(member.user.id);

      const assigned = await assignedNotifications(member, workspaceId);
      expect(assigned).toHaveLength(1);
      expect(assigned[0]?.channel.id).toBe(thread.body.id);
    });

    it('rejects an assignee who is not a workspace member and creates no ticket', async () => {
      const { owner, workspaceId, general } = await createWorkspaceWithGeneral();
      const stranger = await signUp(guestEmail(), 'Stranger');

      const rejected = await owner.agent
        .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
        .send({ name: `Ticket ${uniqueSuffix()}`, assigneeId: stranger.user.id });
      expect(rejected.status).toBe(400);

      const threads = await owner.agent
        .get(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
        .expect(200);
      expect(threads.body).toHaveLength(0);
    });

    it('leaves the ticket unassigned when the assignee is omitted or null', async () => {
      const { owner, workspaceId, general } = await createWorkspaceWithGeneral();
      const member = await addMember(owner, workspaceId, 'Bystander');

      const omitted = await owner.agent
        .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
        .send({ name: `Ticket ${uniqueSuffix()}` });
      expect([200, 201]).toContain(omitted.status);
      expect(omitted.body.assigneeId).toBeNull();

      const explicitNull = await owner.agent
        .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
        .send({ name: `Ticket ${uniqueSuffix()}`, assigneeId: null });
      expect([200, 201]).toContain(explicitNull.status);
      expect(explicitNull.body.assigneeId).toBeNull();

      expect(await assignedNotifications(member, workspaceId)).toHaveLength(0);
    });
  });
});
