import {
  closeOpenCodeFences,
  embedAttachmentMarkdown,
  embedDescriptionMarkdown,
  embedMessageMarkdown,
  embedTicketAttachmentsMarkdown,
  formatByteSize,
  sanitizeDownloadBasename,
  zipEntryFilename,
} from './export-markdown';

describe('closeOpenCodeFences', () => {
  it('leaves closed fences unchanged', () => {
    const input = ['```ts', 'const n = 1;', '```', '', 'after'].join('\n');
    expect(closeOpenCodeFences(input)).toBe(input);
  });

  it('closes an unclosed fence so later markdown is not swallowed', () => {
    const input = ['```ts', 'export function getTtl() {', '  return 1;', '}'].join(
      '\n',
    );
    expect(closeOpenCodeFences(input)).toBe(`${input}\n\`\`\``);
  });

  it('closes tilde fences', () => {
    const input = ['~~~', 'code'].join('\n');
    expect(closeOpenCodeFences(input)).toBe(`${input}\n~~~`);
  });
});

describe('embedDescriptionMarkdown', () => {
  it('quotes every line and contains unclosed fences', () => {
    const input = ['## Notes', '', '```ts', 'const n = 1;'].join('\n');
    expect(embedDescriptionMarkdown(input)).toBe(
      ['> ## Notes', '> ', '> ```ts', '> const n = 1;', '> ```'].join('\n'),
    );
  });
});

describe('embedMessageMarkdown', () => {
  it('closes unclosed fences in a chat message', () => {
    expect(embedMessageMarkdown('```\nhello')).toBe('```\nhello\n```');
  });
});

describe('zipEntryFilename', () => {
  it('prefixes the attachment id and strips path segments', () => {
    expect(zipEntryFilename('abc-123', '../../secret/login.png')).toBe(
      'abc-123-login.png',
    );
  });

  it('replaces unsafe characters', () => {
    expect(zipEntryFilename('id1', 'my file (1).png')).toBe('id1-my_file_1_.png');
  });
});

describe('embedAttachmentMarkdown', () => {
  const image = {
    id: 'img-1',
    filename: 'login.png',
    contentType: 'image/png',
    sizeBytes: 1280,
  };
  const pdf = {
    id: 'doc-1',
    filename: 'invoice.pdf',
    contentType: 'application/pdf',
    sizeBytes: 240_000,
  };

  it('emits a caption without a relative path', () => {
    expect(embedAttachmentMarkdown(image)).toBe(
      '[Image: login.png · image/png · 1.3 KB]',
    );
    expect(embedAttachmentMarkdown(pdf)).toBe(
      '[File: invoice.pdf · application/pdf · 234.4 KB]',
    );
  });

  it('embeds local image and file links for the zip', () => {
    expect(embedAttachmentMarkdown(image, 'files/img-1-login.png')).toBe(
      [
        '![login.png](files/img-1-login.png)',
        '',
        '[Image: login.png · image/png · 1.3 KB]',
      ].join('\n'),
    );
    expect(embedAttachmentMarkdown(pdf, 'files/doc-1-invoice.pdf')).toBe(
      [
        '[invoice.pdf](files/doc-1-invoice.pdf)',
        '',
        '[File: invoice.pdf · application/pdf · 234.4 KB]',
      ].join('\n'),
    );
  });
});

describe('embedTicketAttachmentsMarkdown', () => {
  it('returns empty when there are no ticket files', () => {
    expect(embedTicketAttachmentsMarkdown([], true)).toBe('');
  });

  it('lists ticket files after the description heading', () => {
    const image = {
      id: 'img-1',
      filename: 'shot.png',
      contentType: 'image/png',
      sizeBytes: 1024,
      entryName: 'img-1-shot.png',
    };
    expect(
      embedTicketAttachmentsMarkdown(
        [{ sourceLabel: null, attachments: [image] }],
        true,
      ),
    ).toBe(
      [
        '### Ticket attachments',
        '',
        '![shot.png](files/img-1-shot.png)',
        '',
        '[Image: shot.png · image/png · 1.0 KB]',
        '',
      ].join('\n'),
    );
  });
});

describe('formatByteSize', () => {
  it('formats bytes, kilobytes, and megabytes', () => {
    expect(formatByteSize(12)).toBe('12 B');
    expect(formatByteSize(2048)).toBe('2.0 KB');
    expect(formatByteSize(2 * 1024 * 1024)).toBe('2.0 MB');
  });
});

describe('sanitizeDownloadBasename', () => {
  it('strips characters that are illegal in filenames', () => {
    expect(sanitizeDownloadBasename('Acme / #support')).toBe('Acme _ #support');
  });
});
