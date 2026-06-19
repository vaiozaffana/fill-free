import type { FormField, MappedData } from './types';

/**
 * Find the value in `row` whose key matches `key` case-insensitively, or
 * `undefined` if none. Returns the first matching key in insertion order.
 */
function lookupCaseInsensitive(
  row: Record<string, string>,
  key: string,
): string | undefined {
  if (key === '') return undefined;
  const target = key.trim().toLowerCase();
  for (const rowKey of Object.keys(row)) {
    if (rowKey.trim().toLowerCase() === target) return row[rowKey];
  }
  return undefined;
}

/**
 * Partial match: any row key that is a substring of `fieldName` or vice versa
 * (case-insensitive). Returns the first such value, or `undefined`.
 */
function lookupPartial(
  row: Record<string, string>,
  fieldName: string,
): string | undefined {
  if (fieldName === '') return undefined;
  const name = fieldName.trim().toLowerCase();
  for (const rowKey of Object.keys(row)) {
    const key = rowKey.trim().toLowerCase();
    if (key === '') continue;
    if (name.includes(key) || key.includes(name)) return row[rowKey];
  }
  return undefined;
}

/**
 * Resolve the best matching value for a single field, applying the rules in
 * priority order and stopping at the first match:
 *   1. Exact match on `field.name`
 *   2. Match on `field.id`
 *   3. Match on `field.label`
 *   4. Partial (substring) match against `field.name`
 *   5. No match → `undefined`
 */
function resolveValue(field: FormField, row: Record<string, string>): string | undefined {
  return (
    lookupCaseInsensitive(row, field.name) ??
    lookupCaseInsensitive(row, field.id) ??
    lookupCaseInsensitive(row, field.label) ??
    lookupPartial(row, field.name)
  );
}

/**
 * Map form fields to values from a single file row.
 *
 * Only fields with a match and a non-empty value are included. The key in the
 * returned {@link MappedData} is the field's `name` when present, otherwise its
 * `id` (so id-only fields are still addressable downstream).
 */
export function mapFields(fields: FormField[], row: Record<string, string>): MappedData {
  const mapped: MappedData = {};

  for (const field of fields) {
    const value = resolveValue(field, row);
    if (value === undefined || value === '') continue;

    const targetKey = field.name !== '' ? field.name : field.id;
    if (targetKey === '') continue;

    mapped[targetKey] = value;
  }

  return mapped;
}
