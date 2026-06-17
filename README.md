# Auto Fill Form

A Chromium (Chrome / Edge / Brave) Manifest V3 browser extension that fills
HTML form fields with dummy data for web testing. Click the toolbar icon, then
**Fill Form**, and every supported field on the active page is populated.

## Tech Stack

- Manifest V3
- TypeScript (strict)
- Vite + [`@crxjs/vite-plugin`](https://crxjs.dev/)
- Vitest (lightweight unit + jsdom tests)

## Install & Build

```
npm install
npm run build        # outputs to dist/
```

> The repo includes a `bun.lock`; `bun install` works as well.

## Load in Chrome

1. Go to `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked** → select the `dist/` folder

## Development

```
npm run dev          # vite build --watch
npm run test         # run unit + DOM tests once
npm run test:watch   # watch mode
```

## How It Works

- `src/popup/popup.ts` — popup UI logic. On click it queries the active tab and
  injects the filler via `chrome.scripting.executeScript`.
- `src/content/filler.ts` — the injected IIFE that walks the page's inputs,
  selects, and textareas and fills them. Bundled to `dist/src/content/filler.js`.
- `src/content/fillLogic.ts` — pure, unit-tested value/mapping logic shared by
  the filler.

## Supported Fields

| Type | Value |
|---|---|
| `text` | `John Doe` |
| `password` | `P@ssw0rd123` |
| `number` | `42` |
| `email` | `test@example.com` |
| `url` | `https://example.com` |
| `radio` | first option in each named group |
| `checkbox` | checked |
| `select` | index 1 if present, else 0 |
| `date` | `2000-01-01` |
| `time` | `09:00` |
| `datetime-local` | `2000-01-01T09:00` |
| `color` | `#ff0000` |
| `range` | midpoint of `(min + max) / 2` (defaults 0–100) |
| `textarea` | `This is a dummy text for testing purposes.` |
| `file` | skipped (cannot be set programmatically) |

Inputs of type `hidden`, `submit`, `button`, `reset`, `image`, and `file` are
skipped. The extension never submits the form.
