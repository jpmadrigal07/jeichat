import {
  parseNotificationLevel,
  splitRecipientsByLevel,
  type NotificationLevel,
} from './notification-level';

describe('parseNotificationLevel', () => {
  it('accepts the three levels', () => {
    expect(parseNotificationLevel('all')).toBe('all');
    expect(parseNotificationLevel('mentions')).toBe('mentions');
    expect(parseNotificationLevel('muted')).toBe('muted');
  });

  it('rejects anything else', () => {
    expect(parseNotificationLevel('loud')).toBeNull();
    expect(parseNotificationLevel('')).toBeNull();
    expect(parseNotificationLevel(undefined)).toBeNull();
    expect(parseNotificationLevel(1)).toBeNull();
  });
});

describe('splitRecipientsByLevel', () => {
  const levels = new Map<string, NotificationLevel>([
    ['mentions-user', 'mentions'],
    ['muted-user', 'muted'],
  ]);
  const recipientIds = ['default-user', 'mentions-user', 'muted-user'];

  it('treats users without a setting as "all"', () => {
    expect(
      splitRecipientsByLevel({ recipientIds, mentionedIds: [], levels }),
    ).toEqual({
      loudIds: ['default-user'],
      quietIds: ['mentions-user', 'muted-user'],
    });
  });

  it('lets a mention through "mentions only" but not "muted"', () => {
    expect(
      splitRecipientsByLevel({
        recipientIds,
        mentionedIds: ['mentions-user', 'muted-user'],
        levels,
      }),
    ).toEqual({
      loudIds: ['default-user', 'mentions-user'],
      quietIds: ['muted-user'],
    });
  });

  it('returns empty lists for no recipients', () => {
    expect(
      splitRecipientsByLevel({ recipientIds: [], mentionedIds: [], levels }),
    ).toEqual({ loudIds: [], quietIds: [] });
  });
});
