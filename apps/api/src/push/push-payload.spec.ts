import { toPushNotificationPayload } from './push-payload';

describe('toPushNotificationPayload', () => {
  it('builds a desktop push payload for a channel message', () => {
    expect(
      toPushNotificationPayload({
        workspaceId: 'ws_1',
        channel: {
          id: 'ch_1',
          name: 'general',
          parentId: null,
          ticketNumber: null,
          ticketKey: null,
          channelType: 'channel',
        },
        parent: null,
        message: {
          id: 'msg_1',
          content: 'Hello there',
          sender: { name: 'Ada', image: null },
        },
      }),
    ).toEqual({
      title: 'Ada',
      body: '#general\nHello there',
      href: '/w/ws_1/c/ch_1?message=msg_1',
      tag: 'jeichat:message:ws_1:ch_1',
      icon: undefined,
    });
  });

  it('links ticket messages under their parent channel board', () => {
    const payload = toPushNotificationPayload({
      workspaceId: 'ws_1',
      channel: {
        id: 'tk_1',
        name: 'Test ticket',
        parentId: 'ch_1',
        ticketNumber: 1,
        ticketKey: null,
        channelType: 'channel',
      },
      parent: { id: 'ch_1', name: 'es-dev-chat', ticketKey: 'ESD' },
      message: {
        id: 'msg_1',
        content: 'Hello there',
        sender: { name: 'Ada', image: null },
      },
    });

    expect(payload.href).toBe('/w/ws_1/c/ch_1/b/tk_1?message=msg_1');
  });
});
