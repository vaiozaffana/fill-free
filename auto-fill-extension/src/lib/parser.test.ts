import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseFile, UnsupportedFileError } from './parser';

function jsonFile(name: string, data: unknown): File {
  return new File([JSON.stringify(data)], name, { type: 'application/json' });
}

function csvFile(name: string, text: string): File {
  return new File([text], name, { type: 'text/csv' });
}

function xlsxFile(name: string, rows: Record<string, unknown>[]): File {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, 'Sheet1');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

describe('parseFile — JSON', () => {
  it('parses an array of objects', async () => {
    const file = jsonFile('data.json', [
      { name: 'John', email: 'j@x.com' },
      { name: 'Jane', email: 'jane@x.com' },
    ]);
    const result = await parseFile(file);
    expect(result.headers).toEqual(['name', 'email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({ name: 'John', email: 'j@x.com' });
  });

  it('normalizes a single object into one row', async () => {
    const file = jsonFile('data.json', { name: 'Solo', age: 30 });
    const result = await parseFile(file);
    expect(result.headers).toEqual(['name', 'age']);
    expect(result.rows).toEqual([{ name: 'Solo', age: '30' }]);
  });
});

describe('parseFile — CSV', () => {
  it('parses CSV with a header row', async () => {
    const file = csvFile('data.csv', 'name,email\nJohn,j@x.com\nJane,jane@x.com\n');
    const result = await parseFile(file);
    expect(result.headers).toEqual(['name', 'email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[1]).toEqual({ name: 'Jane', email: 'jane@x.com' });
  });
});

describe('parseFile — XLSX', () => {
  it('parses the first sheet into rows', async () => {
    const file = xlsxFile('data.xlsx', [
      { name: 'John', email: 'j@x.com' },
      { name: 'Jane', email: 'jane@x.com' },
    ]);
    const result = await parseFile(file);
    expect(result.headers).toEqual(['name', 'email']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].name).toBe('John');
  });
});

describe('parseFile — unsupported', () => {
  it('throws UnsupportedFileError for unknown extensions', async () => {
    const file = new File(['x'], 'data.txt', { type: 'text/plain' });
    await expect(parseFile(file)).rejects.toBeInstanceOf(UnsupportedFileError);
  });

  it('throws UnsupportedFileError when there is no extension', async () => {
    const file = new File(['x'], 'data', { type: 'text/plain' });
    await expect(parseFile(file)).rejects.toBeInstanceOf(UnsupportedFileError);
  });
});
