import { buildLinkPreview } from './build-link-preview';

const html = (head: string) => ({
  kind: 'html' as const,
  finalUrl: 'https://example.com/page',
  html: `<head>${head}</head>`,
});

describe('buildLinkPreview', () => {
  it('renders a direct image link as bare media', () => {
    expect(
      buildLinkPreview({
        kind: 'image',
        finalUrl: 'https://media.tenor.com/x/cat.gif',
        contentType: 'image/gif',
      }),
    ).toMatchObject({
      kind: 'image',
      imageUrl: 'https://media.tenor.com/x/cat.gif',
      title: null,
    });
  });

  it('renders a Tenor-style page as the GIF itself', () => {
    const preview = buildLinkPreview(
      html(`
        <meta property="og:title" content="Sir Cat Meme">
        <meta property="og:site_name" content="Tenor">
        <meta property="og:type" content="video.other">
        <meta name="twitter:card" content="player">
        <meta property="og:image" content="https://media1.tenor.com/m/a/sir-cat.gif">
        <meta property="og:image:type" content="image/gif">
        <meta property="og:image:width" content="236">
        <meta property="og:image:height" content="159">
        <meta property="og:video" content="https://media.tenor.com/a/sir-cat.mp4">`),
    );
    expect(preview).toEqual({
      kind: 'image',
      title: 'Sir Cat Meme',
      description: null,
      siteName: 'Tenor',
      imageUrl: 'https://media1.tenor.com/m/a/sir-cat.gif',
      imageWidth: 236,
      imageHeight: 159,
    });
  });

  it('prefers the GIF over a still image on a Giphy-style page', () => {
    const preview = buildLinkPreview(
      html(`
        <meta property="og:title" content="Wow GIF">
        <meta property="og:image" content="https://m.giphy.com/giphy.webp">
        <meta property="og:image:type" content="image/webp">
        <meta property="og:image" content="https://m.giphy.com/giphy.gif">
        <meta property="og:image:type" content="image/gif">
        <meta property="og:video" content="https://m.giphy.com/giphy.mp4">`),
    );
    expect(preview).toMatchObject({
      kind: 'image',
      imageUrl: 'https://m.giphy.com/giphy.gif',
    });
  });

  it('keeps an article as a card even when its thumbnail is a GIF', () => {
    const preview = buildLinkPreview(
      html(`
        <meta property="og:title" content="Release notes">
        <meta property="og:type" content="article">
        <meta property="og:image" content="https://example.com/demo.gif">`),
    );
    expect(preview).toMatchObject({
      kind: 'link',
      title: 'Release notes',
      imageUrl: 'https://example.com/demo.gif',
    });
  });

  it('builds a card from an article page', () => {
    expect(
      buildLinkPreview(
        html(`
        <meta property="og:title" content="The Verge">
        <meta property="og:description" content="Tech news">
        <meta property="og:site_name" content="The Verge">
        <meta property="og:image" content="https://platform.theverge.com/share.png">
        <meta property="og:image:width" content="1200">
        <meta property="og:image:height" content="630">`),
      ),
    ).toEqual({
      kind: 'link',
      title: 'The Verge',
      description: 'Tech news',
      siteName: 'The Verge',
      imageUrl: 'https://platform.theverge.com/share.png',
      imageWidth: 1200,
      imageHeight: 630,
    });
  });

  it('builds a text-only card when there is no image', () => {
    expect(
      buildLinkPreview(html('<title>Just text</title>')),
    ).toMatchObject({ kind: 'link', title: 'Just text', imageUrl: null });
  });

  it('returns null when the page has nothing to show', () => {
    expect(buildLinkPreview(html(''))).toBeNull();
    expect(
      buildLinkPreview(
        html('<meta property="og:image" content="https://a.test/i.png">'),
      ),
    ).toBeNull();
  });
});
