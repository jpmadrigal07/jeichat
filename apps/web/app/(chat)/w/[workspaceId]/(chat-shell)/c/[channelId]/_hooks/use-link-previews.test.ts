import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import {
  messagesQueryKey,
  pinsQueryKey,
  type Message,
  type MessageLinkPreview,
  type MessagesInfiniteData,
  type PinnedMessagesResponse,
} from '../_libs/messages';
import { updateMessageLinkPreviewsInCache } from './use-link-previews';

const CHANNEL_ID = 'c1';

const preview: MessageLinkPreview = {
  id: 'p1',
  url: 'https://tenor.com/view/x',
  kind: 'image',
  title: 'GIF',
  description: null,
  siteName: 'Tenor',
  imageUrl: 'https://media.tenor.com/x.gif',
  imageWidth: 236,
  imageHeight: 159,
};

function message(id: string, overrides: Partial<Message> = {}): Message {
  return {
    id,
    channelId: CHANNEL_ID,
    senderId: 'u1',
    content: 'hi',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    sender: null,
    attachments: [],
    reactions: [],
    linkPreviews: [],
    replyToId: null,
    replyTo: null,
    ...overrides,
  };
}

function seed(queryClient: QueryClient) {
  const data: MessagesInfiniteData = {
    pages: [
      {
        data: [
          message('m2', { content: 'edited after send' }),
          message('m1'),
        ],
        nextCursor: null,
      },
    ],
    pageParams: [{ kind: 'latest' }],
  };
  queryClient.setQueryData(messagesQueryKey(CHANNEL_ID), data);

  const pins: PinnedMessagesResponse = {
    canManageMessages: false,
    data: [
      {
        id: 'pin1',
        channelId: CHANNEL_ID,
        messageId: 'm2',
        pinnedBy: 'u1',
        pinnedAt: '2026-10-01T00:00:00.000Z',
        pinnedByUser: null,
        message: message('m2'),
      },
    ],
  };
  queryClient.setQueryData(pinsQueryKey(CHANNEL_ID), pins);
}

describe('updateMessageLinkPreviewsInCache', () => {
  it('patches only the targeted message and leaves its other fields alone', () => {
    const queryClient = new QueryClient();
    seed(queryClient);

    updateMessageLinkPreviewsInCache(queryClient, CHANNEL_ID, {
      messageId: 'm2',
      channelId: CHANNEL_ID,
      linkPreviews: [preview],
    });

    const data = queryClient.getQueryData<MessagesInfiniteData>(
      messagesQueryKey(CHANNEL_ID),
    );
    const [m2, m1] = data!.pages[0]!.data;
    expect(m2!.linkPreviews).toEqual([preview]);
    // A copy of the message from before an edit must not overwrite newer fields.
    expect(m2!.content).toBe('edited after send');
    expect(m1!.linkPreviews).toEqual([]);
  });

  it('updates the same message in the pinned list', () => {
    const queryClient = new QueryClient();
    seed(queryClient);

    updateMessageLinkPreviewsInCache(queryClient, CHANNEL_ID, {
      messageId: 'm2',
      channelId: CHANNEL_ID,
      linkPreviews: [preview],
    });

    const pins = queryClient.getQueryData<PinnedMessagesResponse>(
      pinsQueryKey(CHANNEL_ID),
    );
    expect(pins!.data[0]!.message.linkPreviews).toEqual([preview]);
  });

  it('does nothing for a message that is not cached', () => {
    const queryClient = new QueryClient();
    seed(queryClient);

    updateMessageLinkPreviewsInCache(queryClient, CHANNEL_ID, {
      messageId: 'unknown',
      channelId: CHANNEL_ID,
      linkPreviews: [preview],
    });

    const data = queryClient.getQueryData<MessagesInfiniteData>(
      messagesQueryKey(CHANNEL_ID),
    );
    expect(
      data!.pages[0]!.data.every((m) => m.linkPreviews.length === 0),
    ).toBe(true);
  });
});
