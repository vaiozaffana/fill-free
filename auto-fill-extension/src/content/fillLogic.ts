/**
 * Pure, framework-agnostic fill logic.
 *
 * Kept separate from `filler.ts` (the injected IIFE) so the detection,
 * value-generation, and skip rules can be unit-tested without a real page.
 */

/* -------------------------------------------------------------------------- */
/* Input type handling                                                        */
/* -------------------------------------------------------------------------- */

/** Input `type` values that must never be filled. */
export const SKIPPED_INPUT_TYPES: ReadonlySet<string> = new Set([
  'hidden',
  'submit',
  'button',
  'reset',
  'image',
  'file',
]);

/** True when an input of this `type` must be skipped entirely. */
export function isSkippedInputType(type: string): boolean {
  return SKIPPED_INPUT_TYPES.has(type);
}

/* -------------------------------------------------------------------------- */
/* Field categories + professional data pools                                 */
/* -------------------------------------------------------------------------- */

/** Semantic categories a text-like field can resolve to. */
export type FieldCategory =
  | 'fullName'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'phone'
  | 'username'
  | 'password'
  | 'company'
  | 'jobTitle'
  | 'streetAddress'
  | 'city'
  | 'state'
  | 'zipCode'
  | 'country'
  | 'url'
  | 'age'
  | 'number'
  | 'date'
  | 'time'
  | 'datetimeLocal'
  | 'month'
  | 'week'
  | 'color'
  | 'paragraph'
  | 'text';

/**
 * Professional, realistic sample values for each category. Multiple entries
 * per category let the generator hand out a *different* value to each field
 * of the same kind (e.g. two "first name" inputs become Olivia and Marcus).
 *
 * Names/emails use the reserved `example.com` domain and fictional people.
 */
export const DATA_POOLS: Readonly<Record<FieldCategory, readonly string[]>> = {
  fullName: ['Olivia Bennett', 'Marcus Chen', 'Sophia Rodriguez', 'James Okafor', 'Amara Patel'],
  firstName: ['Olivia', 'Marcus', 'Sophia', 'James', 'Amara'],
  lastName: ['Bennett', 'Chen', 'Rodriguez', 'Okafor', 'Patel'],
  email: [
    'olivia.bennett@example.com',
    'marcus.chen@example.com',
    'sophia.rodriguez@example.com',
    'james.okafor@example.com',
    'amara.patel@example.com',
  ],
  phone: [
    '+1 (555) 012-3456',
    '+1 (555) 028-7741',
    '+1 (555) 094-1185',
    '+1 (555) 063-9920',
  ],
  username: ['obennett', 'mchen', 'srodriguez', 'jokafor', 'apatel'],
  password: ['Str0ng&Pass!9', 'Vault#Secure72', 'Tr0ub4dor&3', 'P@ssphrase!58'],
  company: [
    'Northwind Analytics',
    'Vertex Robotics',
    'Lumen Software',
    'Atlas Logistics',
    'Cobalt Health',
  ],
  jobTitle: [
    'Senior Software Engineer',
    'Product Manager',
    'UX Designer',
    'Data Analyst',
    'Engineering Manager',
  ],
  streetAddress: [
    '742 Evergreen Terrace',
    '1600 Pennsylvania Avenue',
    '221 Baker Street',
    '500 Market Street',
  ],
  city: ['San Francisco', 'Austin', 'Seattle', 'Boston', 'Denver'],
  state: ['California', 'Texas', 'Washington', 'Massachusetts', 'Colorado'],
  zipCode: ['94105', '73301', '98101', '02110', '80202'],
  country: ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'],
  url: [
    'https://example.com',
    'https://portfolio.example.dev',
    'https://acme.example.org',
    'https://blog.example.net',
  ],
  age: ['28', '34', '41', '26', '37'],
  number: ['42', '128', '7', '256', '99'],
  date: ['1990-05-14', '1985-11-02', '1995-07-23', '1988-03-30'],
  time: ['09:00', '13:30', '17:45', '08:15'],
  datetimeLocal: ['2000-01-01T09:00', '2010-06-15T13:30', '2018-09-20T17:45'],
  month: ['2000-01', '2010-06', '2018-09', '1995-12'],
  week: ['2000-W01', '2010-W24', '2018-W38', '1995-W52'],
  color: ['#4f6ef6', '#16a34a', '#dc2626', '#f59e0b', '#7c3aed'],
  paragraph: [
    'This is sample content generated for testing purposes. It is safe to ignore.',
    'Placeholder text used to validate form behaviour during development.',
    'Lorem ipsum style filler used to exercise multi-line text fields.',
  ],
  text: ['Sample value', 'Test entry', 'Example input', 'Demo content'],
};

