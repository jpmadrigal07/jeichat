describe('session e2e — bots (not implemented)', () => {
  it.todo('accepts a Bot token on allowed routes and returns 403 elsewhere');
  it.todo('returns the bot user and workspaceId from GET /bots/@me');
  it.todo('returns 401 and disconnects sockets after the token is revoked');
  it.todo('rejects adding a bot to a different workspace');
  it.todo('rejects DMs when either participant is a bot');
  it.todo(
    'does not fan out public-channel notifications for bot-authored messages',
  );
  it.todo('still fans out public-channel notifications for human messages');
  it.todo('delivers new_message to a connected bot without join_channel');
  it.todo('stops delivering a channel after the bot loses VIEW_CHANNEL');
  it.todo('does not drop a human socket when a bot loses channel access');
});
