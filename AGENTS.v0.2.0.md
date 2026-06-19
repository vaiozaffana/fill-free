# AGENTS.md — Auto Fill Form v0.2.0

## Context

This is a continuation of v0.1.0. The existing codebase is a browser extension (MV3) built with TypeScript + Vite + `@crxjs/vite-plugin`. v0.2.0 introduces three significant changes:

1. **File-based input mode** — user uploads a JSON, CSV, or XLSX file containing test data
2. **Smart mapping** — rule-based matching between file columns and form field attributes
3. **Playwright companion app** — a separate Node.js CLI that the extension triggers for advanced automation
4. **React popup** — replace the vanilla TS popup with React, switching bundler to webpack

Do not modify `src/content/filler.ts` from v0.1.0 unless explicitly instructed below.

---

## Architecture Overview

```
auto-fill-extension/       ← Browser Extension (MV3)
├── manifest.json
├── webpack.config.ts
├── package.json
├── tsconfig.json
├── src/
│   ├── popup/
│   │   ├── index.html
│   │   ├── index.tsx          ← React entry point
│   │   ├── App.tsx            ← Root component
│   │   ├── components/
│   │   │   ├── ModeToggle.tsx
│   │   │   ├── FileUploader.tsx
│   │   │   ├── MappingPreview.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── popup.css
│   ├── content/
│   │   └── filler.ts          ← Unchanged from v0.1.0
│   ├── background/
│   │   └── service-worker.ts  ← New: relay trigger to Playwright app
│   └── lib/
│       ├── parser.ts          ← Parse JSON / CSV / XLSX
│       ├── mapper.ts          ← Rule-based field mapping
│       └── types.ts           ← Shared TypeScript types
└── icons/
    └── icon.png

playwright-app/                ← Companion CLI (separate package)
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts               ← CLI entry point
    ├── runner.ts              ← Playwright fill logic
    └── server.ts              ← Local HTTP server (receives trigger from extension)
```

These are **two separate packages** in a monorepo. Use `npm workspaces` or keep them as independent `package.json` files in sibling directories. Do not merge them into one package.

---

## Part 1 — Extension: Bundler Migration (Vite → Webpack)

### Remove

- `vite.config.ts`
- `@crxjs/vite-plugin` from dependencies

### webpack.config.ts Specification

```ts
import path from 'path';
import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';

export default {
  mode: 'production',
  entry: {
    popup: './src/popup/index.tsx',
    'service-worker': './src/background/service-worker.ts',
    'content/filler': './src/content/filler.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/popup/index.html',
      filename: 'popup.html',
      chunks: ['popup'],
    }),
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'icons', to: 'icons' },
      ],
    }),
  ],
};
```

### package.json (extension) Specification

```json
{
  "name": "auto-fill-extension",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "dev": "webpack --watch",
    "build": "webpack"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "copy-webpack-plugin": "^12.0.0",
    "css-loader": "^7.0.0",
    "html-webpack-plugin": "^5.6.0",
    "style-loader": "^4.0.0",
    "ts-loader": "^9.5.0",
    "typescript": "^5.4.0",
    "webpack": "^5.91.0",
    "webpack-cli": "^5.1.0"
  },
  "dependencies": {
    "papaparse": "^5.4.1",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "xlsx": "^0.18.5"
  }
}
```

### tsconfig.json (extension) — updated

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "jsx": "react-jsx",
    "strict": true,
    "lib": ["ES2020", "DOM"]
  },
  "include": ["src", "webpack.config.ts"]
}
```

### manifest.json — updated

```json
{
  "manifest_version": 3,
  "name": "Auto Fill Form",
  "version": "0.2.0",
  "description": "Fills form fields with dummy data for testing.",
  "permissions": ["activeTab", "scripting"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/icon.png"
  },
  "background": {
    "service_worker": "service-worker.js"
  },
  "content_scripts": []
}
```

---

## Part 2 — Extension: React Popup

### src/popup/index.html

Minimal HTML shell. Must include a `<div id="root">` and a `<script>` tag pointing to `popup.js` (webpack output). Keep under 15 lines.

### src/popup/index.tsx

React entry point. Mount `<App />` into `#root` using `ReactDOM.createRoot`.

### src/popup/App.tsx

Root component. Manages top-level state:

