import { describe, it, expect } from 'vitest';
import { mapFields } from './mapper';
import type { FormField } from './types';

function field(partial: Partial<FormField>): FormField {
  return { type: 'text', name: '', id: '', label: '', ...partial };
}

describe('mapFields — priority rules', () => {
  it('rule 1: exact match on field.name (case-insensitive)', () => {
    const fields = [field({ name: 'email' })];
    expect(mapFields(fields, { Email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
  });

  it('rule 2: match on field.id when name does not match', () => {
    const fields = [field({ name: 'userEmail', id: 'email' })];
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({ userEmail: 'a@b.com' });
  });

  it('rule 3: match on field.label when name and id do not match', () => {
    const fields = [field({ name: 'f1', id: 'i1', label: 'Email Address' })];
    expect(mapFields(fields, { 'email address': 'a@b.com' })).toEqual({ f1: 'a@b.com' });
  });

  it('rule 4: partial substring match against field.name', () => {
    const fields = [field({ name: 'user_email_field' })];
    // row key "email" is a substring of the field name
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({ user_email_field: 'a@b.com' });
  });

  it('rule 4: partial match also works when field name is substring of key', () => {
    const fields = [field({ name: 'mail' })];
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({ mail: 'a@b.com' });
  });

  it('rule 5: excludes fields with no match', () => {
    const fields = [field({ name: 'phone' })];
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({});
  });
});

describe('mapFields — priority order', () => {
  it('prefers exact name match over id/label/partial', () => {
    const fields = [field({ name: 'email', id: 'contact', label: 'Contact' })];
    const row = { email: 'exact@x.com', contact: 'byid@x.com' };
    expect(mapFields(fields, row)).toEqual({ email: 'exact@x.com' });
  });

  it('prefers id match over label and partial', () => {
    const fields = [field({ name: 'nomatch', id: 'email', label: 'Phone' })];
    const row = { email: 'byid@x.com', phone: '123' };
    expect(mapFields(fields, row)).toEqual({ nomatch: 'byid@x.com' });
  });
});

describe('mapFields — exclusions', () => {
  it('excludes fields whose matched value is empty', () => {
    const fields = [field({ name: 'email' })];
    expect(mapFields(fields, { email: '' })).toEqual({});
  });

  it('uses id as the output key when the field has no name', () => {
    const fields = [field({ name: '', id: 'email' })];
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({ email: 'a@b.com' });
  });

  it('skips fields with neither name nor id even if a value would match', () => {
    const fields = [field({ name: '', id: '', label: 'Email' })];
    expect(mapFields(fields, { email: 'a@b.com' })).toEqual({});
  });

  it('maps multiple fields independently', () => {
    const fields = [
      field({ name: 'name' }),
      field({ name: 'email' }),
      field({ name: 'phone' }),
    ];
    const row = { name: 'John', email: 'j@x.com' };
    expect(mapFields(fields, row)).toEqual({ name: 'John', email: 'j@x.com' });
  });
});
