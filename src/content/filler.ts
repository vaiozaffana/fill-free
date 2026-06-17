import {
  getDummyValueForType,
  isSkippedInputType,
  resolveRangeMidpoint,
  resolveSelectIndex,
  DUMMY_DATA,
} from './fillLogic';

/**
 * Auto Fill Form — injected content script.
 *
 * Runs in the page (via chrome.scripting.executeScript) and fills every
 * supported form field with dummy data. Never submits the form.
 */
(() => {
  /** Dispatch input + change so frameworks (React/Vue/etc.) detect the change. */
  function dispatchEvents(el: Element): void {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Select index 1 if present, otherwise index 0. */
  function fillSelect(el: HTMLSelectElement): void {
    const index = resolveSelectIndex(el.options.length);
    if (index < 0) return;
    el.selectedIndex = index;
    dispatchEvents(el);
  }

  /** Fill the first radio of each named group; check it. */
  function fillRadioGroups(radios: readonly HTMLInputElement[]): void {
    const filledGroups = new Set<string>();
    for (const radio of radios) {
      if (radio.name !== '' && filledGroups.has(radio.name)) continue;
      if (radio.name !== '') filledGroups.add(radio.name);
      radio.checked = true;
      dispatchEvents(radio);
    }
  }

  /** Fill a single non-radio, non-skipped input by its type. */
  function fillInput(el: HTMLInputElement): void {
    const type = el.type;

    if (type === 'checkbox') {
      el.checked = true;
      dispatchEvents(el);
      return;
    }

    if (type === 'range') {
      el.value = String(resolveRangeMidpoint(el.min, el.max));
      dispatchEvents(el);
      return;
    }

    const value = getDummyValueForType(type);
    if (value === undefined) return; // unknown/unsupported type — leave untouched
    el.value = value;
    dispatchEvents(el);
  }

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

  // Radios are grouped; handle them separately from value inputs.
  const radios = inputs.filter((el) => el.type === 'radio');
  fillRadioGroups(radios);

  for (const el of inputs) {
    if (el.type === 'radio') continue;
    if (isSkippedInputType(el.type)) continue;
    fillInput(el);
  }

  for (const el of document.querySelectorAll<HTMLTextAreaElement>('textarea')) {
    el.value = DUMMY_DATA.textarea;
    dispatchEvents(el);
  }

  for (const el of document.querySelectorAll<HTMLSelectElement>('select')) {
    fillSelect(el);
  }
})();
