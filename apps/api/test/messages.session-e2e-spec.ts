import {
  connectSocket,
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

type ChannelRow = { id: string; name: string; parentId: string | null };

async function seededWorkspace() {
  const owner = await signUpCreator(0);
  const workspace = await owner.agent
    .post('/workspaces')
    .send({ name: `Notify ${uniqueSuffix()}` });
  expect([200, 201]).toContain(workspace.status);
  const workspaceId = workspace.body.id as string;

  const member = await signUp(guestEmail(), 'Member B');
  const extra = await signUp(guestEmail(), 'Member C');
  await owner.agent
    .post(`/workspaces/${workspaceId}/members`)
    .send({ userId: member.user.id })
    .expect((res) => {
      expect([200, 201]).toContain(res.status);
    });
  await owner.agent
    .post(`/workspaces/${workspaceId}/members`)
    .send({ userId: extra.user.id })
    .expect((res) => {
      expect([200, 201]).toContain(res.status);
    });

  const channels = (await owner.agent
    .get(`/workspaces/${workspaceId}/channels`)
    .expect(200)).body as ChannelRow[];
  const general = channels.find((channel) => !channel.parentId);
  expect(general).toBeDefined();

  return { owner, member, extra, workspaceId, general: general! };
}

describe('session e2e — messages and notifications', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('notifies every other public-channel member and not the sender', async () => {
    const { owner, member, extra, general } = await seededWorkspace();
    const ownerSock = connectSocket(owner.cookieHeader);
    const memberSock = connectSocket(member.cookieHeader);
    const extraSock = connectSocket(extra.cookieHeader);
    await Promise.all([
      waitForConnect(ownerSock),
      waitForConnect(memberSock),
      waitForConnect(extraSock),
    ]);

    const memberNote = waitForEvent(memberSock, 'message_notification');
    const extraNote = waitForEvent(extraSock, 'message_notification');
    const senderSilence = expectNoEvent(ownerSock, 'message_notification', 600);

    const posted = await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `hello ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);

    await Promise.all([memberNote, extraNote, senderSilence]);

    await Promise.all([
      disconnectSocket(ownerSock),
      disconnectSocket(memberSock),
      disconnectSocket(extraSock),
    ]);
  });

  it('notifies ticket assignee/watchers only, not every workspace member', async () => {
    const { owner, member, extra, workspaceId, general } =
      await seededWorkspace();

    const thread = await owner.agent
      .post(`/workspaces/${workspaceId}/channels/${general.id}/threads`)
      .send({ name: `Ticket ${uniqueSuffix()}` });
    expect([200, 201]).toContain(thread.status);

    await owner.agent
      .patch(`/workspaces/${workspaceId}/channels/${thread.body.id}`)
      .send({ assigneeId: member.user.id })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const ownerSock = connectSocket(owner.cookieHeader);
    const memberSock = connectSocket(member.cookieHeader);
    const extraSock = connectSocket(extra.cookieHeader);
    await Promise.all([
      waitForConnect(ownerSock),
      waitForConnect(memberSock),
      waitForConnect(extraSock),
    ]);

    const assigneeNote = waitForEvent(memberSock, 'message_notification');
    const extraSilence = expectNoEvent(extraSock, 'message_notification', 600);

    const posted = await owner.agent
      .post(`/channels/${thread.body.id}/messages`)
      .send({ content: `ticket ping ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);

    await Promise.all([assigneeNote, extraSilence]);

    await Promise.all([
      disconnectSocket(ownerSock),
      disconnectSocket(memberSock),
      disconnectSocket(extraSock),
    ]);
  });

  it('emits new_message with sender name and image and without isBot', async () => {
    const { owner, general } = await seededWorkspace();
    const socket = connectSocket(owner.cookieHeader);
    await waitForConnect(socket);
    socket.emit('join_channel', { channelId: general.id });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const incoming = waitForEvent<{
      sender?: { name?: string; image?: string | null; isBot?: boolean };
    }>(socket, 'new_message');

    const posted = await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `shape ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);

    const payload = await incoming;
    expect(payload.sender).toEqual(
      expect.objectContaining({
        name: expect.any(String),
      }),
    );
    expect(payload.sender).toHaveProperty('image');
    expect(payload.sender).not.toHaveProperty('isBot');

    await disconnectSocket(socket);
  });
});
