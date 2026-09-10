import { visit } from 'unist-util-visit';
import type { MentionableMember } from '@chat/_helpers/mentions';
import {
  splitMessageContent,
  type TaggableChannel,
  type TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import { channelPageHref } from '@chat/_libs/channels';

export type RemarkChatTagsOptions = {
  members: MentionableMember[];
  tickets: TaggableTicket[];
  channels: TaggableChannel[];
  workspaceId: string;
};

type UnistNode = {
  type: string;
};

type TextNode = UnistNode & {
  type: 'text';
  value: string;
};

type ParentNode = UnistNode & {
  children: UnistNode[];
};

const SKIP_PARENTS = new Set(['link', 'image', 'linkReference']);

export function remarkChatTags(options: RemarkChatTagsOptions) {
  const { members, tickets, channels, workspaceId } = options;

  return (tree: UnistNode) => {
    visit(
      tree as Parameters<typeof visit>[0],
      'text',
      (node: TextNode, index, parent: ParentNode | undefined) => {
        if (index == null || !parent) return;
        if (SKIP_PARENTS.has(parent.type)) return;

        const parts = splitMessageContent(
          node.value,
          members,
          tickets,
          channels,
        );
        if (parts.length === 1 && parts[0]?.kind === 'text') return;

        const nodes: UnistNode[] = parts.map((part) => {
          if (part.kind === 'mention') {
            return {
              type: 'mention',
              data: {
                hName: 'span',
                hProperties: { className: ['md-mention'] },
              },
              children: [{ type: 'text', value: part.text }],
            };
          }
          if (part.kind === 'ticket') {
            return {
              type: 'link',
              url: channelPageHref(workspaceId, part.ticketId),
              title: part.name,
              data: {
                hProperties: { className: ['md-ticket'] },
              },
              children: [{ type: 'text', value: part.text }],
            };
          }
          if (part.kind === 'channel') {
            return {
              type: 'link',
              url: channelPageHref(workspaceId, part.channelId),
              title: part.name,
              data: {
                hProperties: { className: ['md-ticket'] },
              },
              children: [{ type: 'text', value: part.text }],
            };
          }
          return { type: 'text', value: part.text };
        });

        parent.children.splice(index, 1, ...nodes);
        return index + nodes.length;
      },
    );
  };
}
