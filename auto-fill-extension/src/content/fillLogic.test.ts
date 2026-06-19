import { describe, it, expect } from 'vitest';
import {
  DATA_POOLS,
  SKIPPED_INPUT_TYPES,
  isSkippedInputType,
  detectFieldCategory,
  shouldSkipField,
  createValueGenerator,
  resolveRangeMidpoint,
  groupRadiosByName,
  resolveSelectIndex,
  type FieldCategory,
} from './fillLogic';

describe('isSkippedInputType', () => {
  it('skips the non-fillable input types', () => {
    for (const type of SKIPPED_INPUT_TYPES) {
      expect(isSkippedInputType(type)).toBe(true);
    }
  });

  it('does not skip fillable types', () => {
    for (const type of ['text', 'email', 'checkbox', 'radio', 'range', 'color']) {
      expect(isSkippedInputType(type)).toBe(false);
    }
  });
});

describe('detectFieldCategory', () => {
  it('prioritizes standardized autocomplete tokens', () => {
    expect(detectFieldCategory({ type: 'text', autocomplete: 'given-name' })).toBe('firstName');
    expect(detectFieldCategory({ type: 'text', autocomplete: 'family-name' })).toBe('lastName');
    expect(detectFieldCategory({ type: 'text', autocomplete: 'email' })).toBe('email');
    expect(detectFieldCategory({ type: 'text', autocomplete: 'organization' })).toBe('company');
    expect(detectFieldCategory({ type: 'text', autocomplete: 'postal-code' })).toBe('zipCode');
  });

  it('uses the input type as a strong signal', () => {
    expect(detectFieldCategory({ type: 'email' })).toBe('email');
    expect(detectFieldCategory({ type: 'password' })).toBe('password');
    expect(detectFieldCategory({ type: 'tel' })).toBe('phone');
    expect(detectFieldCategory({ type: 'url' })).toBe('url');
    expect(detectFieldCategory({ type: 'date' })).toBe('date');
    expect(detectFieldCategory({ type: 'color' })).toBe('color');
    expect(detectFieldCategory({ type: 'textarea' })).toBe('paragraph');
  });

  it('matches keywords from name/id/placeholder/aria/label', () => {
    expect(detectFieldCategory({ type: 'text', name: 'first_name' })).toBe('firstName');
    expect(detectFieldCategory({ type: 'text', id: 'lastName' })).toBe('lastName');
    expect(detectFieldCategory({ type: 'text', placeholder: 'Full Name' })).toBe('fullName');
    expect(detectFieldCategory({ type: 'text', ariaLabel: 'Company' })).toBe('company');
    expect(detectFieldCategory({ type: 'text', labelText: 'Job Title' })).toBe('jobTitle');
    expect(detectFieldCategory({ type: 'text', name: 'city' })).toBe('city');
    expect(detectFieldCategory({ type: 'text', name: 'user_login' })).toBe('username');
    expect(detectFieldCategory({ type: 'text', name: 'website' })).toBe('url');
  });

  it('routes generic numeric inputs to the number pool, but keeps age/zip', () => {
    expect(detectFieldCategory({ type: 'number', name: 'quantity' })).toBe('number');
    expect(detectFieldCategory({ type: 'number', name: 'age' })).toBe('age');
    expect(detectFieldCategory({ type: 'number', name: 'zip' })).toBe('zipCode');
  });

  it('falls back to a generic text category', () => {
    expect(detectFieldCategory({ type: 'text', name: 'xyz123' })).toBe('text');
    expect(detectFieldCategory({ type: 'text' })).toBe('text');
  });

  it('every category has a non-empty data pool', () => {
    const categories = Object.keys(DATA_POOLS) as FieldCategory[];
    for (const category of categories) {
      expect(DATA_POOLS[category].length).toBeGreaterThan(0);
    }
  });
});

