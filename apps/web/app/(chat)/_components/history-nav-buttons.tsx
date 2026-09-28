'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useHistoryNavigation } from '@chat/_hooks/use-history-navigation';

/** Desktop-only back/forward arrows, disabled when there's no in-app entry. */
export function HistoryNavButtons() {
  const { canGoBack, canGoForward, goBack, goForward } =
    useHistoryNavigation();

  return (
    <div className="-mr-1 hidden shrink-0 items-center md:flex">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoBack}
            onClick={goBack}
          >
            <ArrowLeft className="size-3.5" />
            <span className="sr-only">Go back</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Back</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={!canGoForward}
            onClick={goForward}
          >
            <ArrowRight className="size-3.5" />
            <span className="sr-only">Go forward</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Forward</TooltipContent>
      </Tooltip>
    </div>
  );
}
