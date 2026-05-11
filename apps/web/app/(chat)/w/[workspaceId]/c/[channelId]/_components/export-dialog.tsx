'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon, Copy, Download, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { fetchExportMarkdown } from '../_libs/export';
import type { Channel } from '../../../../../_libs/channels';

type ExportDialogProps = {
  channelId: string;
  channel: Channel | undefined;
};

export function ExportDialog({ channelId, channel }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const previewRef = useRef<HTMLPreElement>(null);

  const fromISO = fromDate ? fromDate.toISOString() : undefined;
  const toISO = toDate ? toDate.toISOString() : undefined;

  const { data: markdown, isLoading } = useQuery({
    queryKey: ['export', channelId, fromISO, toISO],
    queryFn: ({ signal }) =>
      fetchExportMarkdown(channelId, fromISO, toISO, { signal }),
    enabled: open,
  });

  function handleCopy() {
    if (!markdown) return;
    navigator.clipboard.writeText(markdown);
    toast.success('Copied to clipboard');
  }

  function handleDownload() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = format(new Date(), 'yyyy-MM-dd');
    a.download = `${channel?.name ?? 'channel'}-${date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleClearDates() {
    setFromDate(undefined);
    setToDate(undefined);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FileDown className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Export #{channel?.name ?? 'channel'}</DialogTitle>
          <DialogDescription>
            Export messages as markdown for use with AI tools.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker
            label="From"
            date={fromDate}
            onSelect={setFromDate}
            maxDate={toDate}
          />
          <DatePicker
            label="To"
            date={toDate}
            onSelect={setToDate}
            minDate={fromDate}
          />
          {(fromDate || toDate) && (
            <Button variant="ghost" size="xs" onClick={handleClearDates}>
              Clear
            </Button>
          )}
        </div>

        <Tabs defaultValue="preview" className="mt-2">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
          </TabsList>
          <TabsContent value="preview" className="mt-2">
            <div className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : markdown ? (
                <div className="prose prose-sm dark:prose-invert max-w-none text-xs whitespace-pre-wrap break-words">
                  {markdown}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No messages to export.
                </p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="raw" className="mt-2">
            <pre
              ref={previewRef}
              className="max-h-64 overflow-auto rounded-md border bg-muted/50 p-3 text-xs whitespace-pre-wrap break-words"
            >
              {isLoading
                ? 'Loading...'
                : markdown || 'No messages to export.'}
            </pre>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={!markdown || isLoading}
          >
            <Copy className="mr-2 h-4 w-4" />
            Copy to Clipboard
          </Button>
          <Button onClick={handleDownload} disabled={!markdown || isLoading}>
            <Download className="mr-2 h-4 w-4" />
            Download .md
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DatePicker({
  label,
  date,
  onSelect,
  minDate,
  maxDate,
}: {
  label: string;
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'justify-start text-left font-normal',
            !date && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {date ? format(date, 'MMM d, yyyy') : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          disabled={(d) => {
            if (minDate && d < minDate) return true;
            if (maxDate && d > maxDate) return true;
            if (d > new Date()) return true;
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