```ts
type Mode = 'dummy' | 'file';

interface AppState {
  mode: Mode;
  mappedData: Record<string, string> | null; // columnName → value for current row
  status: 'idle' | 'success' | 'error';
  statusMessage: string;
}
```

Renders in order:
1. `<ModeToggle>` — switch between Dummy and File mode
2. `<FileUploader>` — visible only when `mode === 'file'`
3. `<MappingPreview>` — visible when `mappedData` is not null
4. A **"Fill Form"** button
5. `<StatusBadge>`

On "Fill Form" click:
- If `mode === 'dummy'`: inject `content/filler.js` via `chrome.scripting.executeScript` (same as v0.1.0)
- If `mode === 'file'`: send a message to `service-worker.ts` with `{ action: 'fill-playwright', data: mappedData }`

### src/popup/components/ModeToggle.tsx

Two buttons: **"Dummy"** and **"File"**. Active mode has a visually distinct style. No external UI library.

### src/popup/components/FileUploader.tsx

Renders a file `<input>` accepting `.json`, `.csv`, `.xlsx`. On file select:
1. Read file as `ArrayBuffer`
2. Pass to `parser.ts` to get `ParsedData`
3. Pass first row to `mapper.ts` along with the active tab's form fields (retrieved via `chrome.scripting.executeScript`)
4. Set `mappedData` in App state

Do not auto-submit. Only parse and preview.

### src/popup/components/MappingPreview.tsx

Receives `mappedData: Record<string, string>`. Renders a simple two-column table:

| Form Field | Value from File |
|---|---|
| `name` | `"John Doe"` |
| `email` | `"test@example.com"` |

Table must be scrollable if rows exceed 8 entries. No external table library.

### src/popup/components/StatusBadge.tsx

Renders a `<p>` with status message. Colors: success = `#2e7d32`, error = `#c62828`, idle = `#666`. No animations.

### src/popup/popup.css

- Popup width: `320px` (increased from v0.1.0 to fit mapping preview)
- Font: `system-ui`
- No external CSS framework (no Tailwind, no Bootstrap)
- Table in MappingPreview: `width: 100%`, `font-size: 12px`, `border-collapse: collapse`

---

## Part 3 — Extension: lib/types.ts

Define all shared types here. Other files import from this module.

```ts
export interface ParsedData {
  headers: string[];        // column names from file
  rows: Record<string, string>[]; // each row as { columnName: value }
}

export interface FormField {
  type: string;             // input type or 'select' or 'textarea'
  name: string;
  id: string;
  label: string;            // text content of associated <label>, or '' if none
}

export type MappedData = Record<string, string>; // fieldName → value
```

---

## Part 4 — Extension: lib/parser.ts

Exports a single function:

```ts
export async function parseFile(file: File): Promise<ParsedData>
```

Dispatch by `file.name` extension:

- `.json` — `JSON.parse(await file.text())`. Expect either an array of objects `[{...}]` or a single object `{...}`. Normalize to `ParsedData`.
- `.csv` — use `papaparse`. Call `Papa.parse(text, { header: true })`. Map result to `ParsedData`.
- `.xlsx` — use `xlsx` library. Read with `XLSX.read(buffer, { type: 'array' })`. Take the first sheet. Convert to JSON with `XLSX.utils.sheet_to_json`. Map to `ParsedData`.

Throw a typed error `UnsupportedFileError` for any other extension. Do not silently return empty data.

---

## Part 5 — Extension: lib/mapper.ts

Exports a single function:

```ts
export function mapFields(
  fields: FormField[],
  row: Record<string, string>
): MappedData
```

### Matching Rules (applied in priority order)

For each `FormField`, find the best matching key in `row` using these checks in sequence. Stop at the first match:

1. **Exact match** — `row[field.name]` exists (case-insensitive)
2. **ID match** — `row[field.id]` exists (case-insensitive)
3. **Label match** — any key in `row` equals `field.label` (case-insensitive, trimmed)
4. **Partial match** — any key in `row` is a substring of `field.name` or vice versa (case-insensitive)
5. **No match** — exclude this field from `MappedData`

Return only fields that have a match. Do not return fields with empty or null values.

---

## Part 6 — Extension: src/background/service-worker.ts

Listens for messages from the popup:

```ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'fill-playwright') {
    // POST mapped data to Playwright companion app
    fetch('http://localhost:3333/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message.data),
    })
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true; // keep channel open for async response
  }
});
```

The port `3333` is fixed for v0.2.0. Do not make it configurable.

