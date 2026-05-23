'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export const CHANNEL_SIDEBAR_DEFAULT_WIDTH = 240;
export const CHANNEL_SIDEBAR_MIN_WIDTH = 180;
export const CHANNEL_SIDEBAR_MAX_WIDTH = 420;
const CHANNEL_SIDEBAR_WIDTH_KEY = 'jeichat:channel-sidebar-width';

function clampWidth(width: number) {
  return Math.min(
    CHANNEL_SIDEBAR_MAX_WIDTH,
    Math.max(CHANNEL_SIDEBAR_MIN_WIDTH, width),
  );
}

function readStoredWidth() {
  try {
    const stored = localStorage.getItem(CHANNEL_SIDEBAR_WIDTH_KEY);
    if (!stored) return null;

    const parsed = Number(stored);
    if (Number.isNaN(parsed)) return null;

    return clampWidth(parsed);
  } catch {
    return null;
  }
}

type ResizableSidebarProps = {
  children: React.ReactNode;
  className?: string;
};

export function ResizableSidebar({
  children,
  className,
}: ResizableSidebarProps) {
  const [width, setWidth] = useState(CHANNEL_SIDEBAR_DEFAULT_WIDTH);
  const widthRef = useRef(CHANNEL_SIDEBAR_DEFAULT_WIDTH);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(CHANNEL_SIDEBAR_DEFAULT_WIDTH);

  useEffect(() => {
    const storedWidth = readStoredWidth();
    if (storedWidth !== null) {
      widthRef.current = storedWidth;
      setWidth(storedWidth);
    }
  }, []);

  const persistWidth = useCallback((nextWidth: number) => {
    try {
      localStorage.setItem(CHANNEL_SIDEBAR_WIDTH_KEY, String(nextWidth));
    } catch {
      // Ignore storage failures (private browsing, quota, etc.)
    }
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    isResizingRef.current = true;
    startXRef.current = event.clientX;
    startWidthRef.current = widthRef.current;
    event.currentTarget.setPointerCapture(event.pointerId);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizingRef.current) return;

    const delta = event.clientX - startXRef.current;
    const nextWidth = clampWidth(startWidthRef.current + delta);
    widthRef.current = nextWidth;
    setWidth(nextWidth);
  };

  const stopResize = (
    event: React.PointerEvent<HTMLDivElement>,
    shouldPersist: boolean,
  ) => {
    if (!isResizingRef.current) return;

    isResizingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    document.body.style.cursor = '';
    document.body.style.userSelect = '';

    if (shouldPersist) {
      persistWidth(widthRef.current);
    }
  };

  return (
    <div
      className={cn('relative flex shrink-0 flex-col', className)}
      style={{ width }}
    >
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize channel sidebar"
        aria-valuemin={CHANNEL_SIDEBAR_MIN_WIDTH}
        aria-valuemax={CHANNEL_SIDEBAR_MAX_WIDTH}
        aria-valuenow={width}
        className="absolute inset-y-0 -right-1 z-20 flex w-2 cursor-col-resize touch-none select-none justify-center after:absolute after:inset-y-0 after:w-px after:bg-border hover:after:bg-primary/50 active:after:bg-primary"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => stopResize(event, true)}
        onPointerCancel={(event) => stopResize(event, false)}
        onLostPointerCapture={(event) => stopResize(event, true)}
      />
    </div>
  );
}
