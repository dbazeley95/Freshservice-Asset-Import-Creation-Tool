# Freshservice Asset Import Generator

A static, client-side web app for quickly building Freshservice asset import
CSVs. No backend, no accounts, no data upload — everything runs and stays in
your browser (rows are kept in `localStorage` so you don't lose work on
reload, but nothing ever leaves your device).

Supported templates (column headers match the Freshservice import templates
exactly):

- Monitor
- Interactive Touchscreen
- Laptop / PC
- Desktop PC
- Tablet

## Using it

1. Pick an asset type tab.
2. Optionally pick a **Company Preset** and/or **Model Preset** to pre-fill
   the fields below (Company, or Product/Warranty/Cost/Memory/Storage/etc.
   for that model). A **Location Preset** dropdown will appear too once
   `LOCATION_PRESETS` in `js/catalog.js` has entries. All of these are just
   a starting point — every pre-filled value stays editable.
3. Fill in the rest of the **Shared Defaults** (Company, Location, Product,
   Cost, Warranty, Asset State, Acquisition Date, End of Life, and any
   type-specific fields like Processor/Memory/Disk or OS/Storage). These
   values get copied onto new rows as you add them.
4. Paste one serial number per line into **Bulk Add from Serial Numbers**,
   set an **Asset Tag Prefix** (e.g. `SCL-`) and a **Name Pattern** (e.g.
   `ICTSUITE Monitor {n}` or `MAR-{n2}` for zero-padded numbers), then click
   **Add Rows from Serials**. One row is created per serial number, with the
   Asset Tag set to `prefix + serial` and the Name built from the pattern.
   Name pattern tokens: `{n}`, `{n2}`/`{n3}`/... (zero-padded), `{serial}`,
   `{company}`, `{location}`, `{product}`.
5. Every generated row is independently editable in the table — tweak any
   cell by hand, or use **Add Blank Row** for one-off manual entries.
   Required fields with no value are outlined in red.
6. Click **Download CSV** to save a file with headers matching the
   Freshservice import template for that asset type.

Your defaults, bulk-add settings, and rows are saved per asset type in your
browser's local storage automatically, so switching tabs or reloading the
page won't lose anything. Use **Clear All Rows** to start a fresh batch.

## Hosting on GitHub Pages

This is a plain static site (`index.html`, `css/`, `js/`) with no build step.

1. Merge this branch into your default branch (or push it directly there).
2. In the repository, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a branch".
4. Choose the branch (e.g. `main`) and folder `/ (root)`, then save.
5. GitHub will publish the site at
   `https://<owner>.github.io/<repo>/` within a minute or two.

## Running it locally

Because `js/app.js` is loaded as an ES module, opening `index.html` directly
via `file://` will be blocked by the browser in some cases. Serve it with any
static file server instead, for example:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Project structure

```
index.html          Page layout/containers
css/styles.css       Styling (light/dark aware)
js/templates.js       Column definitions for each asset type (edit here to
                       add a new asset type or change a template's columns)
js/catalog.js          Company Presets, Location Presets, and Model Presets
                       shown as dropdowns in the Defaults panel — edit here
                       to add/retire a company, site, or hardware model
js/csv.js              CSV escaping/formatting, filename/download helper,
                       name-pattern token substitution
js/storage.js          localStorage read/write helpers
js/app.js              UI wiring — tabs, defaults form, bulk-add, table,
                       toolbar
```

To add a new asset type, add an entry to `ASSET_TYPES` in `js/templates.js`
with its columns in the same order/wording as the Freshservice template —
the rest of the app (form rendering, bulk add, table, CSV export) picks it
up automatically.

To add a new hardware model or site, edit `js/catalog.js` — no other files
need to change. A `MODEL_PRESETS` entry only needs to set the fields that
matter for that model (e.g. Product/OS/Storage/Warranty/Cost for a tablet);
anything left out just stays blank for you to fill in on first use.
