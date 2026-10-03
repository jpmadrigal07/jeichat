'use client';

import { useRef } from 'react';
import { useTracks, VideoTrack } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Maximize } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useVoice } from '@chat/_hooks/use-voice';
import { useWorkspaceMembers } from '@chat/_hooks/use-workspaces';
import { enterFullscreen } from '../_helpers/enter-fullscreen';

type ScreenShareRef = ReturnType<
  typeof useTracks<[Track.Source.ScreenShare]>
>[number];

/** Screens being shared in the call you're in; nothing when no one is sharing. */
export function VoiceScreenShares({ workspaceId }: { workspaceId: string }) {
  const { room } = useVoice();
  const shares = useTracks([Track.Source.ScreenShare], { room });

  if (shares.length === 0) return null;

  return (
    <div
      className={cn(
        'grid w-full gap-3',
        shares.length > 1 && 'lg:grid-cols-2',
      )}
    >
      {shares.map((trackRef) => (
        <ScreenShareTile
          key={trackRef.publication.trackSid}
          workspaceId={workspaceId}
          trackRef={trackRef}
        />
      ))}
    </div>
  );
}

function ScreenShareTile({
  workspaceId,
  trackRef,
}: {
  workspaceId: string;
  trackRef: ScreenShareRef;
}) {
  const tileRef = useRef<HTMLDivElement>(null);
  const { data: members } = useWorkspaceMembers(workspaceId);
  const { participant } = trackRef;
  const name =
    members?.find((member) => member.userId === participant.identity)?.name ??
    participant.name ??
    participant.identity;
  const label = participant.isLocal ? 'Your screen' : `${name}'s screen`;

  return (
    <div
      ref={tileRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl border bg-black"
    >
      <VideoTrack trackRef={trackRef} className="size-full object-contain" />
      <span className="absolute bottom-2 left-2 max-w-[70%] truncate rounded-md bg-black/60 px-2 py-1 text-xs text-white">
        {label}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute top-2 right-2 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            aria-label={`View ${label.toLowerCase()} full screen`}
            onClick={() => {
              const tile = tileRef.current;
              if (!tile) return;
              void enterFullscreen(tile).then((entered) => {
                if (!entered) {
                  toast.error("This browser can't show the screen full screen.");
                }
              });
            }}
          >
            <Maximize />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Full screen</TooltipContent>
      </Tooltip>
    </div>
  );
}
