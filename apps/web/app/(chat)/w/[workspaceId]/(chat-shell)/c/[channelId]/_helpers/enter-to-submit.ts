type EnterKeyEvent = {
  key: string;
  shiftKey: boolean;
  nativeEvent: { isComposing: boolean };
};

/** Touch-first devices (phones, tablets) whose soft keyboard has no Shift+Enter. */
export function isCoarsePointer(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: coarse)').matches
  );
}

/**
 * Enter submits on desktop (Shift+Enter inserts a newline). On touch devices
 * Return must insert a newline, since the soft keyboard can't send Shift+Enter;
 * they submit with the on-screen Send/Save button instead.
 */
export function shouldSubmitOnEnter(
  event: EnterKeyEvent,
  coarsePointer: boolean = isCoarsePointer(),
): boolean {
  return (
    event.key === 'Enter' &&
    !event.shiftKey &&
    !event.nativeEvent.isComposing &&
    !coarsePointer
  );
}