describe('shouldSkipField', () => {
  it('skips non-fillable input types', () => {
    expect(shouldSkipField({ type: 'file' })).toBe(true);
    expect(shouldSkipField({ type: 'hidden' })).toBe(true);
  });

  it('skips readonly and disabled fields', () => {
    expect(shouldSkipField({ type: 'text', readOnly: true })).toBe(true);
    expect(shouldSkipField({ type: 'text', disabled: true })).toBe(true);
  });

  it('skips ARIA readonly/disabled fields', () => {
    expect(shouldSkipField({ type: 'text', ariaReadonly: 'true' })).toBe(true);
    expect(shouldSkipField({ type: 'text', ariaDisabled: 'true' })).toBe(true);
    expect(shouldSkipField({ type: 'text', ariaReadonly: '' })).toBe(true);
  });

  it('respects data-autofill / data-no-autofill opt-out', () => {
    expect(shouldSkipField({ type: 'text', dataAutofill: 'off' })).toBe(true);
    expect(shouldSkipField({ type: 'text', dataAutofill: 'false' })).toBe(true);
    expect(shouldSkipField({ type: 'text', dataAutofill: 'no' })).toBe(true);
    expect(shouldSkipField({ type: 'text', dataAutofill: '' })).toBe(true); // data-no-autofill
  });

  it('skips auto-generated/system fields by name or id', () => {
    expect(shouldSkipField({ type: 'text', name: 'csrf_token' })).toBe(true);
    expect(shouldSkipField({ type: 'text', name: 'authenticity_token' })).toBe(true);
    expect(shouldSkipField({ type: 'text', id: 'g-recaptcha-response' })).toBe(true);
    expect(shouldSkipField({ type: 'text', name: 'request_id' })).toBe(true);
    expect(shouldSkipField({ type: 'text', id: 'user_uuid' })).toBe(true);
    expect(shouldSkipField({ type: 'text', name: 'created_timestamp' })).toBe(true);
  });

  it('does not skip ordinary writable fields', () => {
    expect(shouldSkipField({ type: 'text', name: 'first_name' })).toBe(false);
    expect(shouldSkipField({ type: 'email', name: 'email' })).toBe(false);
    expect(shouldSkipField({ type: 'text', dataAutofill: 'on' })).toBe(false);
    expect(shouldSkipField({ type: 'text', readOnly: false, disabled: false })).toBe(false);
  });
});

describe('createValueGenerator', () => {
  it('hands out a different value to successive fields of the same category', () => {
    const gen = createValueGenerator();
    const a = gen.next('firstName');
    const b = gen.next('firstName');
    const c = gen.next('firstName');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect([a, b, c].every((v) => DATA_POOLS.firstName.includes(v))).toBe(true);
  });

  it('rotates back to the start of the pool once exhausted', () => {
    const gen = createValueGenerator();
    const poolSize = DATA_POOLS.city.length;
    const first = gen.next('city');
    for (let i = 1; i < poolSize; i++) gen.next('city');
    expect(gen.next('city')).toBe(first); // wrapped around
  });

  it('tracks categories independently', () => {
    const gen = createValueGenerator();
    expect(gen.next('email')).toBe(DATA_POOLS.email[0]);
    expect(gen.next('company')).toBe(DATA_POOLS.company[0]);
    expect(gen.next('email')).toBe(DATA_POOLS.email[1]);
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
    expect(resolveRangeMidpoint(10, 20)).toBe(15);
  });

  it('falls back to defaults for NaN bounds', () => {
    expect(resolveRangeMidpoint('abc', 'def')).toBe(50);
    expect(resolveRangeMidpoint('abc', '10')).toBe(5);
    expect(resolveRangeMidpoint('10', 'xyz')).toBe(55);
  });
});

describe('groupRadiosByName', () => {
  it('returns only the first radio per named group, in order', () => {
    const radios = [
      { name: 'color', id: 'a' },
      { name: 'color', id: 'b' },
      { name: 'size', id: 'c' },
      { name: 'size', id: 'd' },
    ];
    expect(groupRadiosByName(radios).map((r) => r.id)).toEqual(['a', 'c']);
  });

  it('treats empty-name radios as individual entries', () => {
    const radios = [
      { name: '', id: 'a' },
      { name: '', id: 'b' },
    ];
    expect(groupRadiosByName(radios).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('resolveSelectIndex', () => {
  it('selects index 1 when more than one option exists', () => {
    expect(resolveSelectIndex(3)).toBe(1);
  });
  it('selects index 0 when only one option exists', () => {
    expect(resolveSelectIndex(1)).toBe(0);
  });
  it('returns -1 when there are no options', () => {
    expect(resolveSelectIndex(0)).toBe(-1);
  });
});
