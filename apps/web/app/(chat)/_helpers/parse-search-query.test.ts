import { describe, expect, it } from 'vitest';
import {
  absorbFilterChips,
  joinSearchQuery,
  parseSearchQuery,
  searchInputFromQuery,
  withoutIncompleteFilter,
} from './parse-search-query';

describe('absorbFilterChips', () => {
  it('keeps a filter that is still being typed in the draft', () => {
    expect(absorbFilterChips([], 'from:ju')).toEqual({
      chips: [],
      draft: 'from:ju',
    });
  });

  it('turns a filter into a chip once a space ends it', () => {
    expect(absorbFilterChips([], 'from:julia ')).toEqual({
      chips: [{ key: 'from', value: 'julia' }],
      draft: '',
    });
  });

  it('leaves the surrounding text in the draft', () => {
    expect(absorbFilterChips([], 'hello from:julia there')).toEqual({
      chips: [{ key: 'from', value: 'julia' }],
      draft: 'hello there',
    });
  });

  it('keeps a trailing half-typed filter while absorbing finished ones', () => {
    expect(absorbFilterChips([], 'in:general from:ju')).toEqual({
      chips: [{ key: 'in', value: 'general' }],
      draft: 'from:ju',
    });
  });

  it('reads quoted values and strips the @ and # prefixes', () => {
    expect(
      absorbFilterChips([], 'from:"Julia Jeszi" in:#general mentions:@sam '),
    ).toEqual({
      chips: [
        { key: 'from', value: 'Julia Jeszi' },
        { key: 'in', value: 'general' },
        { key: 'mentions', value: 'sam' },
      ],
      draft: '',
    });
  });

  it('replaces an existing chip with the same key', () => {
    expect(
      absorbFilterChips([{ key: 'from', value: 'sam' }], 'from:julia '),
    ).toEqual({ chips: [{ key: 'from', value: 'julia' }], draft: '' });
  });

  it('does not treat the end of a word as a filter', () => {
    expect(absorbFilterChips([], 'main:foo ')).toEqual({
      chips: [],
      draft: 'main:foo ',
    });
  });

  it('keeps typed spaces so the input stays editable', () => {
    expect(absorbFilterChips([], 'hello ')).toEqual({
      chips: [],
      draft: 'hello ',
    });
  });

  it('absorbs a trailing filter when the search is submitted', () => {
    expect(absorbFilterChips([], 'from:ju', { final: true })).toEqual({
      chips: [{ key: 'from', value: 'ju' }],
      draft: '',
    });
  });
});

describe('joinSearchQuery', () => {
  it('ends every chip with a space so the parser sees it as finished', () => {
    const query = joinSearchQuery({
      chips: [{ key: 'from', value: 'julia' }],
      draft: '',
    });
    expect(query).toBe('from:julia ');
    expect(parseSearchQuery(query)).toMatchObject({
      from: 'julia',
      incomplete: null,
    });
  });

  it('quotes values that contain spaces', () => {
    expect(
      joinSearchQuery({
        chips: [{ key: 'from', value: 'Julia Jeszi' }],
        draft: 'hi',
      }),
    ).toBe('from:"Julia Jeszi" hi');
  });

  it('keeps a half-typed filter last so suggestions still work', () => {
    const query = joinSearchQuery({
      chips: [{ key: 'in', value: 'general' }],
      draft: 'from:ju',
    });
    expect(parseSearchQuery(query)).toMatchObject({
      in: 'general',
      incomplete: 'from',
      incompleteQuery: 'ju',
    });
  });
});

describe('searchInputFromQuery', () => {
  it('restores a history entry as chips plus text', () => {
    expect(searchInputFromQuery('from:julia in:general standup')).toEqual({
      chips: [
        { key: 'from', value: 'julia' },
        { key: 'in', value: 'general' },
      ],
      draft: 'standup',
    });
  });
});

describe('withoutIncompleteFilter', () => {
  it('drops a filter that is still being typed', () => {
    expect(withoutIncompleteFilter('from:julia sticker in:')).toBe(
      'from:julia sticker',
    );
    expect(withoutIncompleteFilter('hello from:ju')).toBe('hello');
  });

  it('keeps finished filters and plain text', () => {
    expect(withoutIncompleteFilter('from:julia ')).toBe('from:julia ');
    expect(withoutIncompleteFilter('sticker run')).toBe('sticker run');
  });
});
