import type { FormField } from '../lib/types';

/**
 * Function injected into the page to collect form fields. Must be fully
 * self-contained (no external references) because it is serialized and run in
 * the page context by `chrome.scripting.executeScript`.
 */
function collectFormFields(): FormField[] {
  function labelFor(el: HTMLElement): string {
    if (el.id !== '') {
      const escaped =
        typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
          ? CSS.escape(el.id)
          : el.id;
      const forLabel = document.querySelector<HTMLLabelElement>(`label[for="${escaped}"]`);
      if (forLabel?.textContent) return forLabel.textContent.trim();
    }
    const wrapping = el.closest('label');
    if (wrapping?.textContent) return wrapping.textContent.trim();
    return '';
  }

  const fields: FormField[] = [];
  const controls = document.querySelectorAll<HTMLElement>('input, select, textarea');
  for (const el of Array.from(controls)) {
    const tag = el.tagName.toLowerCase();
    const type =
      tag === 'input' ? (el as HTMLInputElement).type || 'text' : tag;
    fields.push({
      type,
      name: (el as HTMLInputElement).name ?? '',
      id: el.id ?? '',
      label: labelFor(el),
    });
  }
  return fields;
}

/** Retrieve the form fields on the active tab. Returns [] if unavailable. */
export async function getActiveTabFields(): Promise<FormField[]> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return [];

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectFormFields,
  });

  const first = results[0]?.result;
  return Array.isArray(first) ? (first as FormField[]) : [];
}
