/**
 * Pure, framework-agnostic fill logic.
 *
 * Kept separate from `filler.ts` (the injected IIFE) so the value-mapping
 * rules can be unit-tested without a real injected page context.
 */

/** Input `type` values we know how to fill with a single dummy value. */
export type FillableInputType =
  | 'text'
  | 'password'
  | 'number'
  | 'email'
  | 'url'
  | 'date'
  | 'time'
  | 'datetime-local'
  | 'color';

/** Input `type` values that must never be filled. */
export const SKIPPED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
  'file',
]);

/**
 * Dummy values keyed by input `type`, per the AGENTS.md specification.
 * `textarea` is included here for convenience even though it is an element,
 * not an input type.
 */
export const DUMMY_DATA: Readonly<Record<string, string>> = {
  text: 'John Doe',
  password: 'P@ssw0rd123',
  number: '42',
  email: 'test@example.com',
  url: 'https://example.com',
  date: '2000-01-01',
  time: '09:00',
  'datetime-local': '2000-01-01T09:00',
  color: '#ff0000',
  textarea: 'This is a dummy text for testing purposes.',
};

/**
 * Returns the dummy value for a simple value-based input `type`, or
 * `undefined` if the type has no direct mapping (e.g. radio/checkbox/select/
 * range need dedicated handling, and skipped types have no value).
 */
export function getDummyValueForType(type: string): string | undefined {
  return DUMMY_DATA[type];
}

/** True when an input of this `type` must be skipped entirely. */
export function isSkippedInputType(type: string): boolean {
  return SKIPPED_INPUT_TYPES.has(type);
}

/**
 * Computes the midpoint for a range input.
 *
 * `min`/`max` come from the DOM as strings (possibly empty). When either is
 * missing or non-numeric, defaults of `0` and `100` are used per the spec,
 * so a bare `<input type="range">` resolves to `50`.
 */
export function resolveRangeMidpoint(
  min: string | number | null | undefined,
  max: string | number | null | undefined,
): number {
  const parsedMin = Number(min);
  const parsedMax = Number(max);
  const lo = Number.isNaN(parsedMin) || min === '' || min == null ? 0 : parsedMin;
  const hi = Number.isNaN(parsedMax) || max === '' || max == null ? 100 : parsedMax;
  return (lo + hi) / 2;
}

/** Minimal shape needed to group radio inputs by name. */
export interface NamedRadio {
  readonly name: string;
}

/**
 * Given radios in document order, returns the first radio of each named group.
 * Radios with an empty `name` are treated as their own ungrouped entries and
 * are each returned (an empty name cannot identify a shared group).
 */
export function groupRadiosByName<T extends NamedRadio>(radios: readonly T[]): T[] {
  const seen = new Set<string>();
  const firstPerGroup: T[] = [];
  for (const radio of radios) {
    if (radio.name === '') {
      firstPerGroup.push(radio);
      continue;
    }
    if (seen.has(radio.name)) continue;
    seen.add(radio.name);
    firstPerGroup.push(radio);
  }
  return firstPerGroup;
}

/**
 * Returns the option index to select for a `<select>` with `optionCount`
 * options: index `1` when it exists, otherwise `0`. Returns `-1` when there
 * are no options to select.
 */
export function resolveSelectIndex(optionCount: number): number {
  if (optionCount <= 0) return -1;
  return optionCount > 1 ? 1 : 0;
}
