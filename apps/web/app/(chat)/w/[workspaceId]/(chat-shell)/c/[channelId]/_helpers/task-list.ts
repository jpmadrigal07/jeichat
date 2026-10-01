const TASK_ITEM_MARKER = /(?:[-*+]|\d{1,9}[.)])[ \t]+\[[ xX]\]/y;

/**
 * Checks or unchecks the GFM task list item whose list marker starts at
 * `offset` in `content` (an mdast list item's `position.start.offset`).
 * Returns null when there is no task marker there, e.g. the content changed
 * since it was rendered.
 */
export function toggleTaskAtOffset(
  content: string,
  offset: number,
  checked: boolean,
): string | null {
  TASK_ITEM_MARKER.lastIndex = offset;
  const match = TASK_ITEM_MARKER.exec(content);
  if (!match) return null;
  const markIndex = offset + match[0].length - 2;
  return (
    content.slice(0, markIndex) + (checked ? 'x' : ' ') + content.slice(markIndex + 1)
  );
}
