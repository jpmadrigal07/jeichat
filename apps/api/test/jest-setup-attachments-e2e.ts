process.env.R2_ACCOUNT_ID ??= 'test-account-id';
process.env.R2_ACCESS_KEY_ID ??= 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY ??= 'test-secret-key';
process.env.R2_BUCKET ??= 'jeichat-attachments-test';
process.env.R2_MAX_UPLOAD_BYTES ??= String(26_214_400);

/** Switched per test via setE2eSessionUserId(). */
export let e2eSessionUserId = 'user-sender';

export function setE2eSessionUserId(userId: string) {
  e2eSessionUserId = userId;
}

jest.mock('../src/auth/auth', () => ({
  auth: {},
}));

jest.mock('@thallesp/nestjs-better-auth', () => {
  const { SetMetadata, createParamDecorator } =
    require('@nestjs/common') as typeof import('@nestjs/common');
  const setup = require('./jest-setup-attachments-e2e') as typeof import('./jest-setup-attachments-e2e');

  class MockAuthModule {}

  return {
    AuthModule: {
      forRoot: () => ({
        module: MockAuthModule,
        providers: [],
        imports: [],
        exports: [],
        controllers: [],
      }),
    },
    AllowAnonymous: () => SetMetadata('PUBLIC', true),
    Session: createParamDecorator(() => ({
      user: {
        id: setup.e2eSessionUserId,
        name: 'E2E User',
        email: 'e2e@test.local',
      },
      session: { id: 'e2e-session' },
    })),
  };
});
