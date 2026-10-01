import {
  cleanText,
  decodeEntities,
  parseHtmlMetadata,
  resolveHttpUrl,
} from './html-metadata';

// Trimmed from a real tenor.com/view/... response: attributes arrive in varying order.
const TENOR_HTML = `<!DOCTYPE html><html><head>
<meta class="dynamic" name="twitter:title" content="Sir Cat Meme - Sir cat - Discover &amp; Share GIFs">
<meta class="dynamic" property="og:site_name" content="Tenor">
<meta class="dynamic" property="og:title" content="Sir Cat Meme - Sir cat - Discover &amp; Share GIFs">
<meta class="dynamic" name="twitter:image" content="https://media1.tenor.com/m/FNVOSJ9lj1wAAAAC/sir-cat.gif">
<meta class="dynamic" name="twitter:card" content="player">
<meta class="dynamic" property="og:description" content="Click to view the GIF">
<meta class="dynamic" property="og:type" content="video.other">
<meta class="dynamic" property="og:image" content="https://media1.tenor.com/m/FNVOSJ9lj1wAAAAC/sir-cat.gif">
<meta class="dynamic" property="og:image:type" content="image/gif">
<meta class="dynamic" property="og:image:width" content="236">
<meta class="dynamic" property="og:image:height" content="159">
<meta class="dynamic" property="og:video" content="https://media.tenor.com/FNVOSJ9lj1wAAAPo/sir-cat.mp4">
</head><body>ignored <meta property="og:title" content="from body"></body></html>`;

// Giphy lists several og:image entries, each followed by its own type/size.
const GIPHY_HTML = `<head>
<meta property="og:title" content="Wow GIF - Find &amp; Share on GIPHY"/>
<meta property="og:image" content="https://media1.giphy.com/media/x/giphy.webp"/>
<meta property="og:image:type" content="image/webp"/>
<meta property="og:image:width" content="320"/>
<meta property="og:image:height" content="320"/>
<meta property="og:image" content="https://media1.giphy.com/media/x/giphy.gif"/>
<meta property="og:image:type" content="image/gif"/>
<meta property="og:image:width" content="480"/>
<meta property="og:image:height" content="270"/>
<meta property="og:video" content="https://media1.giphy.com/media/x/giphy.mp4"/>
</head>`;

describe('parseHtmlMetadata', () => {
  it('reads a Tenor page, including attribute-order variance and head-only scope', () => {
    const meta = parseHtmlMetadata(TENOR_HTML, 'https://tenor.com/view/sir-cat');
    expect(meta.title).toBe('Sir Cat Meme - Sir cat - Discover & Share GIFs');
    expect(meta.siteName).toBe('Tenor');
    expect(meta.description).toBe('Click to view the GIF');
    expect(meta.ogType).toBe('video.other');
    expect(meta.twitterCard).toBe('player');
    expect(meta.hasVideo).toBe(true);
    expect(meta.images).toEqual([
      {
        url: 'https://media1.tenor.com/m/FNVOSJ9lj1wAAAAC/sir-cat.gif',
        type: 'image/gif',
        width: 236,
        height: 159,
      },
    ]);
  });

  it('pairs each og:image with the type and size that follow it', () => {
    const meta = parseHtmlMetadata(GIPHY_HTML, 'https://giphy.com/gifs/x');
    expect(meta.images).toEqual([
      {
        url: 'https://media1.giphy.com/media/x/giphy.webp',
        type: 'image/webp',
        width: 320,
        height: 320,
      },
      {
        url: 'https://media1.giphy.com/media/x/giphy.gif',
        type: 'image/gif',
        width: 480,
        height: 270,
      },
    ]);
  });

  it('parses a typical article page', () => {
    const meta = parseHtmlMetadata(
      `<html><head><title>Fallback</title>
       <meta property="og:title" content="The Verge">
       <meta property="og:description" content="Tech &amp; culture  news">
       <meta property="og:site_name" content="The Verge">
       <meta property="og:image" content="/img/share.png"></head>`,
      'https://www.theverge.com/story',
    );
    expect(meta).toMatchObject({
      title: 'The Verge',
      description: 'Tech & culture news',
      siteName: 'The Verge',
      hasVideo: false,
    });
    expect(meta.images[0].url).toBe('https://www.theverge.com/img/share.png');
  });

  it('falls back to <title>, meta description and twitter:image', () => {
    const meta = parseHtmlMetadata(
      `<head><title> Plain
        page </title><meta name="description" content="Just a page">
        <meta name="twitter:image" content="https://cdn.example.com/a.jpg"></head>`,
      'https://example.com/',
    );
    expect(meta.title).toBe('Plain page');
    expect(meta.description).toBe('Just a page');
    expect(meta.images.map((image) => image.url)).toEqual([
      'https://cdn.example.com/a.jpg',
    ]);
  });

  it('handles single quotes, unquoted values and > inside attribute values', () => {
    const meta = parseHtmlMetadata(
      `<head><meta property='og:title' content='It&#39;s a > b'>
       <meta property=og:site_name content=Example></head>`,
      'https://example.com/',
    );
    expect(meta.title).toBe("It's a > b");
    expect(meta.siteName).toBe('Example');
  });

  it('drops non-http image URLs and upgrades http to https', () => {
    const meta = parseHtmlMetadata(
      `<head>
       <meta property="og:image" content="javascript:alert(1)">
       <meta property="og:image" content="data:image/png;base64,AAAA">
       <meta property="og:image" content="http://cdn.example.com/a.png">
       </head>`,
      'https://example.com/',
    );
    expect(meta.images.map((image) => image.url)).toEqual([
      'https://cdn.example.com/a.png',
    ]);
  });

  it('returns empty metadata for pages without any', () => {
    expect(parseHtmlMetadata('<html><body>hi</body></html>', 'https://a.test/'))
      .toEqual({
        title: null,
        description: null,
        siteName: null,
        ogType: null,
        twitterCard: null,
        hasVideo: false,
        images: [],
      });
  });

  it('stays fast on adversarial input', () => {
    const hostile =
      '<head>' + '<meta "'.repeat(50_000) + '<meta ' + 'a'.repeat(200_000);
    const started = Date.now();
    parseHtmlMetadata(hostile, 'https://a.test/');
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('text helpers', () => {
  it('decodes named, decimal and hex entities but leaves unknown ones', () => {
    expect(decodeEntities('a &amp; b &#169; &#x1F600; &bogus; &#0;')).toBe(
      'a & b © 😀 &bogus; &#0;',
    );
  });

  it('collapses whitespace and truncates with an ellipsis', () => {
    expect(cleanText('  a \n  b  ', 10)).toBe('a b');
    expect(cleanText('abcdefghij', 5)).toBe('abcd…');
    expect(cleanText('   ', 10)).toBeNull();
    expect(cleanText(undefined, 10)).toBeNull();
  });

  it('resolves relative URLs and rejects unsafe schemes', () => {
    expect(resolveHttpUrl('/a.png', 'https://x.test/p/q')).toBe(
      'https://x.test/a.png',
    );
    expect(resolveHttpUrl('ftp://x.test/a.png', 'https://x.test/')).toBeNull();
    expect(resolveHttpUrl('', 'https://x.test/')).toBeNull();
  });
});
