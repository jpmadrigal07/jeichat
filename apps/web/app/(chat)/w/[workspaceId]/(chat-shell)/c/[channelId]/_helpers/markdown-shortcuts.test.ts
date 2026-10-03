import { describe, expect, it } from 'vitest';
import { replaceSelection } from './markdown-shortcuts';

describe('replaceSelection', () => {
  it('inserts at the caret and moves the caret after the text', () => {
    expect(replaceSelection('hello world', 5, 5, '😀')).toEqual({
      value: 'hello😀 world',
      selectionStart: 7,
      selectionEnd: 7,
    });
  });

  it('replaces a selected range', () => {
    expect(replaceSelection('hello world', 6, 11, '🎉')).toEqual({
      value: 'hello 🎉',
      selectionStart: 8,
      selectionEnd: 8,
    });
  });

  it('handles a reversed selection and an empty value', () => {
    expect(replaceSelection('abc', 3, 1, 'X').value).toBe('aX');
    expect(replaceSelection('', 0, 0, '👍').value).toBe('👍');
  });
});
