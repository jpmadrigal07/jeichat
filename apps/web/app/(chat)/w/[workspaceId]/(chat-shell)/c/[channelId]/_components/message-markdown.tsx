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
import type { TaggableTicket } from '@chat/_helpers/ticket-mentions';
import {
  chatSanitizeSchema,
  isSafeHref,
  transformChatUrl,
} from '../_helpers/markdown-schema';
import { remarkChatTags } from '../_helpers/remark-chat-tags';

type MessageMarkdownProps = {
  content: string;
  className?: string;
  members: MentionableMember[];
  tickets: TaggableTicket[];
  workspaceId: string;
};

function MarkdownLink({
  href,
  title,
  className,
  children,
}: ComponentProps<'a'>) {
  const classNames = className ?? '';
  if (!href || !isSafeHref(href)) {
    return <span>{children}</span>;
  }
  if (href.startsWith('/w/') || classNames.includes('md-ticket')) {
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
  if (className?.includes('md-mention')) {
    return <span className="font-medium text-primary">{children}</span>;
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

export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
  members,
  tickets,
  workspaceId,
}: MessageMarkdownProps) {
  if (!content.trim()) return null;

  return (
    <div className={cn('md-chat', className)}>
      <Markdown
        remarkPlugins={[
          remarkGfm,
          remarkBreaks,
          [remarkChatTags, { members, tickets, workspaceId }],
        ]}
        rehypePlugins={[
          rehypeHighlight,
          [rehypeSanitize, chatSanitizeSchema],
        ]}
        skipHtml
        urlTransform={transformChatUrl}
        components={markdownComponents}
      >
        {content.trimEnd()}
      </Markdown>
    </div>
  );
});
