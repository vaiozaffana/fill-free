import {
  createValueGenerator,
  detectFieldCategory,
  resolveRangeMidpoint,
  resolveSelectIndex,
  shouldSkipField,
  type FieldMeta,
  type FieldSkipState,
  type ValueGenerator,
} from './fillLogic';

/**
 * Auto Fill Form — injected content script.
 *
 * Runs in the page (via chrome.scripting.executeScript) and fills every
 * supported, writable form field with realistic, varied professional data.
 * Read-only, disabled, auto-generated, and opt-out fields are left untouched.
 * Never submits the form.
 */
(() => {
  const generator: ValueGenerator = createValueGenerator();

  /** Dispatch input + change so frameworks (React/Vue/etc.) detect the change. */
  function dispatchEvents(el: Element): void {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Resolve the visible label text associated with a control, if any. */
  function findLabelText(el: HTMLElement): string {
    // 1. <label for="id">
    if (el.id !== '') {
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(el.id)
          : el.id.replace(/["\\]/g, '\\$&');
      const forLabel = document.querySelector<HTMLLabelElement>(`label[for="${escaped}"]`);
      if (forLabel?.textContent) return forLabel.textContent;
    }
    // 2. Wrapping <label>
    const closest = el.closest('label');
    if (closest?.textContent) return closest.textContent;
    return '';
  }

  /** Build detection metadata from a form control. */
  function readMeta(el: HTMLInputElement | HTMLTextAreaElement, type: string): FieldMeta {
    return {
      type,
      name: el.name,
      id: el.id,
      placeholder: 'placeholder' in el ? el.placeholder : '',
      autocomplete: el.getAttribute('autocomplete') ?? '',
      ariaLabel: el.getAttribute('aria-label') ?? '',
      labelText: findLabelText(el),
    };
  }

  /** Build skip-rule state from a form control. */
  function readSkipState(
    el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    type: string,
  ): FieldSkipState {
    const readOnly = 'readOnly' in el ? (el as HTMLInputElement).readOnly : false;
    return {
      type,
      readOnly,
      disabled: el.disabled,
      ariaReadonly: el.getAttribute('aria-readonly'),
      ariaDisabled: el.getAttribute('aria-disabled'),
      dataAutofill: el.getAttribute('data-autofill') ?? el.getAttribute('data-no-autofill'),
      name: el.name,
      id: el.id,
    };
  }

  /** Select index 1 if present, otherwise index 0. */
  function fillSelect(el: HTMLSelectElement): void {
    const index = resolveSelectIndex(el.options.length);
    if (index < 0) return;
    el.selectedIndex = index;
    dispatchEvents(el);
  }

  /** Fill the first writable radio of each named group; check it. */
  function fillRadioGroups(radios: readonly HTMLInputElement[]): void {
    const filledGroups = new Set<string>();
    for (const radio of radios) {
      if (shouldSkipField(readSkipState(radio, 'radio'))) continue;
      if (radio.name !== '' && filledGroups.has(radio.name)) continue;
      if (radio.name !== '') filledGroups.add(radio.name);
      radio.checked = true;
      dispatchEvents(radio);
    }
  }

  /** Fill a single non-radio input with varied, contextual professional data. */
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

    const category = detectFieldCategory(readMeta(el, type));
    el.value = generator.next(category);
    dispatchEvents(el);
  }

  const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

  // Radios are grouped; handle them separately from value inputs.
  const radios = inputs.filter((el) => el.type === 'radio');
  fillRadioGroups(radios);

  for (const el of inputs) {
    if (el.type === 'radio') continue;
    if (shouldSkipField(readSkipState(el, el.type))) continue;
    fillInput(el);
  }

  for (const el of document.querySelectorAll<HTMLTextAreaElement>('textarea')) {
    if (shouldSkipField(readSkipState(el, 'textarea'))) continue;
    const category = detectFieldCategory(readMeta(el, 'textarea'));
    el.value = generator.next(category);
    dispatchEvents(el);
  }

  for (const el of document.querySelectorAll<HTMLSelectElement>('select')) {
    if (shouldSkipField(readSkipState(el, 'select'))) continue;
    fillSelect(el);
  }
})();