/* -------------------------------------------------------------------------- */
/* Field detection                                                            */
/* -------------------------------------------------------------------------- */

/** Read-only metadata describing a field, used for detection + skip rules. */
export interface FieldMeta {
  /** The input `type` (or `'textarea'` / `'select'`). */
  readonly type: string;
  readonly name?: string;
  readonly id?: string;
  readonly placeholder?: string;
  /** `autocomplete` attribute — standardized tokens get top priority. */
  readonly autocomplete?: string;
  readonly ariaLabel?: string;
  /** Text of an associated `<label>`, if any. */
  readonly labelText?: string;
}

/** Standardized `autocomplete` tokens mapped to a category. */
const AUTOCOMPLETE_MAP: Readonly<Record<string, FieldCategory>> = {
  name: 'fullName',
  'given-name': 'firstName',
  'additional-name': 'firstName',
  'family-name': 'lastName',
  email: 'email',
  username: 'username',
  'new-password': 'password',
  'current-password': 'password',
  tel: 'phone',
  'tel-national': 'phone',
  organization: 'company',
  'organization-title': 'jobTitle',
  'street-address': 'streetAddress',
  'address-line1': 'streetAddress',
  'address-level2': 'city',
  'address-level1': 'state',
  'postal-code': 'zipCode',
  country: 'country',
  'country-name': 'country',
  url: 'url',
  bday: 'date',
};

/** Keyword patterns checked against the combined field text, in priority order. */
const KEYWORD_RULES: ReadonlyArray<readonly [RegExp, FieldCategory]> = [
  [/(first|given)[\s_-]*name|firstname|fname/, 'firstName'],
  [/(last|family|sur)[\s_-]*name|lastname|lname|surname/, 'lastName'],
  [/full[\s_-]*name|fullname|your[\s_-]*name|\bname\b/, 'fullName'],
  [/e[-\s]?mail/, 'email'],
  [/phone|mobile|\btel\b|telephone|contact[\s_-]*number/, 'phone'],
  [/user[\s_-]*name|userid|user[\s_-]*id|\blogin\b/, 'username'],
  [/pass(word|phrase|wd)?\b/, 'password'],
  [/company|organi[sz]ation|employer|business[\s_-]*name/, 'company'],
  [/job[\s_-]*title|position|occupation|\brole\b|designation/, 'jobTitle'],
  [/street|address[\s_-]*line|address1|\baddr\b|street[\s_-]*address/, 'streetAddress'],
  [/\bcity\b|town|locality/, 'city'],
  [/\bstate\b|province|region/, 'state'],
  [/zip|postal|postcode|post[\s_-]*code/, 'zipCode'],
  [/country/, 'country'],
  [/website|web[\s_-]*site|\burl\b|homepage|\bsite\b/, 'url'],
  [/\bage\b/, 'age'],
  [/comment|message|\bbio\b|biography|description|about|notes?|feedback|summary/, 'paragraph'],
  [/address/, 'streetAddress'],
];

/** Combine all textual hints for a field into one lowercased haystack. */
function buildHaystack(meta: FieldMeta): string {
  return [meta.name, meta.id, meta.placeholder, meta.ariaLabel, meta.labelText]
    .filter((part): part is string => typeof part === 'string')
    .join(' ')
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ');
}

/**
 * Resolve a field to a semantic category using (in priority order):
 * 1. the `autocomplete` token, 2. the input `type`, 3. keyword heuristics on
 * name/id/placeholder/aria-label/label, falling back to a generic category.
 */
export function detectFieldCategory(meta: FieldMeta): FieldCategory {
  const autocomplete = meta.autocomplete?.trim().toLowerCase();
  if (autocomplete && autocomplete in AUTOCOMPLETE_MAP) {
    return AUTOCOMPLETE_MAP[autocomplete];
  }

  // Strong type-based signals take precedence over fuzzy keyword matching.
  switch (meta.type) {
    case 'email':
      return 'email';
    case 'password':
      return 'password';
    case 'tel':
      return 'phone';
    case 'url':
      return 'url';
    case 'date':
      return 'date';
    case 'time':
      return 'time';
    case 'datetime-local':
      return 'datetimeLocal';
    case 'month':
      return 'month';
    case 'week':
      return 'week';
    case 'color':
      return 'color';
    case 'textarea':
      return 'paragraph';
  }

  const haystack = buildHaystack(meta);
  for (const [pattern, category] of KEYWORD_RULES) {
    if (pattern.test(haystack)) {
      // A number-typed field that reads like a zip/age keeps the right pool,
      // but otherwise numeric inputs use the numeric pool.
      if (meta.type === 'number' && category !== 'zipCode' && category !== 'age') {
        return 'number';
      }
      return category;
    }
  }

  if (meta.type === 'number') return 'number';
  return 'text';
}

