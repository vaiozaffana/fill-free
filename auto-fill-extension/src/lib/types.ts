/** Shared TypeScript types for the file-input / mapping pipeline. */

/** Normalized representation of an uploaded data file. */
export interface ParsedData {
  /** Column names from the file. */
  headers: string[];
  /** Each row as a `{ columnName: value }` record. */
  rows: Record<string, string>[];
}

/** A form control discovered on the active page. */
export interface FormField {
  /** Input type, or `'select'` / `'textarea'`. */
  type: string;
  name: string;
  id: string;
  /** Text content of the associated `<label>`, or `''` if none. */
  label: string;
}

/** Result of mapping file columns to form fields: `fieldName → value`. */
export type MappedData = Record<string, string>;
