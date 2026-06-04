process.env.R2_ACCOUNT_ID ??= 'test-account-id';
process.env.R2_ACCESS_KEY_ID ??= 'test-access-key';
process.env.R2_SECRET_ACCESS_KEY ??= 'test-secret-key';
process.env.R2_BUCKET ??= 'jeichat-attachments-test';

jest.mock('../src/auth/auth', () => ({
  auth: {},
}));

jest.mock('../src/database/drizzle.service', () => ({
  DrizzleService: class MockDrizzleService {
    db = {};
    async onModuleInit() {}
    async onModuleDestroy() {}
  },
}));

jest.mock('@thallesp/nestjs-better-auth', () => {
  const { SetMetadata, createParamDecorator } =
    require('@nestjs/common') as typeof import('@nestjs/common');

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
    Session: createParamDecorator(() => undefined),
  };
});
