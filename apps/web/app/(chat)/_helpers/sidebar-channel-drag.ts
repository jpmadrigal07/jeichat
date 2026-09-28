export function sidebarChannelDragTargets(root: ParentNode | null) {
  return Array.from(
    root?.querySelectorAll<HTMLElement>('[data-sidebar-channel-id]') ?? [],
  );
}

export function channelBelowPointer(targets: HTMLElement[], clientY: number) {
  return (
    targets.find((target) => {
      const rect = target.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    }) ?? null
  );
}

export function clearSidebarChannelDropIndicator(root: ParentNode | null) {
  for (const target of sidebarChannelDragTargets(root)) {
    target.removeAttribute('data-drop-before');
    target.removeAttribute('data-drop-after');
  }
}

export function showSidebarChannelDropIndicator(
  root: ParentNode | null,
  targets: HTMLElement[],
  clientY: number,
) {
  clearSidebarChannelDropIndicator(root);
  const before = channelBelowPointer(targets, clientY);
  if (before) {
    before.setAttribute('data-drop-before', 'true');
    return;
  }
  targets.at(-1)?.setAttribute('data-drop-after', 'true');
}

export function startSidebarChannelDrag(
  event: React.DragEvent<HTMLElement>,
  channelId: string,
) {
  event.dataTransfer.setData('text/plain', channelId);
  event.dataTransfer.effectAllowed = 'move';
}

export function sidebarChannelIdBeforePointer(
  root: ParentNode | null,
  clientY: number,
): string | null {
  const targets = sidebarChannelDragTargets(root);
  const before = channelBelowPointer(targets, clientY);
  return before?.getAttribute('data-sidebar-channel-id') ?? null;
}
