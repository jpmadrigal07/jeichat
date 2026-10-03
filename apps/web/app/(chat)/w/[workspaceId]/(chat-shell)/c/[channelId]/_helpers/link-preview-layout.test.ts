import { describe, expect, it } from 'vitest';
import type { MessageLinkPreview } from '../_libs/messages';
import {
  estimateLinkPreviewsHeight,
  MEDIA_MAX_HEIGHT_PX,
  MEDIA_UNSIZED_HEIGHT_PX,
  mediaBoxSize,
  thumbnailRatio,
} from './link-preview-layout';

function preview(overrides: Partial<MessageLinkPreview>): MessageLinkPreview {
  return {
    id: 'p',
    url: 'https://example.com/',
    kind: 'link',
    title: 'Title',
    description: null,
    siteName: null,
    imageUrl: null,
    imageWidth: null,
    imageHeight: null,
    ...overrides,
  };
}

describe('mediaBoxSize', () => {
  it('keeps small media at its natural size', () => {
    expect(mediaBoxSize({ imageWidth: 236, imageHeight: 159 })).toEqual({
      width: 236,
      height: 159,
    });
  });

  it('scales tall media down to the height cap, keeping its shape', () => {
    expect(mediaBoxSize({ imageWidth: 600, imageHeight: 1200 })).toEqual({
      width: 144,
      height: MEDIA_MAX_HEIGHT_PX,
    });
  });

  it('is null without dimensions', () => {
    expect(mediaBoxSize({ imageWidth: null, imageHeight: 100 })).toBeNull();
    expect(mediaBoxSize({ imageWidth: 100, imageHeight: null })).toBeNull();
  });
});

describe('thumbnailRatio', () => {
  it('uses 16:9 when dimensions are unknown', () => {
    expect(thumbnailRatio({ imageWidth: null, imageHeight: null })).toBeCloseTo(
      16 / 9,
    );
  });

  it('keeps the natural shape within 1:1 and 2:1', () => {
    expect(thumbnailRatio({ imageWidth: 1200, imageHeight: 630 })).toBeCloseTo(
      1.905,
      2,
    );
    expect(thumbnailRatio({ imageWidth: 3000, imageHeight: 500 })).toBe(2);
    expect(thumbnailRatio({ imageWidth: 400, imageHeight: 900 })).toBe(1);
  });
});

describe('estimateLinkPreviewsHeight', () => {
  it('is zero without previews', () => {
    expect(estimateLinkPreviewsHeight(undefined)).toBe(0);
    expect(estimateLinkPreviewsHeight([])).toBe(0);
  });

  it('counts sized media at its rendered height', () => {
    const height = estimateLinkPreviewsHeight([
      preview({
        kind: 'image',
        imageUrl: 'https://m.test/a.gif',
        imageWidth: 236,
        imageHeight: 159,
      }),
    ]);
    expect(height).toBe(6 + 159);
  });

  it('uses the fixed slot for media of unknown size', () => {
    const height = estimateLinkPreviewsHeight([
      preview({ kind: 'image', imageUrl: 'https://m.test/a.gif' }),
    ]);
    expect(height).toBe(6 + MEDIA_UNSIZED_HEIGHT_PX);
  });

  it('makes a card with a thumbnail taller than a text-only card', () => {
    const textOnly = estimateLinkPreviewsHeight([preview({})]);
    const withImage = estimateLinkPreviewsHeight([
      preview({ imageUrl: 'https://m.test/a.png' }),
    ]);
    expect(withImage).toBeGreaterThan(textOnly + 150);
  });

  it('adds the gap between stacked previews', () => {
    const one = preview({ id: 'a' });
    const two = preview({ id: 'b' });
    expect(estimateLinkPreviewsHeight([one, two])).toBe(
      estimateLinkPreviewsHeight([one]) +
        (estimateLinkPreviewsHeight([two]) - 6) +
        8,
    );
  });

  it('ignores image previews that have no image', () => {
    expect(estimateLinkPreviewsHeight([preview({ kind: 'image' })])).toBe(0);
  });
});
