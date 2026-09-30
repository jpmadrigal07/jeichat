'use client';

import { memo, type ComponentProps } from 'react';
import Link from 'next/link';
import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize from 'rehype-sanitize';
import { cn } from '@/lib/utils';
import type { MentionableMember } from '@chat/_helpers/mentions';
import type {
  TaggableChannel,
  TaggableTicket,
} from '@chat/_helpers/ticket-mentions';
import {
  chatSanitizeSchema,
  isSafeHref,
  ticketSanitizeSchema,
  transformChatUrl,
  transformTicketImageUrl,
} from '../_helpers/markdown-schema';
import { parseAttachmentIdFromImageSrc } from '../_helpers/ticket-description-attachments';
import { attachmentFileUrl } from '../_helpers/attachment-file-url';
import { remarkChatTags } from '../_helpers/remark-chat-tags';

const EMPTY_MEMBERS: MentionableMember[] = [];
const EMPTY_TICKETS: TaggableTicket[] = [];
const EMPTY_CHANNELS: TaggableChannel[] = [];

/** Discord-style pill for @user, #ticket, and #channel tags. */
const TAG_PILL_CLASS =
  'rounded-sm bg-tag px-0.5 font-medium text-tag-foreground box-decoration-clone';

type MessageMarkdownProps = {
  content: string;
  className?: string;
  members?: MentionableMember[];
  tickets?: TaggableTicket[];
  channels?: TaggableChannel[];
  workspaceId: string;
  /** Renders `![alt](attachment:<id>)` inline (ticket descriptions only). */
  embedAttachmentImages?: boolean;
};

function MarkdownLink({
  href,
  title,
  className,
  children,
}: ComponentProps<'a'>) {
  if (!href || !isSafeHref(href)) {
    return <span>{children}</span>;
  }
  if (className?.includes('md-tag')) {
    return (
      <Link
        href={href}
        title={title}
        className={cn(
          TAG_PILL_CLASS,
          'transition-colors hover:bg-tag-hover hover:text-white',
          className,
        )}
      >
        {children}
      </Link>
    );
  }
  if (href.startsWith('/w/')) {
    return (
      <Link
        href={href}
        title={title}
        className={cn(
          'font-medium text-primary underline-offset-2 hover:underline',
          className,
        )}
      >
        {children}
      </Link>
    );
  }
  return (
    <a
      href={href}
      title={title}
      target="_blank"
      rel="noopener noreferrer nofollow"
    >
      {children}
    </a>
  );
}

function MarkdownImage({ alt }: ComponentProps<'img'>) {
  if (!alt) return null;
  return <span className="text-muted-foreground">{alt}</span>;
}

function TicketAttachmentMarkdownImage({
  src,
  alt,
}: ComponentProps<'img'>) {
  const srcValue = typeof src === 'string' ? src : undefined;
  const attachmentId = parseAttachmentIdFromImageSrc(srcValue);
  if (!attachmentId) {
    return alt ? (
      <span className="text-muted-foreground">{alt}</span>
    ) : null;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={attachmentFileUrl(attachmentId)}
      alt={alt ?? ''}
      className="my-2 block max-h-80 max-w-full rounded-lg border object-contain"
    />
  );
}

function MarkdownPre({ className, children }: ComponentProps<'pre'>) {
  return (
    <div className="md-chat-pre-wrap">
      <pre className={className}>{children}</pre>
    </div>
  );
}

function MarkdownTable({ children }: ComponentProps<'table'>) {
  return (
    <div className="overflow-x-auto">
      <table>{children}</table>
    </div>
  );
}

function MarkdownInput({
  type,
  checked,
}: ComponentProps<'input'>) {
  if (type !== 'checkbox') return null;
  return (
    <input
      type="checkbox"
      checked={Boolean(checked)}
      disabled
      readOnly
      className="mr-1 align-middle"
    />
  );
}

function MarkdownSpan({ className, children }: ComponentProps<'span'>) {
  if (className?.includes('md-tag')) {
    return <span className={cn(TAG_PILL_CLASS, className)}>{children}</span>;
  }
  return <span className={className}>{children}</span>;
}

const markdownComponents: Components = {
  a: MarkdownLink,
  img: MarkdownImage,
  pre: MarkdownPre,
  table: MarkdownTable,
  input: MarkdownInput,
  span: MarkdownSpan,
};

const ticketMarkdownComponents: Components = {
  ...markdownComponents,
  img: TicketAttachmentMarkdownImage,
};

export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
  members = EMPTY_MEMBERS,
  tickets = EMPTY_TICKETS,
  channels = EMPTY_CHANNELS,
  workspaceId,
  embedAttachmentImages = false,
}: MessageMarkdownProps) {
  if (!content.trim()) return null;

  const urlTransform = embedAttachmentImages
    ? (url: string, key: string) =>
        key === 'src' ? transformTicketImageUrl(url) : transformChatUrl(url)
    : transformChatUrl;

  return (
    <div className={cn('md-chat', className)}>
      <Markdown
        remarkPlugins={[
          remarkGfm,
          remarkBreaks,
          [remarkChatTags, { members, tickets, channels, workspaceId }],
        ]}
        rehypePlugins={[
          rehypeHighlight,
          [
            rehypeSanitize,
            embedAttachmentImages ? ticketSanitizeSchema : chatSanitizeSchema,
          ],
        ]}
        skipHtml
        urlTransform={urlTransform}
        components={
          embedAttachmentImages ? ticketMarkdownComponents : markdownComponents
        }
      >
        {content.trimEnd()}
      </Markdown>
    </div>
  );
});
