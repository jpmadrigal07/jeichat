import {
  connectSocket,
  connectSocketWithoutCookie,
  disconnectSocket,
  expectNoEvent,
  guestEmail,
  resetPublicTables,
  signUp,
  signUpCreator,
  uniqueSuffix,
  waitForConnect,
  waitForEvent,
} from './helpers/session-client';

type ChannelRow = { id: string; parentId: string | null };

async function workspaceWithMember() {
  const owner = await signUpCreator(0);
  const workspace = await owner.agent
    .post('/workspaces')
    .send({ name: `Gateway ${uniqueSuffix()}` });
  expect([200, 201]).toContain(workspace.status);
  const workspaceId = workspace.body.id as string;
  const member = await signUp(guestEmail(), 'Gw Member');
  await owner.agent
    .post(`/workspaces/${workspaceId}/members`)
    .send({ userId: member.user.id })
    .expect((res) => {
      expect([200, 201]).toContain(res.status);
    });
  const channels = (await owner.agent
    .get(`/workspaces/${workspaceId}/channels`)
    .expect(200)).body as ChannelRow[];
  const general = channels.find((channel) => !channel.parentId);
  expect(general).toBeDefined();
  return { owner, member, workspaceId, general: general! };
}

describe('session e2e — gateway', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('disconnects a socket with no cookie', async () => {
    const socket = connectSocketWithoutCookie();
    await waitForEvent(socket, 'disconnect');
    socket.close();
  });

  it('emits presence_snapshot on join_workspace and not presence_update on connect alone', async () => {
    const { owner, workspaceId } = await workspaceWithMember();
    const socket = connectSocket(owner.cookieHeader);
    await waitForConnect(socket);
    const noPresence = expectNoEvent(socket, 'presence_update', 400);
    socket.emit('join_workspace', { workspaceId });
    const snapshot = await waitForEvent<{
      workspaceId: string;
      userIds: string[];
    }>(socket, 'presence_snapshot');
    expect(snapshot.workspaceId).toBe(workspaceId);
    await noPresence;
    await disconnectSocket(socket);
  });

  it('delivers new_message only to sockets that joined the channel', async () => {
    const { owner, member, general } = await workspaceWithMember();
    const joined = connectSocket(owner.cookieHeader);
    const skipped = connectSocket(member.cookieHeader);
    await Promise.all([
      waitForConnect(joined),
      waitForConnect(skipped),
    ]);
    joined.emit('join_channel', { channelId: general.id });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const received = waitForEvent(joined, 'new_message');
    const posted = await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `gw ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);
    await received;
    await expectNoEvent(skipped, 'new_message', 400);

    await Promise.all([disconnectSocket(joined), disconnectSocket(skipped)]);
  });

  it('emits status_changed to both the ticket room and the parent room', async () => {
    const { owner, workspaceId, general } = await workspaceWithMember();
    const thread = await owner.agent
      .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
      .send({ name: `Ticket ${uniqueSuffix()}` });
    expect([200, 201]).toContain(thread.status);

    const parentSock = connectSocket(owner.cookieHeader);
    const ticketSock = connectSocket(owner.cookieHeader);
    await Promise.all([
      waitForConnect(parentSock),
      waitForConnect(ticketSock),
    ]);
    parentSock.emit('join_channel', { channelId: general.id });
    ticketSock.emit('join_channel', { channelId: thread.body.id });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const parentEvent = waitForEvent<{ type: string }>(
      parentSock,
      'channel_event',
    );
    const ticketEvent = waitForEvent<{ type: string }>(
      ticketSock,
      'channel_event',
    );

    await owner.agent
      .patch(`/workspaces/${workspaceId}/channels/${thread.body.id}`)
      .send({ status: 'in_progress' })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const [parentPayload, ticketPayload] = await Promise.all([
      parentEvent,
      ticketEvent,
    ]);
    expect(parentPayload.type).toBe('status_changed');
    expect(ticketPayload.type).toBe('status_changed');

    await Promise.all([
      disconnectSocket(parentSock),
      disconnectSocket(ticketSock),
    ]);
  });
});
