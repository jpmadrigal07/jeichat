import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeSanitize from 'rehype-sanitize';
import { describe, expect, it } from 'vitest';
import { chatSanitizeSchema } from './markdown-schema';
import {
  MAX_PRESERVED_BLANK_LINES,
  remarkPreserveBlankLines,
} from './remark-preserve-blank-lines';

/** Renders to HTML, dropping the whitespace-only text between tags. */
function render(content: string, preserve = true): string {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      {
        remarkPlugins: [
          remarkBreaks,
          ...(preserve ? [remarkPreserveBlankLines] : []),
        ],
        rehypePlugins: [[rehypeSanitize, chatSanitizeSchema]],
        skipHtml: true,
      },
      content,
    ),
  ).replace(/>\s+</g, '><');
}

describe('remarkPreserveBlankLines', () => {
  it('leaves blocks without blank lines between them untouched', () => {
    expect(render('one\ntwo')).toBe('<p>one<br/>\ntwo</p>');
  });

  it('shows one empty line for one blank line', () => {
    expect(render('Test message\n\nThe test 2')).toBe(
      '<p>Test message</p><br/><p>The test 2</p>',
    );
  });

  it('shows two empty lines for two blank lines', () => {
    expect(render('a\n\n\nb')).toBe('<p>a</p><br/><br/><p>b</p>');
  });

  it('counts whitespace-only lines as blank', () => {
    expect(render('a\n  \n \nb')).toBe('<p>a</p><br/><br/><p>b</p>');
  });

  it('keeps blank lines inside a fenced code block as code', () => {
    const html = render('a\n\n```\nx\n\n\ny\n```\n\nb');
    expect(html.match(/<br\/>/g)).toHaveLength(2);
    expect(html).toContain('<pre><code>x\n\n\ny\n</code></pre>');
  });

  it('caps the number of preserved blank lines', () => {
    const html = render(`a${'\n'.repeat(30)}b`);
    expect(html.match(/<br\/>/g)).toHaveLength(MAX_PRESERVED_BLANK_LINES);
  });

  it('does nothing when not enabled', () => {
    expect(render('a\n\n\nb', false)).toBe('<p>a</p><p>b</p>');
  });
});
