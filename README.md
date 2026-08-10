# Freshservice Asset Import Leverage System

A static, client-side web app for quickly building Freshservice asset import
CSVs. No backend, no accounts, no data upload — everything runs and stays in
your browser (rows are kept in `localStorage` so you don't lose work on
reload, but nothing ever leaves your device).

Supported templates (column headers match the Freshservice import templates
exactly):

- Monitor
- Interactive Touchscreen
- Laptop
- Desktop PC
- iPads / Tablets

There are also tabs for **Printers & Copiers**, **Phones & Telephony**,
**Wi-Fi Access Points**, **Network Switches**, **Servers**, **Docking
Stations**, **Computer (Unspecified)**, and **Hardware (Uncategorised)** —
these are marked "(Coming soon)" because there's no
Freshservice import template for them yet, so the tab just shows a message.
They mirror the exact Asset Type values from a Freshservice product export
(not a guessed grouping), and their product catalogs already exist in
`js/catalog.js` (`MODEL_PRESETS`), so nothing is lost — add columns for one
of them in `js/templates.js` whenever a real template is available and it
becomes a fully working tab like the other five.

## Using it

1. Pick an asset type from the side menu — a sliding drawer opened via the
   "Asset Type" button on narrow screens (closes again once you pick one),
   an always-visible sidebar on wider ones (≥900px), defaulting to Desktop
   PC on first visit.
2. Fill in **General** — which site this batch belongs to. Type the
   **Company**; for a known site, **Location** fills in automatically
   (since every site in this org is its own Company *and* Location), unless
   you've already typed one yourself.
3. Fill in **Hardware Specific** — what the hardware itself is (Product,
   Cost, Warranty, Asset State, Acquisition Date, End of Life, and any
   type-specific fields like Processor/Memory/Disk or OS/Storage). Start
   typing in **Product**, or pick from its suggestions — there's no
   separate "Model Preset" control, Product itself is the catalog. Picking
   (or typing an exact match for) a known model auto-fills Warranty, Cost,
   and any type-specific specs for it. When a type has models from more
   than one manufacturer, a **Manufacturer** dropdown appears above Product
   to narrow a long list down (e.g. Laptop has 100+ models across
   Dell/HP/Lenovo/Acer/ASUS/Apple/etc.). Every field in both panels is
   required (red `*`) — all of it is just a starting point though, every
   pre-filled value stays editable, and both panels' values get copied onto
   new rows as you add them below.
4. Paste into **Bulk Add from Serial Numbers**, one asset per line. Each
   line can be either:
   - a bare serial number, in which case Name defaults to the same value
     as Asset Tag (`<Short Code>-<serial>`); or
   - a `Name, Serial` pair (or paste two columns straight from a
     spreadsheet — tab-separated works too), for when names were assigned
     before serials were recorded and don't match up device-for-device.

   **Import CSV** (button above the textarea) loads a `.csv` file the same
   way — a Name column and a Serial column (a header row like "Name,
   Serial" is detected and skipped automatically; a Serial-only file works
   too, same bare-serial default as above). It fills the textarea rather
   than adding rows immediately. **Download Template CSV** next to it gives
   a starter `.csv` (header row plus one example) in that exact format,
   ready to fill in and re-upload.

   Asset Tag is never typed by hand either way — it's generated
   automatically as `<Short Code>-<serial>` from the current Company's
   Short Code (see `SITE_PRESETS` in `js/catalog.js`); if that Company has
   no Short Code set yet, Asset Tag is left blank for you to fill in per
   row.
5. In **Add Assets of Another Product**, a **live preview** shows exactly
   what clicking the button below it would produce — every column, in
   export order — so a wrong Company, a missing Short Code, or a typo'd
   Product is visible (rows missing a required field are marked in red)
   before anything is committed.
6. Click **Add Assets of Another Product**. Rows accumulate in the **Rows**
   table below rather than replacing what's there — to mix another product
   into the same export, change Product/Hardware Specific above and click
   it again before downloading (up to 10 different products per export).
   Every row is still individually editable in the table by hand
   afterwards.
7. Click **Download CSV** to save a file with headers matching the
   Freshservice import template for that asset type.

Your defaults, bulk-add settings, and rows are saved per asset type in your
browser's local storage automatically, so switching tabs or reloading the
page won't lose anything. Use **Clear All Rows** to start a fresh batch.

### Editing an existing export

**Import Populated CSV for Editing**, above the Rows table, loads a full `.csv` file —
every column, not just Name/Serial — straight into the table so you can
tweak an export you already made (or a matching Freshservice export) and
re-download it. It matches columns by header text against the current asset
type's template, so the file needs a header row with names like `Name`,
`Serial Number`, `Asset Tag`, `Product`, etc.; any column it doesn't
recognise is ignored, and any template column missing from the file is left
blank. Imported rows are added alongside whatever's already in the table,
the same way Add Rows from Serials works.

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
css/styles.css       Styling (light/dark aware, side nav/drawer). Colors
                       are CSS custom properties at the top of the file,
                       set to the Xavier CET brand palette (navy/red/
                       yellow/beige/purple) — change the values there to
                       retheme the whole app.
js/templates.js       Column definitions for each asset type (edit here to
                       add a new asset type or change a template's columns).
                       Every column is required by default; a 'default'
                       column's `group` ('general' or 'hardware') decides
                       which panel it renders in.
js/catalog.js          Site Presets (Company + Location together) and
                       Model Presets shown in the General/Hardware Specific
                       panels — edit here to add/retire a site or hardware
                       model
js/icons.js             2D line-icon SVGs for the side nav, keyed by asset
                       type id
js/csv.js              CSV escaping/formatting and filename/download helper
js/storage.js          localStorage read/write helpers
js/app.js              UI wiring — side nav, General/Hardware Specific
                       forms, bulk-add + live preview, table, toolbar
```

To add a new asset type, add an entry to `ASSET_TYPES` in `js/templates.js`
with its columns in the same order/wording as the Freshservice template —
the rest of the app (form rendering, bulk add, preview, table, CSV export)
picks it up automatically. Give each 'default' column a `group` of
`'general'` or `'hardware'` to place it in the right panel. Add a matching
entry to `ICONS` in `js/icons.js` (keyed by the same `id`) to give it a
glyph in the side menu; it falls back to no icon if omitted.

To add a new hardware model or site, edit `js/catalog.js` — no other files
need to change. A `MODEL_PRESETS` entry only needs to set the fields that
matter for that model (e.g. Product/OS/Storage/Warranty/Cost for a tablet);
anything left out just stays blank for you to fill in on first use. A model
preset's `manufacturer` field is metadata only (never written to the CSV) —
it drives the Manufacturer filter and nothing else, so it's fine to leave
off if you don't know it. A `SITE_PRESETS` entry sets Company and Location
to the same value by default; add an explicit `location` to an entry if a
site's Location ever needs to differ from its Company name. Its
`shortCode` (e.g. `SCL`, `MAR`) is what Asset Tag gets built from for that
site — leave it `''` until you have the real code, and Asset Tag just
stays blank in the meantime instead of guessing.
