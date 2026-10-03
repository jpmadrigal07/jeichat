import { describe, expect, it } from 'vitest';
import { toggleTaskAtOffset } from './task-list';

describe('toggleTaskAtOffset', () => {
  const content = '- [ ] one\n- [x] two\n* [ ] three';

  it('checks an unchecked item', () => {
    expect(toggleTaskAtOffset(content, 0, true)).toBe(
      '- [x] one\n- [x] two\n* [ ] three',
    );
  });

  it('unchecks a checked item (lowercase or uppercase x)', () => {
    expect(toggleTaskAtOffset(content, 10, false)).toBe(
      '- [ ] one\n- [ ] two\n* [ ] three',
    );
    expect(toggleTaskAtOffset('- [X] a', 0, false)).toBe('- [ ] a');
  });

  it('only changes the item at the offset', () => {
    expect(toggleTaskAtOffset(content, 20, true)).toBe(
      '- [ ] one\n- [x] two\n* [x] three',
    );
  });

  it('supports ordered and nested items', () => {
    expect(toggleTaskAtOffset('1. [ ] a\n2) [ ] b', 9, true)).toBe(
      '1. [ ] a\n2) [x] b',
    );
    expect(toggleTaskAtOffset('- [ ] a\n  - [ ] b', 10, true)).toBe(
      '- [ ] a\n  - [x] b',
    );
  });

  it('returns null when there is no task marker at the offset', () => {
    expect(toggleTaskAtOffset('- plain item', 0, true)).toBeNull();
    expect(toggleTaskAtOffset(content, 2, true)).toBeNull();
    expect(toggleTaskAtOffset(content, 999, true)).toBeNull();
  });
});
