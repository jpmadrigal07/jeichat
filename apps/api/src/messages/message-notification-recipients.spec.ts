import {
  isTicketMessageParticipant,
  messageNotificationRecipientIds,
  ticketCommentInboxRecipientIds,
  uniqueRecipientIds,
} from './message-notification-recipients';

describe('message notification recipients', () => {
  it('drops the actor and empty ids', () => {
    expect(uniqueRecipientIds('me', ['me', 'you', null, '', 'you'])).toEqual([
      'you',
    ]);
  });

  it('notifies channel members except the sender', () => {
    expect(
      messageNotificationRecipientIds({
        isTicket: false,
        senderId: 'alice',
        assigneeId: null,
        watcherIds: ['ignored'],
        memberIds: ['alice', 'bob', 'cara'],
      }),
    ).toEqual(['bob', 'cara']);
  });

  it('notifies ticket assignee, watchers, and mentioned users', () => {
    expect(
      messageNotificationRecipientIds({
        isTicket: true,
        senderId: 'alice',
        assigneeId: 'bob',
        watcherIds: ['alice', 'cara', 'bob'],
        memberIds: ['alice', 'bob', 'cara', 'dan'],
        mentionedUserIds: ['dan', 'bob'],
      }),
    ).toEqual(['bob', 'cara', 'dan']);
  });

  it('notifies a mentioned user on a ticket with no assignee or watchers', () => {
    expect(
      messageNotificationRecipientIds({
        isTicket: true,
        senderId: 'alice',
        assigneeId: null,
        watcherIds: [],
        memberIds: ['alice', 'bob'],
        mentionedUserIds: ['bob'],
      }),
    ).toEqual(['bob']);
  });

  it('notifies nobody when a ticket has no assignee or watchers', () => {
    expect(
      messageNotificationRecipientIds({
        isTicket: true,
        senderId: 'alice',
        assigneeId: null,
        watcherIds: [],
        memberIds: ['alice', 'bob'],
      }),
    ).toEqual([]);
  });

  it('treats assignee and watchers as ticket participants', () => {
    expect(isTicketMessageParticipant('bob', 'bob', ['cara'])).toBe(true);
    expect(isTicketMessageParticipant('cara', 'bob', ['cara'])).toBe(true);
    expect(isTicketMessageParticipant('dan', 'bob', ['cara'])).toBe(false);
  });

  it('writes ticket comment inbox items for assignee and watchers except mentions', () => {
    expect(
      ticketCommentInboxRecipientIds({
        senderId: 'alice',
        assigneeId: 'bob',
        watcherIds: ['alice', 'cara', 'bob'],
        mentionedUserIds: ['dan', 'cara'],
      }),
    ).toEqual(['bob']);
  });
});
