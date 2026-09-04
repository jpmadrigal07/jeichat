export type WrapResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

export function wrapSelection(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  prefix: string,
  suffix: string,
): WrapResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const selected = value.slice(start, end);
  const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`;

  if (start === end) {
    const caret = start + prefix.length;
    return { value: next, selectionStart: caret, selectionEnd: caret };
  }

  const caret = start + prefix.length + selected.length + suffix.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}

export function wrapAsMarkdownLink(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): WrapResult {
  const start = Math.min(selectionStart, selectionEnd);
  const end = Math.max(selectionStart, selectionEnd);
  const selected = value.slice(start, end);
  const label = selected || 'text';
  const next = `${value.slice(0, start)}[${label}](url)${value.slice(end)}`;
  const urlStart = start + label.length + 3;
  return {
    value: next,
    selectionStart: urlStart,
    selectionEnd: urlStart + 3,
  };
}

export function markdownShortcutForKey(
  key: string,
): { prefix: string; suffix: string } | 'link' | null {
  const normalized = key.toLowerCase();
  if (normalized === 'b') return { prefix: '**', suffix: '**' };
  if (normalized === 'i') return { prefix: '*', suffix: '*' };
  if (normalized === 'e') return { prefix: '`', suffix: '`' };
  if (normalized === 'k') return 'link';
  return null;
}
