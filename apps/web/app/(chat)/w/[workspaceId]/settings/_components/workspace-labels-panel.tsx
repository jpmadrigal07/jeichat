'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Ellipsis, Plus, Tag } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import {
  LABEL_COLORS,
  labelColorClass,
  nextLabelColor,
  type LabelColor,
} from '@chat/_helpers/ticket-fields';
import type { WorkspaceLabel } from '@chat/_libs/workspaces';
import {
  useWorkspaceLabels,
  useCreateWorkspaceLabel,
  useUpdateWorkspaceLabel,
  useDeleteWorkspaceLabel,
} from '@chat/_hooks/use-workspaces';
import { LabelColorPicker } from './label-color-picker';

function usageLabel(count: number) {
  return count === 1 ? '1 ticket' : `${count} tickets`;
}

function labelsHref(
  searchParams: URLSearchParams,
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams(searchParams.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : '?';
}

function LabelCreateRow({
  workspaceId,
  existingCount,
  cancelHref,
}: {
  workspaceId: string;
  existingCount: number;
  cancelHref: string;
}) {
  const createLabel = useCreateWorkspaceLabel(workspaceId);
  const router = useRouter();
  const defaultColor = nextLabelColor(existingCount);
  const colorRef = useRef<LabelColor>(defaultColor);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') ?? '').trim();
    if (!name || createLabel.isPending) return;

    createLabel.mutate(
      { name, color: colorRef.current },
      {
        onSuccess: () => {
          form.reset();
          router.replace(cancelHref, { scroll: false });
        },
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-md border bg-muted/30 p-2"
    >
      <ToggleGroup
        type="single"
        size="sm"
        defaultValue={defaultColor}
        onValueChange={(value) => {
          if (value) colorRef.current = value as LabelColor;
        }}
        aria-label="Label color"
      >
        {LABEL_COLORS.map((color) => (
          <ToggleGroupItem key={color} value={color} aria-label={color}>
            <span
              className={cn('size-3.5 rounded-full', labelColorClass(color))}
            />
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Input
        name="name"
        maxLength={32}
        autoFocus
        placeholder="Label name"
        aria-label="Label name"
        required
      />
      <Button type="submit" disabled={createLabel.isPending}>
        {createLabel.isPending ? 'Creating...' : 'Create'}
      </Button>
      <Button type="button" variant="ghost" asChild>
        <Link href={cancelHref} scroll={false}>
          Cancel
        </Link>
      </Button>
    </form>
  );
}

function LabelRow({
  workspaceId,
  label,
}: {
  workspaceId: string;
  label: WorkspaceLabel;
}) {
  const updateLabel = useUpdateWorkspaceLabel(workspaceId);
  const deleteLabel = useDeleteWorkspaceLabel(workspaceId);
  const usageCount = Number(label.usageCount ?? 0);

  function saveName(name: string) {
    if (!name || name === label.name || updateLabel.isPending) return;
    updateLabel.mutate({ labelId: label.id, name });
  }

  return (
    <TableRow>
      <TableCell className="w-10">
        <LabelColorPicker
          color={label.color}
          disabled={updateLabel.isPending}
          onChange={(color) => {
            if (color === label.color) return;
            updateLabel.mutate({ labelId: label.id, color });
          }}
        />
      </TableCell>
      <TableCell>
        <Input
          key={`${label.id}-${label.name}`}
          defaultValue={label.name}
          maxLength={32}
          aria-label="Label name"
          className="h-7 border-transparent bg-transparent shadow-none hover:border-border focus-visible:border-ring"
          onBlur={(event) => saveName(event.currentTarget.value.trim())}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.currentTarget.value = label.name;
              event.currentTarget.blur();
            }
          }}
        />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {usageLabel(usageCount)}
      </TableCell>
      <TableCell className="w-10 text-right">
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${label.name}`}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuGroup>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem variant="destructive">
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {label.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the label from every ticket that uses it. This
                cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => deleteLabel.mutate(label.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </TableCell>
    </TableRow>
  );
}

export function WorkspaceLabelsPanel({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const isCreating = searchParams.get('new') === '1';
  const { data: labels, isLoading } = useWorkspaceLabels(workspaceId);

  const filtered = (labels ?? []).filter((label) =>
    label.name.toLowerCase().includes(query.toLowerCase()),
  );
  const cancelHref = labelsHref(searchParams, { new: null });
  const createHref = labelsHref(searchParams, { new: '1' });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Labels</h1>
          <p className="text-sm text-muted-foreground">
            Categorize tickets. Create labels here, or type a new name in the
            ticket label picker.
          </p>
        </div>
        <Button asChild>
          <Link href={createHref} scroll={false}>
            <Plus data-icon="inline-start" />
            New label
          </Link>
        </Button>
      </div>

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search labels..."
        aria-label="Search labels"
      />

      {isCreating ? (
        <LabelCreateRow
          workspaceId={workspaceId}
          existingCount={labels?.length ?? 0}
          cancelHref={`${pathname}${cancelHref === '?' ? '' : cancelHref}`}
        />
      ) : null}

      {isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Tag />
            </EmptyMedia>
            <EmptyTitle>
              {query ? 'No matching labels' : 'No labels yet'}
            </EmptyTitle>
            <EmptyDescription>
              {query
                ? 'Try a different search, or create a new label.'
                : 'Create labels to tag tickets like Bug or Feature.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Used by</TableHead>
              <TableHead className="w-10">
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((label) => (
              <LabelRow
                key={label.id}
                workspaceId={workspaceId}
                label={label}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
