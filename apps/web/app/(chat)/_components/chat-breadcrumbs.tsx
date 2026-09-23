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
    <Breadcrumb className={cn('min-w-0 flex-1 overflow-hidden', className)}>
      <BreadcrumbList className="w-full min-w-0 flex-nowrap overflow-hidden text-sm">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const isLink = !isLast && crumb.href;

          return (
            <Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? (
                <BreadcrumbSeparator className="shrink-0" />
              ) : null}
              <BreadcrumbItem
                className={cn(
                  'min-w-0',
                  isLast
                    ? 'max-w-full flex-1 overflow-hidden'
                    : 'max-w-[34%] shrink sm:max-w-[38%] lg:max-w-[14rem]',
                )}
              >
                {isLink ? (
                  <BreadcrumbLink asChild className="block min-w-0 max-w-full truncate">
                    <Link href={crumb.href!}>{crumb.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage
                    className={cn(
                      'block min-w-0 max-w-full truncate',
                      isLast && 'font-medium',
                    )}
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
