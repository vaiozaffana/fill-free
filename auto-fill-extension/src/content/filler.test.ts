import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DATA_POOLS } from './fillLogic';

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

function val(id: string): string {
  return (document.getElementById(id) as HTMLInputElement).value;
}

describe('filler.ts DOM filling', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('fills fields with contextually-detected professional data', async () => {
    document.body.innerHTML = `
      <input id="name" name="full_name" type="text" />
      <input id="email" type="email" />
      <input id="phone" type="tel" />
      <input id="company" name="company" type="text" />
      <input id="city" name="city" type="text" />
    `;
    await runFiller();

    expect(DATA_POOLS.fullName).toContain(val('name'));
    expect(DATA_POOLS.email).toContain(val('email'));
    expect(DATA_POOLS.phone).toContain(val('phone'));
    expect(DATA_POOLS.company).toContain(val('company'));
    expect(DATA_POOLS.city).toContain(val('city'));
  });

  it('gives different values to multiple fields of the same kind', async () => {
    document.body.innerHTML = `
      <input id="fn1" autocomplete="given-name" type="text" />
      <input id="fn2" autocomplete="given-name" type="text" />
      <input id="fn3" autocomplete="given-name" type="text" />
    `;
    await runFiller();

    const values = [val('fn1'), val('fn2'), val('fn3')];
    expect(new Set(values).size).toBe(3); // all distinct
    expect(values.every((v) => DATA_POOLS.firstName.includes(v))).toBe(true);
  });

  it('checks checkboxes and fills textareas with paragraph text', async () => {
    document.body.innerHTML = `
      <input id="cb" type="checkbox" />
      <textarea id="ta"></textarea>
    `;
    await runFiller();

    expect((document.getElementById('cb') as HTMLInputElement).checked).toBe(true);
    expect(DATA_POOLS.paragraph).toContain(
      (document.getElementById('ta') as HTMLTextAreaElement).value,
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
      <select id="multi"><option>Zero</option><option>One</option><option>Two</option></select>
      <select id="single"><option>Only</option></select>
    `;
    await runFiller();

    expect((document.getElementById('multi') as HTMLSelectElement).selectedIndex).toBe(1);
    expect((document.getElementById('single') as HTMLSelectElement).selectedIndex).toBe(0);
  });

  it('fills a range input with its midpoint', async () => {
    document.body.innerHTML = `
      <input id="r" type="range" />
      <input id="rb" type="range" min="0" max="10" />
    `;
    await runFiller();

    expect(val('r')).toBe('50');
    expect(val('rb')).toBe('5');
  });

  it('skips file and hidden inputs and never submits', async () => {
    document.body.innerHTML = `
      <form id="f">
        <input id="file" type="file" />
        <input id="hidden" type="hidden" value="orig" />
        <input id="text" name="first_name" type="text" />
      </form>
    `;
    const form = document.getElementById('f') as HTMLFormElement;
    const submitSpy = vi.fn();
    form.addEventListener('submit', submitSpy);

    await runFiller();

    expect(val('file')).toBe('');
    expect(val('hidden')).toBe('orig');
    expect(val('text')).not.toBe('');
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('does not fill readonly, disabled, ARIA, or opt-out fields', async () => {
    document.body.innerHTML = `
      <input id="ro" type="text" name="first_name" readonly />
      <input id="dis" type="text" name="last_name" disabled />
      <input id="ariaro" type="text" name="email" aria-readonly="true" />
      <input id="optout" type="text" name="company" data-autofill="off" />
      <input id="ok" type="text" name="city" />
    `;
    await runFiller();

    expect(val('ro')).toBe('');
    expect(val('dis')).toBe('');
    expect(val('ariaro')).toBe('');
    expect(val('optout')).toBe('');
    expect(val('ok')).not.toBe(''); // control still fills
  });

  it('does not overwrite auto-generated/system fields', async () => {
    document.body.innerHTML = `
      <input id="csrf" type="text" name="csrf_token" value="abc123" />
      <input id="captcha" type="text" id-attr="x" name="g-recaptcha-response" value="tok" />
      <input id="normal" type="text" name="username" />
    `;
    await runFiller();

    expect(val('csrf')).toBe('abc123');
    expect(val('captcha')).toBe('tok');
    expect(val('normal')).not.toBe('');
  });

  it('dispatches input and change events after filling', async () => {
    document.body.innerHTML = `<input id="t" type="text" name="first_name" />`;
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
