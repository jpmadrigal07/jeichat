import {
  connectBotSocket,
  connectSocket,
  createAgent,
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
    .send({ name: `Bots ${uniqueSuffix()}` });
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

  const channels = (
    await owner.agent.get(`/workspaces/${workspaceId}/channels`).expect(200)
  ).body as ChannelRow[];
  const general = channels.find((channel) => !channel.parentId);
  expect(general).toBeDefined();

  return { owner, member, extra, workspaceId, general: general! };
}

function botRequest(token: string) {
  return createAgent().set('Authorization', `Bot ${token}`);
}

describe('session e2e — bots', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('lets the owner create a bot and shows the token once', async () => {
    const { owner, workspaceId } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Alerts' });
    expect([200, 201]).toContain(created.status);
    expect(created.body.token).toMatch(/^jei_live_/);
    expect(created.body.tokenPrefix).toBeDefined();

    const listed = await owner.agent
      .get(`/workspaces/${workspaceId}/bots`)
      .expect(200);
    expect(listed.body[0].token).toBeUndefined();
    expect(listed.body[0].name).toBe('Alerts');
  });

  it('accepts a Bot token on allowed routes and returns 403 elsewhere', async () => {
    const { owner, workspaceId, general } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Route Bot' });
    const token = created.body.token as string;
    const bot = botRequest(token);

    const me = await bot.get('/bots/@me').expect(200);
    expect(me.body.workspaceId).toBe(workspaceId);
    expect(me.body.userId).toBe(created.body.userId);

    const posted = await bot
      .post(`/channels/${general.id}/messages`)
      .send({ content: `bot ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);
    expect(posted.body.sender.isBot).toBe(true);

    await bot.get('/auth/me').expect(403);
    await bot.get(`/workspaces/${workspaceId}/inbox`).expect(403);
    await bot
      .get(`/workspaces/${workspaceId}/channels/unread-counts`)
      .expect(403);
  });

  it('rejects adding a bot to a different workspace', async () => {
    const { owner, workspaceId } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Tenant Bot' });
    const otherOwner = await signUpCreator(1);
    const other = await otherOwner.agent
      .post('/workspaces')
      .send({ name: `Other ${uniqueSuffix()}` });
    expect([200, 201]).toContain(other.status);

    await otherOwner.agent
      .post(`/workspaces/${other.body.id}/members`)
      .send({ userId: created.body.userId })
      .expect(403);
  });

  it('rejects DMs when either participant is a bot', async () => {
    const { owner, member, workspaceId } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Dm Bot' });
    const token = created.body.token as string;

    await owner.agent
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: created.body.userId })
      .expect(403);
    await botRequest(token)
      .post(`/workspaces/${workspaceId}/channels/dms`)
      .send({ userId: member.user.id })
      .expect(403);
  });

  it('does not fan out public-channel notifications for bot-authored messages', async () => {
    const { owner, member, extra, workspaceId, general } =
      await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Quiet Bot' });
    const token = created.body.token as string;

    const memberSock = connectSocket(member.cookieHeader);
    const extraSock = connectSocket(extra.cookieHeader);
    await Promise.all([waitForConnect(memberSock), waitForConnect(extraSock)]);

    const mentioned = waitForEvent(memberSock, 'message_notification');
    const extraSilence = expectNoEvent(extraSock, 'message_notification', 600);
    const unmentionedSilence = expectNoEvent(
      extraSock,
      'message_notification',
      600,
    );

    await botRequest(token)
      .post(`/channels/${general.id}/messages`)
      .send({ content: `@Member B ping ${uniqueSuffix()}` })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    await Promise.all([mentioned, extraSilence, unmentionedSilence]);

    await Promise.all([
      disconnectSocket(memberSock),
      disconnectSocket(extraSock),
    ]);
  });

  it('still fans out public-channel notifications for human messages', async () => {
    const { owner, member, extra, general } = await seededWorkspace();
    const memberSock = connectSocket(member.cookieHeader);
    const extraSock = connectSocket(extra.cookieHeader);
    await Promise.all([waitForConnect(memberSock), waitForConnect(extraSock)]);

    const memberNote = waitForEvent(memberSock, 'message_notification');
    const extraNote = waitForEvent(extraSock, 'message_notification');

    const posted = await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `human ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);

    await Promise.all([memberNote, extraNote]);
    await Promise.all([
      disconnectSocket(memberSock),
      disconnectSocket(extraSock),
    ]);
  });

  it('delivers new_message to a connected bot without join_channel', async () => {
    const { owner, workspaceId, general } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Listen Bot' });
    const token = created.body.token as string;
    const botSock = connectBotSocket(token);
    await waitForConnect(botSock);

    const incoming = waitForEvent(botSock, 'new_message');
    const posted = await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `hello bot ${uniqueSuffix()}` });
    expect([200, 201]).toContain(posted.status);
    await incoming;
    await disconnectSocket(botSock);
  });

  it('stops delivering a channel after the bot loses VIEW_CHANNEL', async () => {
    const { owner, workspaceId, general } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Private Bot' });
    const token = created.body.token as string;
    const botUserId = created.body.userId as string;

    const privateChannel = await owner.agent
      .post(`/workspaces/${workspaceId}/channels`)
      .send({
        name: `secret-${uniqueSuffix()}`,
        isPrivate: true,
        memberIds: [botUserId],
      });
    expect([200, 201]).toContain(privateChannel.status);

    const botSock = connectBotSocket(token);
    await waitForConnect(botSock);
    await new Promise((resolve) => setTimeout(resolve, 200));

    const first = waitForEvent(botSock, 'new_message');
    await owner.agent
      .post(`/channels/${privateChannel.body.id}/messages`)
      .send({ content: `inside ${uniqueSuffix()}` })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });
    await first;

    await owner.agent
      .delete(
        `/workspaces/${workspaceId}/channels/${privateChannel.body.id}/members/${botUserId}`,
      )
      .expect((res) => {
        expect([200, 204]).toContain(res.status);
      });
    await new Promise((resolve) => setTimeout(resolve, 200));

    const silence = expectNoEvent(botSock, 'new_message', 600);
    await owner.agent
      .post(`/channels/${privateChannel.body.id}/messages`)
      .send({ content: `after kick ${uniqueSuffix()}` })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });
    await silence;

    const stillPublic = waitForEvent(botSock, 'new_message');
    await owner.agent
      .post(`/channels/${general.id}/messages`)
      .send({ content: `still public ${uniqueSuffix()}` })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });
    await stillPublic;
    await disconnectSocket(botSock);
  });

  it('does not drop a human socket when a bot loses channel access', async () => {
    const { owner, member, workspaceId } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Kick Bot' });
    const privateChannel = await owner.agent
      .post(`/workspaces/${workspaceId}/channels`)
      .send({
        name: `keep-${uniqueSuffix()}`,
        isPrivate: true,
        memberIds: [member.user.id, created.body.userId],
      });
    expect([200, 201]).toContain(privateChannel.status);

    const humanSock = connectSocket(member.cookieHeader);
    await waitForConnect(humanSock);
    humanSock.emit('join_channel', { channelId: privateChannel.body.id });
    await new Promise((resolve) => setTimeout(resolve, 100));

    await owner.agent
      .delete(
        `/workspaces/${workspaceId}/channels/${privateChannel.body.id}/members/${created.body.userId}`,
      )
      .expect((res) => {
        expect([200, 204]).toContain(res.status);
      });

    const received = waitForEvent(humanSock, 'new_message');
    await owner.agent
      .post(`/channels/${privateChannel.body.id}/messages`)
      .send({ content: `human still here ${uniqueSuffix()}` })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });
    await received;
    await disconnectSocket(humanSock);
  });

  it('returns 401 and disconnects sockets after the token is revoked', async () => {
    const { owner, workspaceId } = await seededWorkspace();
    const created = await owner.agent
      .post(`/workspaces/${workspaceId}/bots`)
      .send({ name: 'Revoke Bot' });
    const token = created.body.token as string;
    const botSock = connectBotSocket(token);
    await waitForConnect(botSock);
    const disconnected = waitForEvent(botSock, 'disconnect');

    await owner.agent
      .post(`/workspaces/${workspaceId}/bots/${created.body.id}/disable`)
      .expect(200);

    await disconnected;
    await botRequest(token).get('/bots/@me').expect(401);
    botSock.close();
  });
});
