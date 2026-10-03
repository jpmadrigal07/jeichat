import { describe, expect, it } from 'vitest';
import { overlayTopOffset } from './drop-overlay-offset';

const zone = { top: 100, bottom: 600 };

describe('overlayTopOffset', () => {
  it('covers the whole zone when nothing is nested', () => {
    expect(overlayTopOffset(zone, [])).toBe(0);
  });

  it('starts below a nested zone at the top edge', () => {
    expect(overlayTopOffset(zone, [{ top: 100, bottom: 260 }])).toBe(160);
  });

  it('follows a nested zone that is partly scrolled out of view', () => {
    expect(overlayTopOffset(zone, [{ top: 20, bottom: 181 }])).toBe(81);
  });

  it('covers the whole zone once the nested zone is scrolled out of view', () => {
    expect(overlayTopOffset(zone, [{ top: -300, bottom: -140 }])).toBe(0);
  });

  it('keeps covering a nested zone that starts below the top edge', () => {
    expect(overlayTopOffset(zone, [{ top: 300, bottom: 400 }])).toBe(0);
  });

  it('tolerates a 1px border between the zone and the nested zone', () => {
    expect(overlayTopOffset(zone, [{ top: 101, bottom: 261 }])).toBe(161);
    expect(overlayTopOffset(zone, [{ top: 102, bottom: 262 }])).toBe(0);
  });

  it('uses the lowest of several nested zones', () => {
    expect(
      overlayTopOffset(zone, [
        { top: 100, bottom: 180 },
        { top: 100, bottom: 240 },
      ]),
    ).toBe(140);
  });

  it('never exceeds the height of the zone', () => {
    expect(overlayTopOffset(zone, [{ top: 100, bottom: 900 }])).toBe(500);
  });
});
