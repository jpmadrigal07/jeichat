import { aroundWindowSizes, encodeMessageCursor, parseMessageCursor } from './message-cursor';

describe('message cursor', () => {
  it('round-trips createdAt and id', () => {
    const createdAt = new Date('2026-04-01T12:00:00.000Z');
    const encoded = encodeMessageCursor(createdAt, 'msg_abc');
    expect(parseMessageCursor(encoded)).toEqual({ createdAt, id: 'msg_abc' });
  });

  it('keeps underscores in the message id', () => {
    const createdAt = new Date('2026-04-01T12:00:00.000Z');
    const encoded = encodeMessageCursor(createdAt, 'msg_with_underscores');
    expect(parseMessageCursor(encoded)?.id).toBe('msg_with_underscores');
  });

  it('returns null for malformed cursors', () => {
    expect(parseMessageCursor('not-a-cursor')).toBeNull();
    expect(parseMessageCursor('')).toBeNull();
  });

  it('splits a page so the target stays in the window', () => {
    expect(aroundWindowSizes(50)).toEqual({ older: 25, newer: 24 });
    expect(aroundWindowSizes(1)).toEqual({ older: 0, newer: 0 });
    expect(aroundWindowSizes(2)).toEqual({ older: 1, newer: 0 });
  });
});
