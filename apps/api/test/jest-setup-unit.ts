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
