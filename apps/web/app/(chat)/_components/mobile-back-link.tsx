import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MobileBackLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="-ml-1 shrink-0 md:hidden"
      asChild
    >
      <Link href={href}>
        <ChevronLeft />
        <span className="sr-only">{label}</span>
      </Link>
    </Button>
  );
}
