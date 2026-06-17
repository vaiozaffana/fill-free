<div align="center">

# 🪄 Auto Fill Form

**Fill any web form with realistic, professional test data in a single click.**

A lightweight Chromium (Chrome · Edge · Brave) Manifest V3 extension for
developers and QA engineers who are tired of typing `John Doe` into the same
form for the hundredth time.

[Install & Build](#-install--build) ·
[How It Works](#-how-it-works) ·
[Supported Fields](#-supported-fields) ·
[Contributing](#-collaboration) ·
[License](#-license)

</div>

---

## 💡 Philosophy

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

## 🤔 Why Auto Fill Form?

| Pain | Without it | With Auto Fill Form |
|---|---|---|
| Filling a 20-field signup form | 2–3 minutes of typing | One click |
| Spotting formatting bugs | Easy to miss with `aaa` | Realistic names/emails/phones expose them |
| Testing duplicate handling | Manually vary each field | Distinct value per field automatically |
| Accidentally clobbering tokens | Manual care required | CSRF / captcha / generated IDs auto-skipped |
| Privacy of test runs | Many tools call external APIs | 100% local, zero network access |

If you build, test, or demo web forms, this removes the most tedious part of
the loop.

## 🚀 Install & Build

> **Prerequisites:** Node.js ≥ 18 (or [Bun](https://bun.sh)).

```bash
npm install
npm run build        # outputs the unpacked extension to dist/
```

> The repo includes a `bun.lock`; `bun install && bun run build` works too.

### Load in your browser

1. Open `chrome://extensions` (or `edge://extensions`, `brave://extensions`).
2. Enable **Developer Mode**.
3. Click **Load unpacked** and select the generated **`dist/`** folder.
4. Pin the extension, open any page with a form, and click **Fill Form**.

## 🛠 Development

```bash
npm run dev          # vite build --watch (rebuilds dist/ on save)
npm run test         # run unit + jsdom tests once
npm run test:watch   # tests in watch mode
```

After `npm run dev`, use the **Reload** button on the extension card in
`chrome://extensions` to pick up changes.

## ⚙️ How It Works

```
src/
├── popup/
│   ├── popup.html      # the toolbar popup (one button + a status line)
│   ├── popup.ts        # queries the active tab and injects the filler
│   └── popup.css        # minimal popup styling
└── content/
    ├── filler.ts       # injected IIFE: walks the DOM and fills writable fields
    └── fillLogic.ts    # pure, unit-tested detection + data + skip rules
```

1. Clicking **Fill Form** runs `chrome.scripting.executeScript`, injecting the
   bundled `filler.js` into the active tab.
2. `filler.ts` collects every `input`, `textarea`, and `select`.
3. For each control it builds metadata and calls `detectFieldCategory()` to
   classify it (name, email, phone, company, address, …).
4. A rotating generator hands out the next *distinct* professional value for
   that category, so repeated fields differ.
5. `shouldSkipField()` filters out anything that must not be touched (see
   below), and `input` + `change` events are dispatched so frameworks like
   React and Vue register the change.

### Fields that are never filled

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

## 📋 Supported Fields

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
