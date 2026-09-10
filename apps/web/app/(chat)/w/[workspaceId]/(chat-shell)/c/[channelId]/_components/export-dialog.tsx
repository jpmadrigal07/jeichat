'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarIcon, Copy, Download, FileArchive, FileDown, Loader2 } from 'lucide-react';
import {
  addMonths,
  endOfDay,
  format,
  min,
  startOfDay,
  subMonths,
} from 'date-fns';
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
import {
  downloadBlob,
  fetchExportMarkdown,
  fetchExportZip,
} from '../_libs/export';
import type { Channel } from '@chat/_libs/channels';
import { MessageMarkdown } from './message-markdown';

const MAX_EXPORT_MONTHS = 1;

type ExportDialogProps = {
  channelId: string;
  channel: Channel | undefined;
};

export function ExportDialog({ channelId, channel }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const previewRef = useRef<HTMLPreElement>(null);

  const fromISO = fromDate ? startOfDay(fromDate).toISOString() : undefined;
  const toISO = toDate ? endOfDay(toDate).toISOString() : undefined;
  const hasDateRange = Boolean(fromDate && toDate);

  const { data: markdown, isLoading } = useQuery({
    queryKey: ['export', channelId, fromISO, toISO],
    queryFn: ({ signal }) =>
      fetchExportMarkdown(channelId, fromISO, toISO, { signal }),
    enabled: open && hasDateRange,
  });

  const zipMutation = useMutation({
    mutationFn: () => {
      if (!fromISO || !toISO) {
        return Promise.reject(new Error('Select From and To dates'));
      }
      return fetchExportZip(channelId, fromISO, toISO);
    },
    onSuccess: ({ blob, filename }) => {
      downloadBlob(blob, filename);
    },
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

  const today = startOfDay(new Date());
  const fromMinDate = toDate ? subMonths(toDate, MAX_EXPORT_MONTHS) : undefined;
  const fromMaxDate = min([toDate ?? today, today]);
  const toMinDate = fromDate;
  const toMaxDate = min([
    fromDate ? addMonths(fromDate, MAX_EXPORT_MONTHS) : today,
    today,
  ]);

  function handleFromSelect(date: Date | undefined) {
    setFromDate(date);
    if (!date || !toDate) return;
    const latest = addMonths(date, MAX_EXPORT_MONTHS);
    if (toDate < date || toDate > latest) setToDate(undefined);
  }

  function handleToSelect(date: Date | undefined) {
    setToDate(date);
    if (!date || !fromDate) return;
    const earliest = subMonths(date, MAX_EXPORT_MONTHS);
    if (fromDate > date || fromDate < earliest) setFromDate(undefined);
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
            Export up to 1 month of messages as markdown. Download a zip to
            include original images and files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker
            label="From"
            date={fromDate}
            onSelect={handleFromSelect}
            minDate={fromMinDate}
            maxDate={fromMaxDate}
          />
          <DatePicker
            label="To"
            date={toDate}
            onSelect={handleToSelect}
            minDate={toMinDate}
            maxDate={toMaxDate}
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
              {!hasDateRange ? (
                <p className="text-sm text-muted-foreground">
                  Select From and To dates to preview the export.
                </p>
              ) : isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : markdown && channel ? (
                <MessageMarkdown
                  content={markdown}
                  className="md-ticket text-sm"
                  workspaceId={channel.workspaceId}
                />
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
              {!hasDateRange
                ? 'Select From and To dates to preview the export.'
                : isLoading
                  ? 'Loading...'
                  : markdown || 'No messages to export.'}
            </pre>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex-wrap">
          <Button
            variant="outline"
            onClick={handleCopy}
            disabled={
              !hasDateRange || !markdown || isLoading || zipMutation.isPending
            }
          >
            <Copy data-icon="inline-start" />
            Copy to Clipboard
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            disabled={
              !hasDateRange || !markdown || isLoading || zipMutation.isPending
            }
          >
            <Download data-icon="inline-start" />
            Download .md
          </Button>
          <Button
            onClick={() => zipMutation.mutate()}
            disabled={!hasDateRange || isLoading || zipMutation.isPending}
          >
            {zipMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <FileArchive data-icon="inline-start" />
            )}
            Download .zip
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
            return false;
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
