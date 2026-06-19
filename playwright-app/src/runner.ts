import path from 'path';
import os from 'os';
import { chromium, type BrowserContext, type Locator, type Page } from '@playwright/test';

/** Mapped data from the extension: `fieldName → value`. */
type MappedData = Record<string, string>;

/**
 * Default Chrome profile directory used for the persistent context. v0.2.0
 * keeps this fixed (not configurable). Adjust per-OS default location.
 */
function defaultProfileDir(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'Google', 'Chrome');
    case 'win32':
      return path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
    default:
      return path.join(home, '.config', 'google-chrome');
  }
}

/**
 * Escape a string for use in a CSS id selector. `CSS.escape` is a browser-only
 * API and is unavailable in Node, so escape the CSS special characters here.
 */
function escapeCssId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '\\$&');
}

/**
 * Resolve a locator for `fieldName` using a prioritized selector chain:
 * [name] → [id] → label text → aria-label. Returns the first chain entry that
 * matches exactly one element, or `null` if none match.
 */
async function resolveLocator(page: Page, fieldName: string): Promise<Locator | null> {
  const candidates: Locator[] = [
    page.locator(`[name="${fieldName}"]`),
    page.locator(`#${escapeCssId(fieldName)}`),
    page.getByLabel(fieldName),
    page.locator(`[aria-label="${fieldName}"]`),
  ];

  for (const locator of candidates) {
    const count = await locator.count().catch(() => 0);
    if (count >= 1) return locator.first();
  }
  return null;
}

/** Fill a single resolved field according to its element type. */
async function fillField(page: Page, locator: Locator, value: string): Promise<void> {
  const tagName = (await locator.evaluate((el) => el.tagName.toLowerCase())) as string;

  if (tagName === 'select') {
    await locator.selectOption(value);
    return;
  }

  if (tagName === 'textarea') {
    await locator.fill(value);
    return;
  }

  // input — branch on its type attribute.
  const type = ((await locator.getAttribute('type')) ?? 'text').toLowerCase();

  switch (type) {
    case 'checkbox':
      await locator.check();
      return;
    case 'radio': {
      const name = (await locator.getAttribute('name')) ?? '';
      // Prefer the radio in this group with the matching value.
      const byValue = page.locator(`[name="${name}"][value="${value}"]`);
      if ((await byValue.count().catch(() => 0)) >= 1) {
        await byValue.first().check();
      } else {
        await locator.check();
      }
      return;
    }
    case 'file':
      // `value` must be an absolute file path.
      await locator.setInputFiles(value);
      return;
    case 'text':
    case 'email':
    case 'url':
    case 'password':
    case 'number':
    case 'date':
    case 'time':
    case 'datetime-local':
    case 'color':
    case 'range':
      await locator.fill(value);
      return;
    default:
      // Fallback for custom UI components.
      await locator.click();
      await locator.fill(value).catch(() => undefined);
  }
}

/**
 * Fill form fields on the active page of a persistent browser context.
 *
 * Launches a persistent context against the user's Chrome profile and uses the
 * first open page. The browser session is intentionally left open after
 * filling (no `context.close()` / `page.close()`).
 */
export async function fill(data: MappedData): Promise<void> {
  const context: BrowserContext = await chromium.launchPersistentContext(defaultProfileDir(), {
    headless: false,
    channel: 'chrome',
  });

  const page = context.pages()[0] ?? (await context.newPage());

  for (const [fieldName, value] of Object.entries(data)) {
    const locator = await resolveLocator(page, fieldName);
    if (locator === null) continue;
    try {
      await fillField(page, locator, value);
    } catch {
      // Skip fields that cannot be filled; continue with the rest.
    }
  }

  // Intentionally do NOT close the context/page — leave the session alive.
}
