'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useHistoryBack } from '@chat/_hooks/use-history-back';

/** `href` is the fallback when there's no in-app page to go back to. */
export function MobileBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const handleBack = useHistoryBack();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="-ml-1 shrink-0 md:hidden"
      asChild
    >
      <Link href={href} onClick={handleBack}>
        <ChevronLeft />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}
