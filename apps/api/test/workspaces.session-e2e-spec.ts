import {
  guestEmail,
  resetPublicTables,
  signUp,
  signUpCreator,
  uniqueSuffix,
} from './helpers/session-client';

describe('session e2e — workspaces and members', () => {
  beforeEach(async () => {
    await resetPublicTables();
  });

  it('lets an allowlisted email create a workspace and forbids others', async () => {
    const owner = await signUpCreator(0);
    const created = await owner.agent
      .post('/workspaces')
      .send({ name: `Lock ${uniqueSuffix()}` });
    expect([200, 201]).toContain(created.status);
    expect(created.body.id).toEqual(expect.any(String));

    const guest = await signUp(guestEmail(), 'Guest');
    await guest.agent
      .post('/workspaces')
      .send({ name: `Denied ${uniqueSuffix()}` })
      .expect(403);
  });

  it('lets the owner add members by email and userId; non-owners get 403', async () => {
    const owner = await signUpCreator(0);
    const workspace = await owner.agent
      .post('/workspaces')
      .send({ name: `Members ${uniqueSuffix()}` });
    expect([200, 201]).toContain(workspace.status);
    const workspaceId = workspace.body.id as string;

    const byEmail = await signUp(guestEmail(), 'By Email');
    await owner.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ email: byEmail.user.email })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    const byId = await signUp(guestEmail(), 'By Id');
    await owner.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ userId: byId.user.id })
      .expect((res) => {
        expect([200, 201]).toContain(res.status);
      });

    await byEmail.agent
      .post(`/workspaces/${workspaceId}/members`)
      .send({ email: byId.user.email })
      .expect(403);
  });
});
