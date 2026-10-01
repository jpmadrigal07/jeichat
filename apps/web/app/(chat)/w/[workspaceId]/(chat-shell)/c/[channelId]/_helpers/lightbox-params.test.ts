import { describe, expect, it } from 'vitest';
import { lightboxGallery } from './lightbox-params';

describe('lightboxGallery', () => {
  it('returns the ordered ids from the gallery param', () => {
    const params = new URLSearchParams('lightbox=b&lightboxGallery=a,b,c');
    expect(lightboxGallery(params, 'b')).toEqual(['a', 'b', 'c']);
  });

  it('falls back to just the current id when there is no gallery param', () => {
    const params = new URLSearchParams('lightbox=a');
    expect(lightboxGallery(params, 'a')).toEqual(['a']);
  });

  it('ignores a gallery that does not contain the current id', () => {
    const params = new URLSearchParams('lightbox=z&lightboxGallery=a,b,c');
    expect(lightboxGallery(params, 'z')).toEqual(['z']);
  });

  it('drops empty segments', () => {
    const params = new URLSearchParams('lightbox=a&lightboxGallery=a,,b,');
    expect(lightboxGallery(params, 'a')).toEqual(['a', 'b']);
  });
});
