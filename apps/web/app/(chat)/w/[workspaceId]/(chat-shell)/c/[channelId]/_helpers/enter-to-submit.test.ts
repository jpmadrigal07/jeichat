import { describe, expect, it } from 'vitest';
import { shouldSubmitOnEnter } from './enter-to-submit';

function keyEvent(
  overrides: Partial<{
    key: string;
    shiftKey: boolean;
    isComposing: boolean;
  }> = {},
) {
  const { key = 'Enter', shiftKey = false, isComposing = false } = overrides;
  return { key, shiftKey, nativeEvent: { isComposing } };
}

describe('shouldSubmitOnEnter', () => {
  it('submits on plain Enter with a fine pointer (desktop)', () => {
    expect(shouldSubmitOnEnter(keyEvent(), false)).toBe(true);
  });

  it('inserts a newline on Shift+Enter', () => {
    expect(shouldSubmitOnEnter(keyEvent({ shiftKey: true }), false)).toBe(
      false,
    );
  });

  it('inserts a newline on Enter with a coarse pointer (phone keyboard)', () => {
    expect(shouldSubmitOnEnter(keyEvent(), true)).toBe(false);
  });

  it('ignores Enter that confirms an IME composition', () => {
    expect(shouldSubmitOnEnter(keyEvent({ isComposing: true }), false)).toBe(
      false,
    );
  });

  it('ignores other keys', () => {
    expect(shouldSubmitOnEnter(keyEvent({ key: 'a' }), false)).toBe(false);
  });
});
