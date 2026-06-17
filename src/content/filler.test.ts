import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration test for the DOM-filling routine.
 *
 * `filler.ts` is an IIFE that runs on import, so each test re-imports it
 * against a freshly-built document via `vi.resetModules()` + dynamic import.
 */
async function runFiller(): Promise<void> {
  vi.resetModules();
  await import('./filler');
}

describe('filler.ts DOM filling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('fills value-based inputs with the documented dummy data', async () => {
    document.body.innerHTML = `
      <input id="t" type="text" />
      <input id="p" type="password" />
      <input id="n" type="number" />
      <input id="e" type="email" />
      <input id="u" type="url" />
      <input id="d" type="date" />
      <input id="tm" type="time" />
      <input id="dl" type="datetime-local" />
      <input id="c" type="color" />
    `;
    await runFiller();

    expect((document.getElementById('t') as HTMLInputElement).value).toBe('John Doe');
    expect((document.getElementById('p') as HTMLInputElement).value).toBe('P@ssw0rd123');
    expect((document.getElementById('n') as HTMLInputElement).value).toBe('42');
    expect((document.getElementById('e') as HTMLInputElement).value).toBe('test@example.com');
    expect((document.getElementById('u') as HTMLInputElement).value).toBe('https://example.com');
    expect((document.getElementById('d') as HTMLInputElement).value).toBe('2000-01-01');
    expect((document.getElementById('tm') as HTMLInputElement).value).toBe('09:00');
    expect((document.getElementById('dl') as HTMLInputElement).value).toBe('2000-01-01T09:00');
    expect((document.getElementById('c') as HTMLInputElement).value).toBe('#ff0000');
  });

  it('checks checkboxes and fills textareas', async () => {
    document.body.innerHTML = `
      <input id="cb" type="checkbox" />
      <textarea id="ta"></textarea>
    `;
    await runFiller();

    expect((document.getElementById('cb') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('ta') as HTMLTextAreaElement).value).toBe(
      'This is a dummy text for testing purposes.',
    );
  });

  it('selects the first radio per named group only', async () => {
    document.body.innerHTML = `
      <input id="r1" type="radio" name="color" />
      <input id="r2" type="radio" name="color" />
      <input id="r3" type="radio" name="size" />
      <input id="r4" type="radio" name="size" />
    `;
    await runFiller();

    expect((document.getElementById('r1') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('r2') as HTMLInputElement).checked).toBe(false);
    expect((document.getElementById('r3') as HTMLInputElement).checked).toBe(true);
    expect((document.getElementById('r4') as HTMLInputElement).checked).toBe(false);
  });

  it('selects index 1 of a select when available, else index 0', async () => {
    document.body.innerHTML = `
      <select id="multi">
        <option>Zero</option>
        <option>One</option>
        <option>Two</option>
      </select>
      <select id="single">
        <option>Only</option>
      </select>
    `;
    await runFiller();

    expect((document.getElementById('multi') as HTMLSelectElement).selectedIndex).toBe(1);
    expect((document.getElementById('single') as HTMLSelectElement).selectedIndex).toBe(0);
  });

  it('fills a range input with its midpoint (default 50)', async () => {
    document.body.innerHTML = `
      <input id="r" type="range" />
      <input id="rb" type="range" min="0" max="10" />
    `;
    await runFiller();

    expect((document.getElementById('r') as HTMLInputElement).value).toBe('50');
    expect((document.getElementById('rb') as HTMLInputElement).value).toBe('5');
  });

  it('skips file and hidden inputs and never submits', async () => {
    document.body.innerHTML = `
      <form id="f">
        <input id="file" type="file" />
        <input id="hidden" type="hidden" value="orig" />
        <input id="text" type="text" />
      </form>
    `;
    const form = document.getElementById('f') as HTMLFormElement;
    const submitSpy = vi.fn();
    form.addEventListener('submit', submitSpy);

    await runFiller();

    expect((document.getElementById('file') as HTMLInputElement).value).toBe('');
    expect((document.getElementById('hidden') as HTMLInputElement).value).toBe('orig');
    expect((document.getElementById('text') as HTMLInputElement).value).toBe('John Doe');
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('dispatches input and change events after filling', async () => {
    document.body.innerHTML = `<input id="t" type="text" />`;
    const el = document.getElementById('t') as HTMLInputElement;
    const inputSpy = vi.fn();
    const changeSpy = vi.fn();
    el.addEventListener('input', inputSpy);
    el.addEventListener('change', changeSpy);

    await runFiller();

    expect(inputSpy).toHaveBeenCalledTimes(1);
    expect(changeSpy).toHaveBeenCalledTimes(1);
  });
});
