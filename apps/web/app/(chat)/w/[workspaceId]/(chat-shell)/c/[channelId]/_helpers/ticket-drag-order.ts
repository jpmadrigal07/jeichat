import type { ChannelThread } from '@chat/_libs/channels';
import {
  compareTicketBoardPosition,
  ticketStatusOf,
  type TicketStatus,
} from '@chat/_helpers/ticket-fields';

/**
 * New manual order for `status` after dropping `ticketId` before
 * `beforeTicketId` (null = after the last visible ticket). Uses every active
 * ticket so ones hidden by filters keep their place. Null when nothing changes.
 */
export function reorderedTicketIds({
  activeThreads,
  visibleThreads,
  ticketId,
  status,
  beforeTicketId,
}: {
  activeThreads: ChannelThread[];
  visibleThreads: ChannelThread[];
  ticketId: string;
  status: TicketStatus;
  beforeTicketId: string | null;
}): string[] | null {
  const moved = activeThreads.find((thread) => thread.id === ticketId);
  if (!moved || ticketId === beforeTicketId) return null;
  const inStatus = (thread: ChannelThread) =>
    ticketStatusOf(thread.status) === status;
  const column = activeThreads
    .filter(inStatus)
    .sort(compareTicketBoardPosition)
    .map((thread) => thread.id);
  const rest = column.filter((id) => id !== ticketId);
  const lastVisible = visibleThreads
    .filter((thread) => inStatus(thread) && thread.id !== ticketId)
    .sort(compareTicketBoardPosition)
    .at(-1);
  const insertAt = beforeTicketId
    ? rest.indexOf(beforeTicketId)
    : lastVisible
      ? rest.indexOf(lastVisible.id) + 1
      : rest.length;
  const next = [...rest];
  next.splice(insertAt < 0 ? rest.length : insertAt, 0, ticketId);
  const unchanged =
    ticketStatusOf(moved.status) === status &&
    next.every((id, index) => id === column[index]);
  return unchanged ? null : next;
}

/** Draggable ticket elements (marked with `data-ticket-id`) inside `root`. */
export function ticketDragTargets(root: ParentNode | null, selector = '') {
  return Array.from(
    root?.querySelectorAll<HTMLElement>(`${selector} [data-ticket-id]`) ?? [],
  );
}

/** First ticket whose vertical midpoint is below the pointer; null = end. */
export function ticketBelowPointer(targets: HTMLElement[], clientY: number) {
  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    }) ?? null
  );
}

export function clearTicketDropIndicator(root: ParentNode | null) {
  for (const target of ticketDragTargets(root)) {
    target.removeAttribute('data-drop-before');
    target.removeAttribute('data-drop-after');
  }
}

/** Mark where a drop would land with `data-drop-before` / `data-drop-after`. */
export function showTicketDropIndicator(
  root: ParentNode | null,
  targets: HTMLElement[],
  clientY: number,
) {
  clearTicketDropIndicator(root);
  const before = ticketBelowPointer(targets, clientY);
  if (before) {
    before.setAttribute('data-drop-before', 'true');
    return;
  }
  targets.at(-1)?.setAttribute('data-drop-after', 'true');
}
