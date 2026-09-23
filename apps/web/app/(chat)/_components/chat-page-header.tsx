'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChatBreadcrumbs, type ChatCrumb } from '@chat/_components/chat-breadcrumbs';
import { MobileBackLink } from '@chat/_components/mobile-back-link';
import { cn } from '@/lib/utils';

export type ChatLinearParent = {
  label: string;
  href: string;
};

export function ChatPageHeader({
  backHref,
  backLabel,
  linearTitle,
  linearParent,
  crumbs,
  leading,
  actions,
  className,
}: {
  backHref: string;
  backLabel: string;
  linearTitle: string;
  linearParent?: ChatLinearParent;
  crumbs: ChatCrumb[];
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-12 shrink-0 items-center gap-1 border-b px-2 md:gap-2 md:px-4',
        className,
      )}
    >
      <MobileBackLink href={backHref} label={backLabel} />
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {leading}
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 md:hidden">
          {linearParent ? (
            <Link
              href={linearParent.href}
              className="truncate text-xs text-muted-foreground hover:text-foreground"
            >
              {linearParent.label}
            </Link>
          ) : null}
          <p className="truncate text-sm font-semibold leading-tight">
            {linearTitle}
          </p>
        </div>
        <ChatBreadcrumbs crumbs={crumbs} className="hidden min-w-0 md:flex" />
      </div>
      {actions ? (
        <div className="ml-auto flex shrink-0 items-center gap-0.5 md:gap-1">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
