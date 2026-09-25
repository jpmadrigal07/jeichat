'use client';

import { useRef } from 'react';

const LONG_PRESS_MS = 450;
const MOVE_TOLERANCE_PX = 10;

type UseLongPressOptions = {
  /** Checked on every press — return false to ignore it. */
  enabled?: () => boolean;
};

/**
 * Touch-only long press. Mouse and pen presses are ignored so desktop keeps
 * its hover toolbar. Scrolling (pointercancel) or dragging past a small
 * tolerance cancels the press, and the click that follows a completed long
 * press is swallowed so it doesn't activate a link or button underneath.
 */
export function useLongPress(
  onLongPress: () => void,
  { enabled }: UseLongPressOptions = {},
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const firedRef = useRef(false);
  const touchRef = useRef(false);

  function clear() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    startRef.current = null;
  }

  return {
    onPointerDown(e: React.PointerEvent) {
      touchRef.current = e.pointerType === 'touch';
      firedRef.current = false;
      if (!touchRef.current || (enabled && !enabled())) return;
      clear();
      startRef.current = { x: e.clientX, y: e.clientY };
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        firedRef.current = true;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    },
    onPointerMove(e: React.PointerEvent) {
      const start = startRef.current;
      if (!start) return;
      if (
        Math.abs(e.clientX - start.x) > MOVE_TOLERANCE_PX ||
        Math.abs(e.clientY - start.y) > MOVE_TOLERANCE_PX
      ) {
        clear();
      }
    },
    onPointerUp: clear,
    onPointerCancel: clear,
    onClickCapture(e: React.MouseEvent) {
      if (!firedRef.current) return;
      firedRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu(e: React.MouseEvent) {
      // Android fires contextmenu on long press; keep the native menu away.
      if (touchRef.current && !(enabled && !enabled())) e.preventDefault();
    },
  };
}
