import {
  createAgent,
  loadSessionE2eMeta,
  resetPublicTables,
  signUpCreator,
} from './helpers/session-client';

const AVATAR_FILE = '11111111-1111-4111-8111-111111111111.webp';

describe('session e2e — public vs 401', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('serves public routes without a cookie', async () => {
    const agent = createAgent();
    await agent.get('/').expect(200);
    await agent.get('/sample').expect(200);

    const avatar = await agent.get(
      `/users/00000000-0000-4000-8000-000000000000/avatar/${AVATAR_FILE}`,
    );
    expect(avatar.status).not.toBe(401);
  });

  it('serves /demo/slow without a cookie', async () => {
    const agent = createAgent();
    await agent.get('/demo/slow').expect(200);
  }, 35_000);

  it('rejects protected routes without a cookie', async () => {
    const agent = createAgent();
    await agent.get('/auth/me').expect(401);
    await agent.get('/workspaces').expect(401);
    await agent
      .post('/channels/00000000-0000-4000-8000-000000000000/messages')
      .send({ content: 'hi' })
      .expect(401);
  });

  it('returns the session after sign-up', async () => {
    const meta = loadSessionE2eMeta();
    const { agent } = await signUpCreator(0);
    const me = await agent.get('/auth/me').expect(200);
    expect(me.body.user.email).toBe(meta.creatorEmails[0]);
  });
});
