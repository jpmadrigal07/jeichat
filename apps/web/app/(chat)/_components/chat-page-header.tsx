'use client';

import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
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
  /** Mobile-only parent line; pass several for a short trail (e.g. channel › Board). */
  linearParent?: ChatLinearParent | ChatLinearParent[];
  crumbs: ChatCrumb[];
  leading?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const linearParents = linearParent
    ? Array.isArray(linearParent)
      ? linearParent
      : [linearParent]
    : [];

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
          {linearParents.length > 0 ? (
            <div className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
              {linearParents.map((parent, index) => (
                <Fragment key={parent.href}>
                  {index > 0 ? (
                    <ChevronRight className="size-3 shrink-0" />
                  ) : null}
                  <Link
                    href={parent.href}
                    className="truncate hover:text-foreground"
                  >
                    {parent.label}
                  </Link>
                </Fragment>
              ))}
            </div>
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
