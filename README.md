<div align="center">

# 🪄 Auto Fill Form

**Fill any web form with realistic test data — or your own file — in a single click.**

A Chromium (Chrome · Edge · Brave) Manifest V3 extension for developers and QA
engineers, now with **file-driven input** (JSON/CSV/XLSX), **smart column→field
mapping**, and an optional **Playwright companion** for advanced automation.

[Install & Build](#-install--build) ·
[Modes](#-modes) ·
[How It Works](#-how-it-works) ·
[Playwright Companion](#-playwright-companion) ·
[Supported Fields](#-supported-fields) ·
[Contributing](#-collaboration) ·
[License](#-license)

</div>

---

## 📦 What's new in v0.2.0

- **Two fill modes.** *Dummy* generates realistic data (v0.1.0 behavior);
  *File* maps values from an uploaded `.json` / `.csv` / `.xlsx` onto the form.
- **Smart mapping.** File columns are matched to form fields by name → id →
  label → partial match, with a live preview before you fill.
- **React popup.** The UI is now a React app bundled with webpack.
- **Playwright companion.** File-mode fills are relayed to a local Node.js
  service that drives the page with Playwright for richer automation.
- **Monorepo.** Two npm workspaces: `auto-fill-extension/` and `playwright-app/`.

---

## Philosophy

Testing forms by hand is slow, repetitive, and error-prone. Auto Fill Form is
built on a few simple beliefs:

- **Realistic beats random.** Test data should look like something a real
  person would enter — `Olivia Bennett`, `olivia.bennett@example.com`,
  `+1 (555) 012-3456` — not `asdf` or `xxxxx`. Realistic data surfaces layout,
  validation, and formatting bugs that gibberish hides.
- **Context matters.** A field named `email` should get an email; a field
  labelled *Company* should get a company name. The extension reads each
  field's `type`, `autocomplete`, `name`, `id`, `placeholder`, ARIA label, and
  associated `<label>` to choose the right kind of value.
- **Variety reveals bugs.** Every field of the same kind receives a *different*
  value, so duplicate-detection, list rendering, and uniqueness constraints get
  exercised on the first try.
- **Do no harm.** The extension never submits your form, never touches
  read-only, disabled, or auto-generated fields, and never phones home. It runs
  only on the active tab, only when you click the button.
- **Stay small and auditable.** No runtime dependencies, no telemetry, no
  network calls. The entire fill engine is a few hundred lines of typed,
  unit-tested code you can read in one sitting.

## Why?

| Pain | Without it | With Auto Fill Form |
|---|---|---|
| Filling a 20-field signup form | 2–3 minutes of typing | One click |
| Spotting formatting bugs | Easy to miss with `aaa` | Realistic names/emails/phones expose them |
| Testing duplicate handling | Manually vary each field | Distinct value per field automatically |
| Accidentally clobbering tokens | Manual care required | CSRF / captcha / generated IDs auto-skipped |
| Privacy of test runs | Many tools call external APIs | 100% local, zero network access |

If you build, test, or demo web forms, this removes the most tedious part of
the loop.

## Install & Build

> **Prerequisites:** Node.js ≥ 18.

This is an npm-workspaces monorepo:

```
.
├── auto-fill-extension/   # the browser extension (MV3, React, webpack)
└── playwright-app/        # the optional Playwright companion (Node.js + Express)
```

```bash
npm install                              # installs both workspaces
npm run build                            # builds the extension → auto-fill-extension/dist/
npm run build:all                        # builds the extension AND the companion
```

### Load in your browser

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select **`auto-fill-extension/dist/`**.
4. Pin the extension, open any page with a form, and click **Fill Form**.

## 🎚 Modes

The popup has two modes, switched with the toggle at the top:

- **Dummy** — generates realistic, varied professional data and fills the form
  directly (the v0.1.0 behavior). No companion or file needed.
- **File** — upload a `.json`, `.csv`, or `.xlsx` file. The first row is mapped
  onto the page's form fields and shown in a preview table. Clicking **Fill
  Form** relays the mapped data to the Playwright companion (see below).

## Development

```bash
# Extension (run from repo root)
npm run dev   --workspace auto-fill-extension   # webpack --watch
npm run test  --workspace auto-fill-extension   # unit + jsdom tests (Vitest)

# Playwright companion
npm start     --workspace auto-fill-playwright  # ts-node server on :3333
```

After `npm run dev`, use the **Reload** button on the extension card in
`chrome://extensions` to pick up changes.

## How It Works

```
auto-fill-extension/src/
├── popup/                 # React popup
│   ├── index.tsx          # createRoot entry
│   ├── App.tsx            # mode + mapping + status state
│   └── components/        # ModeToggle · FileUploader · MappingPreview · StatusBadge
├── background/
│   └── service-worker.ts  # relays file-mode fills to the companion
├── content/
│   ├── filler.ts          # injected IIFE: fills writable fields (unchanged from v0.1.0)
│   └── fillLogic.ts       # pure, unit-tested detection + data + skip rules
└── lib/
    ├── parser.ts          # JSON / CSV / XLSX → ParsedData
    ├── mapper.ts          # rule-based column → field mapping
    └── types.ts           # shared types
```

**Dummy mode** runs `chrome.scripting.executeScript`, injecting the bundled
`content/filler.js` into the active tab. `filler.ts` collects every `input`,
`textarea`, and `select`, classifies each via `detectFieldCategory()`, and a
rotating generator hands out distinct professional values; `shouldSkipField()`
protects read-only, disabled, and auto-generated fields. `input` + `change`
events are dispatched so React/Vue register the change.

**File mode** parses the uploaded file (`lib/parser.ts`), scrapes the active
tab's form fields, maps columns to fields (`lib/mapper.ts`), previews the
result, then sends it to `service-worker.ts`, which `POST`s the mapped data to
`http://localhost:3333/fill`.

### Smart mapping rules

For each form field, the first matching rule wins:

1. Exact match on the field's `name` (case-insensitive)
2. Match on the field's `id`
3. Match on the field's `<label>` text
4. Partial (substring) match against the field's `name`
5. No match → the field is excluded

## Playwright Companion

The companion (`playwright-app/`) is a small Express service that drives a
Playwright-controlled Chrome for advanced automation (e.g. `file` inputs via
`setInputFiles`, custom components).

```bash
npm start --workspace auto-fill-playwright
# → Playwright companion running on http://localhost:3333
```

It exposes a single endpoint, `POST /fill`, which accepts the mapped data and
fills the page using a prioritized selector chain (`[name]` → `[id]` → label →
`[aria-label]`). It launches a **persistent context** and leaves the browser
session open after filling.

> First run requires a Chrome build for Playwright: `npx playwright install chrome`.
>
> **Security note:** the companion listens on `localhost:3333` with no
> authentication (by design for v0.2.0). It is intended for local development
> only — do not expose the port to other machines.

### Fields that are never filled (Dummy mode)

The extension deliberately leaves these alone:

- **Skipped input types:** `hidden`, `submit`, `button`, `reset`, `image`,
  `file`.
- **Read-only / disabled:** native `readonly`/`disabled`, plus
  `aria-readonly="true"` / `aria-disabled="true"`.
- **Auto-generated / system fields:** anything whose `name`/`id` looks like a
  CSRF/XSRF token, captcha/reCAPTCHA, nonce, UUID/GUID, session/request id, or
  timestamp.
- **Explicit opt-out:** add `data-autofill="off"` (or `data-no-autofill`) to any
  field you want skipped.

## Supported Fields

| Type / context | Example value |
|---|---|
| Full name | `Olivia Bennett` |
| First / last name | `Olivia` / `Bennett` |
| Email | `olivia.bennett@example.com` |
| Phone (`tel`) | `+1 (555) 012-3456` |
| Username | `obennett` |
| Password | `Str0ng&Pass!9` |
| Company / job title | `Northwind Analytics` / `Senior Software Engineer` |
| Address / city / state / zip / country | `742 Evergreen Terrace` / `San Francisco` / `California` / `94105` / `United States` |
| URL | `https://example.com` |
| Number / age | `42` / `28` |
| `date` / `time` / `datetime-local` / `month` / `week` | `1990-05-14` / `09:00` / `2000-01-01T09:00` / `2000-01` / `2000-W01` |
| `color` | `#4f6ef6` |
| `checkbox` | checked |
| `radio` | first option in each named group |
| `select` | option index 1 if present, else 0 |
| `range` | midpoint of `(min + max) / 2` (defaults 0–100) |
| `textarea` | a professional placeholder paragraph |

Every category has a pool of several values; successive fields of the same kind
receive different entries.

## 🤝 Collaboration

Contributions are welcome — whether it's a bug report, a new field heuristic, or
a better data pool.

1. **Fork** the repository and create a feature branch:
   `git checkout -b feat/short-description`.
2. **Develop** with `npm run dev` and keep the suite green with `npm run test`.
3. **Add tests** for any new detection rule, skip rule, or data category. The
   logic in `src/content/fillLogic.ts` is pure and easy to unit-test.
4. **Follow the conventions:** TypeScript strict mode, no `any`, no `@ts-ignore`,
   no runtime dependencies, and no network calls.
5. **Open a pull request** with a clear summary of what changed and why, plus
   the output of `npm run build` and `npm run test`.

Good first contributions:

- Add `name`/`autocomplete` heuristics for fields we don't yet recognise.
- Expand a data pool with more realistic, locale-appropriate sample values.
- Improve label detection for component libraries with unusual markup.

Please keep changes small, focused, and covered by tests.

## 📄 License

Released under the [MIT License](./LICENSE) — free to use, modify, and
distribute. See the `LICENSE` file for the full text.
