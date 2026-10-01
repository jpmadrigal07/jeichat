import { extractPreviewUrls } from './extract-urls';

describe('extractPreviewUrls', () => {
  it('finds bare URLs in order and removes duplicates', () => {
    expect(
      extractPreviewUrls(
        'see https://a.test/one and https://b.test/two then https://a.test/one again',
      ),
    ).toEqual(['https://a.test/one', 'https://b.test/two']);
  });

  it('trims sentence punctuation and emphasis from the end', () => {
    expect(
      extractPreviewUrls(
        'Read https://a.test/x. Or https://b.test/y, or **https://c.test/z**!',
      ),
    ).toEqual(['https://a.test/x', 'https://b.test/y', 'https://c.test/z']);
  });

  it('keeps balanced parentheses but drops a closing one that is not part of the URL', () => {
    expect(
      extractPreviewUrls(
        '(https://en.wikipedia.org/wiki/Foo_(bar)) and (https://a.test/p)',
      ),
    ).toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)', 'https://a.test/p']);
  });

  it('finds the target of a markdown link', () => {
    expect(extractPreviewUrls('[docs](https://docs.test/start)')).toEqual([
      'https://docs.test/start',
    ]);
  });

  it('skips <url> so a sender can opt out of the preview', () => {
    expect(
      extractPreviewUrls('<https://quiet.test/a> but https://loud.test/b'),
    ).toEqual(['https://loud.test/b']);
  });

  it('skips code spans and fenced code blocks', () => {
    const content = [
      'inline `https://code.test/a` here',
      '```',
      'curl https://fence.test/b',
      '```',
      'real https://real.test/c',
    ].join('\n');
    expect(extractPreviewUrls(content)).toEqual(['https://real.test/c']);
  });

  it('skips an unterminated fenced block through to the end', () => {
    expect(extractPreviewUrls('```\nhttps://a.test/x')).toEqual([]);
  });

  it('skips the app’s own origins', () => {
    expect(
      extractPreviewUrls(
        'https://chat.example.com/w/1/c/2 and https://other.test/',
        ['https://chat.example.com'],
      ),
    ).toEqual(['https://other.test/']);
  });

  it('caps the number of previews per message', () => {
    const content = [1, 2, 3, 4, 5].map((n) => `https://a.test/${n}`).join(' ');
    expect(extractPreviewUrls(content)).toHaveLength(3);
    expect(extractPreviewUrls(content, [], 5)).toHaveLength(5);
  });

  it('ignores non-http schemes, mentions and plain text', () => {
    expect(
      extractPreviewUrls('ftp://a.test/x mailto:a@b.test @alice #general hello'),
    ).toEqual([]);
  });

  it('skips absurdly long URLs', () => {
    expect(extractPreviewUrls(`https://a.test/${'x'.repeat(3000)}`)).toEqual([]);
  });
});
