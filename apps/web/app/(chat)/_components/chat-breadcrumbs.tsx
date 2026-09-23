'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

export type ChatCrumb = {
  label: string;
  href?: string;
};

export function ChatBreadcrumbs({
  crumbs,
  className,
}: {
  crumbs: ChatCrumb[];
  className?: string;
}) {
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className={cn('min-w-0 flex-1', className)}>
      <BreadcrumbList className="flex-nowrap text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isLink = !isLast && crumb.href;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <BreadcrumbSeparator /> : null}
              <BreadcrumbItem
                className={cn(
                  'min-w-0 shrink',
                  !isLast && 'max-w-[38%] sm:max-w-[45%] md:max-w-none',
                )}
              >
                {isLink ? (
                  <BreadcrumbLink asChild className="truncate">
                    <Link href={crumb.href!}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className={cn('truncate', isLast && 'font-medium')}
                  >
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
