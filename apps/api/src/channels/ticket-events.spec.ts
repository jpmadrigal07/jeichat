import {
  isParentChannelEventType,
  PARENT_CHANNEL_EVENT_TYPES,
  TICKET_EVENT_TYPES,
} from './ticket-events';

describe('isParentChannelEventType', () => {
  it.each([...PARENT_CHANNEL_EVENT_TYPES])(
    'is true for parent-visible type %s',
    (type) => {
      expect(isParentChannelEventType(type)).toBe(true);
    },
  );

  it.each(
    TICKET_EVENT_TYPES.filter(
      (type) =>
        !PARENT_CHANNEL_EVENT_TYPES.includes(
          type as (typeof PARENT_CHANNEL_EVENT_TYPES)[number],
        ),
    ),
  )('is false for ticket-only type %s', (type) => {
    expect(isParentChannelEventType(type)).toBe(false);
  });

  it('is false for unknown types', () => {
    expect(isParentChannelEventType('message_created')).toBe(false);
  });
});