/* -------------------------------------------------------------------------- */
/* Skip rules (readonly / disabled / auto-generated / opt-out)                */
/* -------------------------------------------------------------------------- */

/** Runtime state of a field, used to decide whether it should be skipped. */
export interface FieldSkipState {
  readonly type: string;
  readonly readOnly?: boolean;
  readonly disabled?: boolean;
  /** Raw `aria-readonly` attribute value. */
  readonly ariaReadonly?: string | null;
  /** Raw `aria-disabled` attribute value. */
  readonly ariaDisabled?: string | null;
  /** Opt-out attribute, e.g. `data-autofill="off"` or `data-no-autofill`. */
  readonly dataAutofill?: string | null;
  readonly name?: string;
  readonly id?: string;
}

/**
 * Keywords that mark a field as auto-generated / system-managed. Such fields
 * (CSRF tokens, captchas, generated IDs, timestamps) must not be overwritten.
 */
const AUTO_GENERATED_PATTERN =
  /csrf|xsrf|\btoken\b|captcha|recaptcha|nonce|\buuid\b|\bguid\b|timestamp|auto[\s_-]*generated|generated[\s_-]*id|request[\s_-]*id|session[\s_-]*id|hidden[\s_-]*id/;

/** True for attribute values that mean "true"/"on"/"off" opt-out signals. */
function isTruthyAttr(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'true' || v === 'on' || v === 'yes' || v === '1';
}

/** True when the opt-out attribute explicitly disables autofill. */
function isAutofillOptOut(value: string | null | undefined): boolean {
  if (value == null) return false;
  const v = value.trim().toLowerCase();
  // `data-no-autofill` (empty) or `data-autofill="off|false|no"` opt out.
  return v === '' || v === 'off' || v === 'false' || v === 'no' || v === '0';
}

/**
 * Decide whether a field must be skipped. A field is skipped when it is:
 * - a non-fillable input type, or
 * - read-only or disabled (native or ARIA), or
 * - explicitly opted out via `data-autofill`/`data-no-autofill`, or
 * - auto-generated/system-managed based on its name/id.
 */
export function shouldSkipField(state: FieldSkipState): boolean {
  if (isSkippedInputType(state.type)) return true;
  if (state.readOnly === true) return true;
  if (state.disabled === true) return true;
  if (isTruthyAttr(state.ariaReadonly)) return true;
  if (isTruthyAttr(state.ariaDisabled)) return true;
  if (isAutofillOptOut(state.dataAutofill)) return true;

  // Normalize separators (_ - .) to spaces so `\btoken\b` matches inside
  // identifiers like `csrf_token`, `authenticity-token`, or `g-recaptcha-response`.
  const identifier = `${state.name ?? ''} ${state.id ?? ''}`
    .toLowerCase()
    .replace(/[_\-.]+/g, ' ');
  if (AUTO_GENERATED_PATTERN.test(identifier)) return true;

  return false;
}

/* -------------------------------------------------------------------------- */
/* Value generator (rotates so each field gets a different value)             */
/* -------------------------------------------------------------------------- */

/** A stateful generator that hands out a distinct value per category call. */
export interface ValueGenerator {
  /** Next professional value for `category`, rotating through its pool. */
  next(category: FieldCategory): string;
}

/**
 * Create a value generator. Each call to `next(category)` returns the next
 * entry from that category's pool, cycling back to the start once exhausted,
 * so successive fields of the same kind receive different sample data.
 */
export function createValueGenerator(): ValueGenerator {
  const counters = new Map<FieldCategory, number>();
  return {
    next(category: FieldCategory): string {
      const pool = DATA_POOLS[category];
      const index = counters.get(category) ?? 0;
      counters.set(category, index + 1);
      return pool[index % pool.length];
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Range + select + radio helpers (unchanged behaviour)                       */
/* -------------------------------------------------------------------------- */

/**
 * Computes the midpoint for a range input. Missing/non-numeric bounds default
 * to `0` and `100`, so a bare `<input type="range">` resolves to `50`.
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
 * Radios with an empty `name` are treated as their own ungrouped entries.
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
 * options: index `1` when it exists, otherwise `0`. Returns `-1` when empty.
 */
export function resolveSelectIndex(optionCount: number): number {
  if (optionCount <= 0) return -1;
  return optionCount > 1 ? 1 : 0;
}
