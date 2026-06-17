# AGENTS.md — Auto Fill Form Extension v1.0.0

## Project Overview

Build a browser extension that automatically fills HTML form fields with dummy data. Target use case: web testing.

---

## Tech Stack

- **Manifest Version:** 3 (MV3)
- **Language:** TypeScript (strict mode)
- **Style:** Tailwind CSS (opsional, if you need)
- **Build Tool:** Vite + `@crxjs/vite-plugin`
- **Browser Target:** Chromium-based (Chrome, Edge, Brave)
- **Node.js:** >= 18

---

## Project Structure

```
auto-fill-extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── vite.config.ts
├── src/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.ts
│   │   └── popup.css
│   └── content/
│       └── filler.ts
└── icons/
    └── icon.png         # single 128x128 icon, placeholder is fine
```

Build output goes to `dist/`. Do not commit `dist/`.

---

## package.json Specification

```json
{
  "name": "auto-fill-extension",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "vite build --watch",
    "build": "vite build"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta",
    "@types/chrome": "^0.0.268",
    "typescript": "^5.4.0",
    "vite": "^5.0.0"
  }
}
```

Do not add runtime dependencies. All code must be self-contained.

---

## vite.config.ts Specification

```ts
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
});
```

No additional plugins. Do not configure `rollupOptions` manually unless `@crxjs/vite-plugin` requires it for content scripts.

---

## tsconfig.json Specification

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "vite.config.ts"]
}
```

---

## manifest.json Specification

```json
{
  "manifest_version": 3,
  "name": "Auto Fill Form",
  "version": "1.0.0",
  "description": "Fills form fields with dummy data for testing.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": "icons/icon.png"
  },
  "content_scripts": []
}
```

Do not add permissions beyond `activeTab` and `scripting`.
Leave `content_scripts` as an empty array — `filler.ts` is injected programmatically via `chrome.scripting.executeScript`, not declared here.

---

## src/popup/popup.html Specification

A minimal HTML entry point for Vite. Must include:
- A single button with `id="fill-btn"` labeled **"Fill Form"**
- A `<p id="status">` element for feedback
- A `<script>` tag pointing to `./popup.ts` with `type="module"`

Keep the HTML under 20 lines.

---

## src/popup/popup.ts Specification

Typed, no `any`. On button click:
1. Query the active tab
2. Inject `src/content/filler.ts` via `chrome.scripting.executeScript` using `files` (the compiled output path as handled by `@crxjs/vite-plugin`)
3. Show success or error message in `#status`

```ts
// pseudocode only — agent implements this
const btn = document.getElementById('fill-btn') as HTMLButtonElement;
const status = document.getElementById('status') as HTMLParagraphElement;

btn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/filler.js'], // crxjs resolves this from manifest context
    });
    status.textContent = 'Form filled!';
  } catch (e) {
    status.textContent = 'Error: could not fill form.';
  }
});
```

---

## src/content/filler.ts Specification

This is the core file. It must:

1. Query **all form fields** on the active page
2. Detect each field's type
3. Fill it with appropriate dummy data

### Supported Input Types & Dummy Data Rules

| Type | Strategy |
|---|---|
| `text` | `"John Doe"` |
| `password` | `"P@ssw0rd123"` |
| `number` | `42` |
| `email` | `"test@example.com"` |
| `url` | `"https://example.com"` |
| `radio` | Select the **first** option in each named group |
| `checkbox` | Set `checked = true` |
| `select` | Select index `1` if it exists, otherwise index `0` |
| `date` | `"2000-01-01"` |
| `time` | `"09:00"` |
| `datetime-local` | `"2000-01-01T09:00"` |
| `file` | **Skip** — cannot be filled programmatically for security reasons |
| `color` | `"#ff0000"` |
| `range` | Midpoint: `(min + max) / 2` — default `min=0`, `max=100` |
| `textarea` | `"This is a dummy text for testing purposes."` |

### Implementation Rules

- Use `document.querySelectorAll<HTMLInputElement>('input')` and typed equivalents for `select` and `textarea`
- Skip inputs where `type` is one of: `hidden`, `submit`, `button`, `reset`, `image`, `file`
- For `radio`: group by `name` attribute using a `Set<string>` to track already-filled groups. Only fill the first radio per group.
- For `range`: read `el.min` and `el.max`. Parse as numbers. If `NaN`, default to `0` and `100`.
- After setting a value, dispatch both events on the element so JS frameworks detect the change:
  ```ts
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  ```
- Do **not** use `eval`, `fetch`, or any external library.
- Do **not** submit the form.
- TypeScript `strict` must pass — no `any`, no `@ts-ignore`.

### filler.ts Structure

```ts
(() => {
  // 1. Type definitions (if needed — keep minimal)
  // 2. DUMMY_DATA: Record<string, string | number>
  // 3. Helper: dispatchEvents(el: Element): void
  // 4. Helper: fillSelect(el: HTMLSelectElement): void
  // 5. Helper: fillRadioGroups(inputs: NodeListOf<HTMLInputElement>): void
  // 6. Main: query all inputs, select, textarea → detect type → fill
})();
```

Wrap everything in an IIFE. TypeScript will compile this to an isolated IIFE in the bundle.

---

## src/popup/popup.css Specification

- Width: `220px`
- Font: `system-ui`
- Button: full width, solid background, clear hover state
- Status text: small, muted color (`#666`)
- No animations or complex styles

---

## Build & Load Instructions

Agent must include these instructions in a `README.md`:

```
npm install
npm run build        # outputs to dist/
```

Load in Chrome:
1. Go to `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select the `dist/` folder

For active development: `npm run dev` (watch mode via Vite).

---

## Out of Scope for v1.0.0

Do not implement any of the following:

- Custom dummy data configuration
- Per-field override settings
- Storage / options page
- Multi-browser support (Firefox, Safari)
- Shadow DOM traversal
- iFrame traversal
- Form detection heuristics
- Localization
- Unit tests

---

## Completion Checklist

Agent must verify the following before finishing:

- [ ] `npm run build` completes without errors or TypeScript warnings
- [ ] `manifest.json` uses MV3 and only required permissions
- [ ] Popup has exactly one button (`#fill-btn`) and one status element (`#status`)
- [ ] `filler.ts` handles all 15 input types listed above
- [ ] `file` input is explicitly skipped
- [ ] Radio inputs are grouped by `name` using a `Set`
- [ ] `input` and `change` events are dispatched after each fill
- [ ] No `any` types and no `@ts-ignore` in TypeScript source
- [ ] Extension loads without errors from the `dist/` folder on `chrome://extensions`