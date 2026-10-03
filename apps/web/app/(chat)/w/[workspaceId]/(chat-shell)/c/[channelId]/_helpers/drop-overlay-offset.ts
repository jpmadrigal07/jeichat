type VerticalExtent = { top: number; bottom: number };

/**
 * How far below the top of a drop zone its overlay should start, so it stays
 * clear of drop zones nested at its top edge (they draw their own overlay).
 * Nested zones that start lower than the top edge stay covered.
 */
export function overlayTopOffset(
  zone: VerticalExtent,
  nested: VerticalExtent[],
): number {
  let offset = 0;
  for (const rect of nested) {
    if (rect.top <= zone.top + 1) {
      offset = Math.max(offset, rect.bottom - zone.top);
    }
  }
  return Math.min(Math.max(offset, 0), zone.bottom - zone.top);
}
