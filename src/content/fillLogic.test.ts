import { describe, it, expect } from 'vitest';
import {
  DUMMY_DATA,
  getDummyValueForType,
  isSkippedInputType,
  resolveRangeMidpoint,
  groupRadiosByName,
  resolveSelectIndex,
  SKIPPED_INPUT_TYPES,
} from './fillLogic';

describe('getDummyValueForType', () => {
  const cases: ReadonlyArray<[string, string]> = [
    ['text', 'John Doe'],
    ['password', 'P@ssw0rd123'],
    ['number', '42'],
    ['email', 'test@example.com'],
    ['url', 'https://example.com'],
    ['date', '2000-01-01'],
    ['time', '09:00'],
    ['datetime-local', '2000-01-01T09:00'],
    ['color', '#ff0000'],
    ['textarea', 'This is a dummy text for testing purposes.'],
  ];

  it.each(cases)('maps %s -> %s', (type, expected) => {
    expect(getDummyValueForType(type)).toBe(expected);
  });

  it('returns undefined for types without a direct value mapping', () => {
    for (const type of ['radio', 'checkbox', 'select', 'range', 'file', 'unknown']) {
      expect(getDummyValueForType(type)).toBeUndefined();
    }
  });

  it('DUMMY_DATA stays in sync with the documented value set', () => {
    expect(Object.keys(DUMMY_DATA).sort()).toEqual(
      [
        'color',
        'date',
        'datetime-local',
        'email',
        'number',
        'password',
        'text',
        'textarea',
        'time',
        'url',
      ].sort(),
    );
  });
});

describe('isSkippedInputType', () => {
  it('skips the non-fillable input types', () => {
    for (const type of SKIPPED_INPUT_TYPES) {
      expect(isSkippedInputType(type)).toBe(true);
    }
    expect(isSkippedInputType('file')).toBe(true);
    expect(isSkippedInputType('hidden')).toBe(true);
  });

  it('does not skip fillable types', () => {
    for (const type of ['text', 'email', 'checkbox', 'radio', 'range', 'color']) {
      expect(isSkippedInputType(type)).toBe(false);
    }
  });
});

describe('resolveRangeMidpoint', () => {
  it('uses 0/100 defaults for missing bounds', () => {
    expect(resolveRangeMidpoint('', '')).toBe(50);
    expect(resolveRangeMidpoint(null, null)).toBe(50);
    expect(resolveRangeMidpoint(undefined, undefined)).toBe(50);
  });

  it('computes the midpoint for explicit numeric bounds', () => {
    expect(resolveRangeMidpoint('0', '10')).toBe(5);
    expect(resolveRangeMidpoint('20', '40')).toBe(30);
    expect(resolveRangeMidpoint(10, 20)).toBe(15);
  });

  it('falls back to defaults for NaN bounds', () => {
    expect(resolveRangeMidpoint('abc', 'def')).toBe(50);
    expect(resolveRangeMidpoint('abc', '10')).toBe(5); // lo=0, hi=10
    expect(resolveRangeMidpoint('10', 'xyz')).toBe(55); // lo=10, hi=100
  });
});

describe('groupRadiosByName', () => {
  it('returns only the first radio per named group, in order', () => {
    const radios = [
      { name: 'color', id: 'a' },
      { name: 'color', id: 'b' },
      { name: 'size', id: 'c' },
      { name: 'size', id: 'd' },
      { name: 'color', id: 'e' },
    ];
    expect(groupRadiosByName(radios).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('treats empty-name radios as individual ungrouped entries', () => {
    const radios = [
      { name: '', id: 'a' },
      { name: '', id: 'b' },
    ];
    expect(groupRadiosByName(radios).map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('returns an empty array for no radios', () => {
    expect(groupRadiosByName([])).toEqual([]);
  });
});

describe('resolveSelectIndex', () => {
  it('selects index 1 when more than one option exists', () => {
    expect(resolveSelectIndex(3)).toBe(1);
    expect(resolveSelectIndex(2)).toBe(1);
  });

  it('selects index 0 when only one option exists', () => {
    expect(resolveSelectIndex(1)).toBe(0);
  });

  it('returns -1 when there are no options', () => {
    expect(resolveSelectIndex(0)).toBe(-1);
  });
});
