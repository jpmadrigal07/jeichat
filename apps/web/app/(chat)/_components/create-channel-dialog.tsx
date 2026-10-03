'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Hash, Volume2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@/components/ui/field';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { PresenceAvatar } from '@chat/_components/presence-avatar';
import { BotBadge } from '@chat/_components/bot-badge';
import { useCreateChannel } from '../_hooks/use-channels';
import { useWorkspaceMembers } from '../_hooks/use-workspaces';

type ChannelKind = 'channel' | 'voice';

const CHANNEL_KINDS: Array<{
  value: ChannelKind;
  label: string;
  description: string;
  icon: typeof Hash;
}> = [
  {
    value: 'channel',
    label: 'Text',
    description: 'Messages, files, and tickets',
    icon: Hash,
  },
  {
    value: 'voice',
    label: 'Voice',
    description: 'Hang out and talk together',
    icon: Volume2,
  },
];

export function CreateChannelDialog({
  workspaceId,
  currentUserId,
  defaultType = 'channel',
  children,
}: {
  workspaceId: string;
  currentUserId: string;
  /** Which channel type is picked when the dialog opens. */
  defaultType?: ChannelKind;
  children: React.ReactNode;
}) {
  const createChannel = useCreateChannel(workspaceId);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const router = useRouter();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [isPrivate, setIsPrivate] = useState(false);

  const inviteableMembers = (members ?? []).filter(
    (member) => member.userId !== currentUserId,
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const channelType: ChannelKind =
      formData.get('channelType') === 'voice' ? 'voice' : 'channel';
    const ticketKey =
      channelType === 'voice'
        ? ''
        : ((formData.get('ticketKey') as string | null) ?? '').trim();
    const description = (formData.get('description') as string) || undefined;
    const memberIds = formData.getAll('memberIds').filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );

    if (!name.trim()) return;

    createChannel.mutate(
      {
        name: name.trim(),
        description,
        ticketKey: ticketKey || undefined,
        isPrivate,
        channelType,
        memberIds: isPrivate ? memberIds : [],
      },
      {
        onSuccess: (channel) => {
          closeRef.current?.click();
          setIsPrivate(false);
          router.push(`/w/${workspaceId}/c/${channel.id}`);
        },
      },
    );
  }

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setIsPrivate(false);
      }}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>{children}</DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="right">
          {defaultType === 'voice' ? 'Create voice channel' : 'Create channel'}
        </TooltipContent>
      </Tooltip>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="group/create-channel flex flex-col gap-4"
        >
          <FieldSet>
            <FieldLegend variant="label">Channel type</FieldLegend>
            <RadioGroup name="channelType" defaultValue={defaultType}>
              {CHANNEL_KINDS.map((kind) => {
                const Icon = kind.icon;
                const id = `ch-type-${kind.value}`;
                return (
                  <FieldLabel key={kind.value} htmlFor={id}>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldTitle>
                          <Icon className="size-3.5" />
                          {kind.label}
                        </FieldTitle>
                        <FieldDescription>{kind.description}</FieldDescription>
                      </FieldContent>
                      <RadioGroupItem value={kind.value} id={id} />
                    </Field>
                  </FieldLabel>
                );
              })}
            </RadioGroup>
          </FieldSet>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-name">Channel name</Label>
            <Input
              id="ch-name"
              name="name"
              placeholder="e.g. architecture-decisions"
              required
              autoFocus
            />
          </div>
          {/* Voice channels hold no tickets, so they need no key. */}
          <div className="flex flex-col gap-2 group-has-[#ch-type-voice[data-state=checked]]/create-channel:hidden">
            <Label htmlFor="ch-key">Key</Label>
            <Input
              id="ch-key"
              name="ticketKey"
              placeholder="e.g. BOS"
              maxLength={5}
              className="uppercase"
              autoCapitalize="characters"
            />
            <p className="text-xs text-muted-foreground">
              Used in ticket IDs like BOS-1. Leave blank to generate from the
              name.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ch-desc">Description (optional)</Label>
            <Textarea
              id="ch-desc"
              name="description"
              placeholder="What's this channel about?"
              rows={2}
            />
          </div>
          <Field orientation="horizontal">
            <Switch
              id="ch-private"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
            <FieldContent>
              <FieldLabel htmlFor="ch-private">Private channel</FieldLabel>
              <FieldDescription>
                Only you and members you add can see this channel. Owners and
                Administrators always can.
              </FieldDescription>
            </FieldContent>
          </Field>
          {isPrivate ? (
            <FieldSet>
              <FieldLegend>Members</FieldLegend>
              <FieldDescription>
                You&apos;re added automatically. Choose who else can access
                this channel.
              </FieldDescription>
              {inviteableMembers.length > 0 ? (
                <ScrollArea className="rounded-md border [&_[data-slot=scroll-area-viewport]]:max-h-48">
                  <FieldGroup className="gap-1 p-1 pr-3">
                    {inviteableMembers.map((member) => (
                      <Field
                        key={member.userId}
                        orientation="horizontal"
                        className="rounded-md px-2 py-1.5"
                      >
                        <input
                          type="checkbox"
                          id={`ch-member-${member.userId}`}
                          name="memberIds"
                          value={member.userId}
                          className="size-4 accent-primary"
                        />
                        <PresenceAvatar
                          userId={member.userId}
                          name={member.name}
                          image={member.image}
                          workspaceId={workspaceId}
                          showOffline
                        />
                        <FieldLabel
                          htmlFor={`ch-member-${member.userId}`}
                          className="min-w-0 flex-1 font-normal"
                        >
                          <span className="truncate">{member.name}</span>
                          {member.isBot ? <BotBadge /> : null}
                        </FieldLabel>
                      </Field>
                    ))}
                  </FieldGroup>
                </ScrollArea>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No other workspace members to add yet.
                </p>
              )}
            </FieldSet>
          ) : null}
          <div className="flex justify-end gap-2">
            <DialogClose ref={closeRef} asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createChannel.isPending}>
              {createChannel.isPending ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