Add `"http://localhost:3333/*"` to `host_permissions` in `manifest.json` for this fetch to work.

---

## Part 7 — Playwright Companion App

This is a **separate Node.js package** in `playwright-app/`. It is not part of the browser extension bundle.

### playwright-app/package.json

```json
{
  "name": "auto-fill-playwright",
  "version": "0.2.0",
  "private": true,
  "scripts": {
    "start": "ts-node src/index.ts",
    "build": "tsc"
  },
  "dependencies": {
    "@playwright/test": "^1.44.0",
    "express": "^4.19.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.4.0"
  }
}
```

### playwright-app/tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "moduleResolution": "node",
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

### playwright-app/src/server.ts

Express HTTP server on port `3333`. Exposes one endpoint:

```
POST /fill
Content-Type: application/json
Body: Record<string, string>   ← mapped data from extension
```

On request:
1. Parse body as `MappedData`
2. Call `runner.fill(mappedData)` from `runner.ts`
3. Respond `200 { ok: true }` on success, `500 { ok: false, error }` on failure

### playwright-app/src/runner.ts

Exports:

```ts
export async function fill(data: Record<string, string>): Promise<void>
```

Implementation:

1. Launch a **persistent browser context** using `chromium.launchPersistentContext` with the path to the user's Chrome profile. This allows Playwright to control the same browser session where the extension is running.
2. Get the current active page via `context.pages()[0]`
3. For each `[fieldName, value]` in `data`:
   - Locate the field using a prioritized selector chain:
     ```
     [name="fieldName"] → [id="fieldName"] → label with matching text → aria-label
     ```
   - Detect element type and fill accordingly:

| Element / Type | Playwright Action |
|---|---|
| `input[type=text/email/url/password/number]` | `locator.fill(value)` |
| `input[type=radio]` | `page.locator('[name="x"][value="y"]').check()` |
| `input[type=checkbox]` | `locator.check()` |
| `select` | `locator.selectOption(value)` |
| `input[type=date/time/datetime-local]` | `locator.fill(value)` |
| `input[type=color]` | `locator.fill(value)` |
| `input[type=range]` | `locator.fill(value)` |
| `input[type=file]` | `locator.setInputFiles(value)` — `value` must be an absolute file path |
| `textarea` | `locator.fill(value)` |
| Custom UI component | `locator.click()` then `locator.fill(value)` — fallback only |

4. Do not call `page.close()` or `context.close()` — leave the browser session alive after filling.

### playwright-app/src/index.ts

Entry point. Starts the Express server from `server.ts` and logs the port on startup:

```ts
import { startServer } from './server';
startServer(3333);
console.log('Playwright companion running on http://localhost:3333');
```

---

## Out of Scope for v0.2.0

Do not implement any of the following:

- Row selector UI (always use the first row from the file)
- File data persistence between sessions
- Configurable port for the companion app
- Multi-tab filling
- Firefox or Safari support
- Shadow DOM traversal
- iFrame traversal
- Retry logic in Playwright runner
- Authentication or API keys for the local server
- Unit or integration tests

---

## Completion Checklist

### Extension

- [ ] `npm run build` completes without TypeScript errors
- [ ] Webpack bundles: `popup.js`, `service-worker.js`, `content/filler.js`
- [ ] `manifest.json` includes `background.service_worker` and `host_permissions` for `localhost:3333`
- [ ] React popup renders without console errors
- [ ] Mode toggle switches between Dummy and File mode correctly
- [ ] File uploader accepts `.json`, `.csv`, `.xlsx` only
- [ ] `parser.ts` handles all three formats and throws `UnsupportedFileError` for others
- [ ] `mapper.ts` applies matching rules in correct priority order
- [ ] `MappingPreview` renders matched fields before fill
- [ ] "Fill Form" in Dummy mode injects `filler.js` (unchanged from v0.1.0 behavior)
- [ ] "Fill Form" in File mode sends message to service worker → POSTs to `localhost:3333`

### Playwright Companion App

- [ ] `npm start` starts Express server on port `3333`
- [ ] `POST /fill` receives mapped data and calls `runner.fill()`
- [ ] `runner.ts` connects to existing browser session via persistent context
- [ ] Each field type uses the correct Playwright action per the table above
- [ ] File input uses `setInputFiles` — not `.fill()`
- [ ] Browser session stays open after fill completes