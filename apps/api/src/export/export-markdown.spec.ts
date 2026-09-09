import {
  closeOpenCodeFences,
  embedDescriptionMarkdown,
  embedMessageMarkdown,
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
