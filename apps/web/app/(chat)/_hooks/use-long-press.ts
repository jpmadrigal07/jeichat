'use client';

import { useCallback, useRef } from 'react';

const DEFAULT_DELAY_MS = 380;
const DEFAULT_MOVE_TOLERANCE_PX = 10;

export type LongPressActivateDetail = {
  pointerId: number;
  pointerType: string;
  target: HTMLElement;
};

export function useLongPress(
  onActivate: (detail: LongPressActivateDetail) => void,
  options?: { delayMs?: number; moveTolerancePx?: number },
) {
  const delayMs = options?.delayMs ?? DEFAULT_DELAY_MS;
  const moveTolerancePx = options?.moveTolerancePx ?? DEFAULT_MOVE_TOLERANCE_PX;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const activatedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const pointerTypeRef = useRef<string>('mouse');
  const targetRef = useRef<HTMLElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      pointerIdRef.current = event.pointerId;
      pointerTypeRef.current = event.pointerType;
      targetRef.current = event.currentTarget;
      originRef.current = { x: event.clientX, y: event.clientY };
      activatedRef.current = false;
      clearTimer();
      timerRef.current = setTimeout(() => {
        activatedRef.current = true;
        const target = targetRef.current;
        const pointerId = pointerIdRef.current;
        if (!target || pointerId === null) return;
        if (pointerTypeRef.current === 'touch') {
          navigator.vibrate?.(10);
        }
        onActivate({
          pointerId,
          pointerType: pointerTypeRef.current,
          target,
        });
      }, delayMs);
    },
    [clearTimer, delayMs, onActivate],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!originRef.current || activatedRef.current) return;
      const dx = event.clientX - originRef.current.x;
      const dy = event.clientY - originRef.current.y;
      if (Math.hypot(dx, dy) > moveTolerancePx) {
        clearTimer();
        originRef.current = null;
      }
    },
    [clearTimer, moveTolerancePx],
  );

  const endPointer = useCallback(() => {
    clearTimer();
    originRef.current = null;
    pointerIdRef.current = null;
    targetRef.current = null;
  }, [clearTimer]);

  const onPointerUp = endPointer;
  const onPointerCancel = endPointer;

  const wasActivated = useCallback(() => activatedRef.current, []);

  const resetActivated = useCallback(() => {
    activatedRef.current = false;
  }, []);

  const onContextMenu = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (pointerTypeRef.current === 'touch') {
      event.preventDefault();
    }
  }, []);

  const onClickCapture = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (!activatedRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    activatedRef.current = false;
  }, []);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onContextMenu,
    onClickCapture,
    wasActivated,
    resetActivated,
  };
}
