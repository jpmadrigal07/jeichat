'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { overlayTopOffset } from '../_helpers/drop-overlay-offset';

type ChannelDropZoneProps = {
  onAdd: (files: File[]) => void;
  children: ReactNode;
  className?: string;
};

export function ChannelDropZone({
  onAdd,
  children,
  className,
}: ChannelDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [overlayTop, setOverlayTop] = useState(0);
  const zoneRef = useRef<HTMLDivElement>(null);
  const dragCounterRef = useRef(0);

  // A nested drop zone (e.g. the ticket header inside the chat pane) handles
  // its own drops and overlay, so this overlay starts below it.
  const measureOverlayTop = useCallback(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const nested = Array.from(
      zone.querySelectorAll('[data-channel-drop-zone]'),
    ).map((el) => el.getBoundingClientRect());
    setOverlayTop(overlayTopOffset(zone.getBoundingClientRect(), nested));
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current += 1;
      if (e.dataTransfer.types.includes('Files')) {
        measureOverlayTop();
        setIsDragging(true);
      }
    },
    [measureOverlayTop],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // The list can autoscroll mid-drag, moving a nested zone under the overlay.
      if (isDragging) measureOverlayTop();
    },
    [isDragging, measureOverlayTop],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onAdd(files);
    },
    [onAdd],
  );

  return (
    <div
      ref={zoneRef}
      data-channel-drop-zone=""
      className={className}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <div
          style={{ top: overlayTop }}
          className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[inherit] bg-background/80 backdrop-blur-sm"
        >
          <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-primary px-12 py-8">
            <Upload className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">Drop to upload</p>
          </div>
        </div>
      )}
    </div>
  );
}
