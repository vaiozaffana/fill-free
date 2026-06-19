import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedData } from './types';

/** Thrown when an uploaded file has an unsupported extension. */
export class UnsupportedFileError extends Error {
  constructor(extension: string) {
    super(`Unsupported file type: ${extension || '(none)'}. Use .json, .csv, or .xlsx.`);
    this.name = 'UnsupportedFileError';
  }
}

/** Lowercased file extension without the dot (e.g. `"csv"`), or `''`. */
function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/** Coerce any cell value to a string; null/undefined become `''`. */
function toStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
}

/**
 * Normalize an array of plain row objects into `ParsedData`. Headers are the
 * union of all keys, preserving first-seen order. All values are stringified.
 */
function normalizeRows(rawRows: Record<string, unknown>[]): ParsedData {
  const headers: string[] = [];
  const seen = new Set<string>();
  const rows: Record<string, string>[] = [];

  for (const raw of rawRows) {
    const row: Record<string, string> = {};
    for (const key of Object.keys(raw)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
      row[key] = toStr(raw[key]);
    }
    rows.push(row);
  }

  return { headers, rows };
}

/** Parse JSON text: accept an array of objects or a single object. */
function parseJson(text: string): ParsedData {
  const data: unknown = JSON.parse(text);
  const array = Array.isArray(data) ? data : [data];
  const objectRows = array.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  );
  return normalizeRows(objectRows);
}

/** Parse CSV text using PapaParse with header mode. */
function parseCsv(text: string): ParsedData {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return normalizeRows(result.data);
}

/** Parse XLSX from an ArrayBuffer: first sheet → JSON rows. */
function parseXlsx(buffer: ArrayBuffer): ParsedData {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (firstSheetName === undefined) return { headers: [], rows: [] };
  const sheet = workbook.Sheets[firstSheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
  return normalizeRows(json);
}

/**
 * Parse an uploaded file into `ParsedData`, dispatching by extension.
 * Throws {@link UnsupportedFileError} for anything other than json/csv/xlsx.
 */
export async function parseFile(file: File): Promise<ParsedData> {
  const ext = getExtension(file.name);
  switch (ext) {
    case 'json':
      return parseJson(await file.text());
    case 'csv':
      return parseCsv(await file.text());
    case 'xlsx':
      return parseXlsx(await file.arrayBuffer());
    default:
      throw new UnsupportedFileError(ext);
  }
}
