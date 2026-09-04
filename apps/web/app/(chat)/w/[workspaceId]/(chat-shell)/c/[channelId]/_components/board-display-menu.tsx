'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Columns3, List, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Toggle } from '@/components/ui/toggle';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { channelThreadsViewHref, type TicketLayout } from '@chat/_libs/channels';

const COLUMN_OPTIONS = [
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
] as const;

const ROW_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee', label: 'Assignee' },
] as const;

const ORDER_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
] as const;

const COMPLETED_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'week', label: 'Past week' },
  { value: 'month', label: 'Past month' },
  { value: 'none', label: 'None' },
] as const;

const DISPLAY_PROPERTIES = [
  { id: 'id', label: 'ID', defaultOn: true },
  { id: 'status', label: 'Status', defaultOn: true },
  { id: 'assignee', label: 'Assignee', defaultOn: true },
  { id: 'priority', label: 'Priority', defaultOn: true },
  { id: 'project', label: 'Project', defaultOn: true },
  { id: 'due', label: 'Due date', defaultOn: true },
  { id: 'estimate', label: 'Estimate', defaultOn: true },
  { id: 'labels', label: 'Labels', defaultOn: true },
  { id: 'created', label: 'Created', defaultOn: true },
  { id: 'prs', label: 'Pull requests', defaultOn: true },
  { id: 'milestone', label: 'Milestone', defaultOn: false },
  { id: 'links', label: 'Links', defaultOn: false },
  { id: 'time', label: 'Time in status', defaultOn: false },
  { id: 'updated', label: 'Updated', defaultOn: false },
] as const;

export function BoardDisplayMenu({
  workspaceId,
  channelId,
  layout,
}: {
  workspaceId: string;
  channelId: string;
  layout: TicketLayout;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          aria-label="Display"
        >
          <SlidersHorizontal />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverHeader>
          <PopoverTitle>{layout === 'list' ? 'List' : 'Board'}</PopoverTitle>
        </PopoverHeader>

        <ToggleGroup
          type="single"
          value={layout}
          variant="outline"
          size="sm"
          spacing={0}
          className="w-full"
          onValueChange={(value) => {
            if (value !== 'card' && value !== 'list') return;
            router.replace(
              channelThreadsViewHref(
                workspaceId,
                channelId,
                value,
                searchParams,
              ),
            );
          }}
        >
          <ToggleGroupItem value="list" className="flex-1">
            <List data-icon="inline-start" />
            List
          </ToggleGroupItem>
          <ToggleGroupItem value="card" className="flex-1">
            <Columns3 data-icon="inline-start" />
            Board
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator />

        <FieldGroup className="gap-2">
          <DisplaySelect
            label="Columns"
            defaultValue="status"
            items={COLUMN_OPTIONS}
          />
          <DisplaySelect
            label="Rows"
            defaultValue="none"
            items={ROW_OPTIONS}
          />
          <DisplaySelect
            label="Ordering"
            defaultValue="created"
            items={ORDER_OPTIONS}
          />
          <DisplaySwitch
            id="order-completed-recency"
            label="Order completed by recency"
          />
        </FieldGroup>

        <Separator />

        <FieldGroup className="gap-2">
          <DisplaySelect
            label="Completed issues"
            defaultValue="all"
            items={COMPLETED_OPTIONS}
          />
          <DisplaySwitch
            id="show-sub-issues"
            label="Show sub-issues"
            defaultChecked
          />
        </FieldGroup>

        <Separator />

        <DisplaySwitch
          id="show-empty-columns"
          label="Show empty columns"
        />

        <Separator />

        <FieldGroup className="gap-2">
          <FieldLabel>Display properties</FieldLabel>
          <div className="flex flex-wrap gap-1">
            {DISPLAY_PROPERTIES.map((property) => (
              <Toggle
                key={property.id}
                size="sm"
                variant="outline"
                defaultPressed={property.defaultOn}
                aria-label={property.label}
              >
                {property.label}
              </Toggle>
            ))}
          </div>
        </FieldGroup>

        <Separator />

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm">
            Reset
          </Button>
          <Button variant="link" size="sm">
            Set default for everyone
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DisplaySelect({
  label,
  defaultValue,
  items,
}: {
  label: string;
  defaultValue: string;
  items: readonly { value: string; label: string }[];
}) {
  return (
    <Field orientation="horizontal" className="justify-between">
      <FieldLabel className="text-muted-foreground">{label}</FieldLabel>
      <Select defaultValue={defaultValue}>
        <SelectTrigger size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}

function DisplaySwitch({
  id,
  label,
  defaultChecked = false,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <Field orientation="horizontal" className="justify-between">
      <FieldLabel htmlFor={id} className="text-muted-foreground">
        {label}
      </FieldLabel>
      <Switch id={id} size="sm" defaultChecked={defaultChecked} />
    </Field>
  );
}
