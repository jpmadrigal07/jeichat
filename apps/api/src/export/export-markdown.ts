/** Close unclosed fenced code blocks so later markdown cannot be swallowed. */
export function closeOpenCodeFences(markdown: string): string {
  const normalized = markdown.replace(/\r\n/g, '\n');
  let open: { char: '`' | '~'; length: number } | null = null;

  for (const line of normalized.split('\n')) {
    const match = /^( {0,3})([`~]{3,})(.*)$/.exec(line);
    if (!match) continue;

    const marker = match[2];
    const char = marker[0] as '`' | '~';
    const length = marker.length;
    const rest = match[3];

    if (open === null) {
      if (char === '`' && rest.includes('`')) continue;
      open = { char, length };
      continue;
    }

    if (char === open.char && length >= open.length && rest.trim() === '') {
      open = null;
    }
  }

  if (!open) return normalized;
  const closer = open.char.repeat(open.length);
  return normalized.endsWith('\n')
    ? `${normalized}${closer}\n`
    : `${normalized}\n${closer}`;
}

export function toBlockquote(markdown: string): string {
  return markdown.split('\n').map((line) => `> ${line}`).join('\n');
}

export function embedDescriptionMarkdown(description: string): string {
  return toBlockquote(closeOpenCodeFences(description));
}

export function embedMessageMarkdown(content: string): string {
  return closeOpenCodeFences(content);
}
