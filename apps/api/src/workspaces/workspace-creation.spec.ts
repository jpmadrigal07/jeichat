import {
  canCreateWorkspace,
  parseWorkspaceCreatorEmails,
} from './workspace-creation';

describe('canCreateWorkspace', () => {
  const allowlist = parseWorkspaceCreatorEmails(
    'jp.madrigal07@gmail.com, other@example.com',
  );

  it('allows the configured creator email case-insensitively', () => {
    expect(canCreateWorkspace('JP.Madrigal07@gmail.com', allowlist)).toBe(
      true,
    );
  });

  it('rejects everyone else', () => {
    expect(canCreateWorkspace('teammate@example.com', allowlist)).toBe(false);
  });

  it('defaults to the in-house creator when env is unset', () => {
    expect(
      canCreateWorkspace(
        'jp.madrigal07@gmail.com',
        parseWorkspaceCreatorEmails(undefined),
      ),
    ).toBe(true);
  });
});
