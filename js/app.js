// The ?v= query strings below exist purely to bust GitHub Pages' CDN cache
// (Cache-Control: max-age=600) — without them, a browser that already has
// an old copy of one of these files cached will keep using it silently for
// up to 10 minutes after a new version deploys, even though index.html
// itself (and its own ?v=) came through fresh. Bump every ?v= here to match
// the version badge whenever any of these files change.
import { ASSET_TYPES, ASSET_STATE_SUGGESTIONS, defaultColumns, generalColumns, hardwareColumns, extraRowColumns } from './templates.js?v=2.1.0';
import { buildCsv, downloadCsv } from './csv.js?v=2.1.0';
import { loadState, saveState, clearState, loadSuggestions, addSuggestion } from './storage.js?v=2.1.0';
import { SITE_PRESETS, LOCATIONS_BY_COMPANY, MODEL_PRESETS } from './catalog.js?v=2.1.0';
import { iconSvg } from './icons.js?v=2.1.0';

const ACTIVE_TYPE_KEY = 'fsai:v1:activeType';

// Freshservice's own "Import" button is a JS-triggered modal on this list
// page rather than a page of its own, so this is the closest thing to a
// direct link — it lands you where that button lives, ready to click it.
const FRESHSERVICE_IMPORT_URL = 'https://helpdesk.xaviercet.org.uk/cmdb/items';

const els = {
  tabs: document.getElementById('type-tabs'),
  generalForm: document.getElementById('general-form'),
  hardwareForm: document.getElementById('hardware-form'),
  bulkForm: document.getElementById('bulk-form'),
  bulkPreviewWrap: document.getElementById('bulk-preview-wrap'),
  tableWrap: document.getElementById('table-wrap'),
  rowCount: document.getElementById('row-count'),
  invalidRowCount: document.getElementById('invalid-row-count'),
  downloadBtn: document.getElementById('download-btn'),
  openFreshserviceBtn: document.getElementById('open-freshservice-btn'),
  clearRowsBtn: document.getElementById('clear-rows-btn'),
  importEditBtn: document.getElementById('import-edit-btn'),
  importEditFile: document.getElementById('import-edit-file'),
  addRowsBtn: document.getElementById('add-rows-btn'),
  typeDescription: document.getElementById('type-description'),
  activeSections: document.getElementById('active-sections'),
  comingSoonPanel: document.getElementById('coming-soon-panel'),
  comingSoonMessage: document.getElementById('coming-soon-message'),
  navToggle: document.getElementById('nav-toggle'),
  navBackdrop: document.getElementById('nav-backdrop'),
  persistenceWarning: document.getElementById('persistence-warning'),
  persistenceWarningText: document.getElementById('persistence-warning-text'),
  persistenceWarningClose: document.getElementById('persistence-warning-close'),
  persistenceCue: document.getElementById('persistence-cue'),
  rowSearchWrap: document.getElementById('row-search-wrap'),
  rowSearch: document.getElementById('row-search'),
  bulkEditWrap: document.getElementById('bulk-edit-wrap'),
  bulkEditCount: document.getElementById('bulk-edit-count'),
  bulkEditField: document.getElementById('bulk-edit-field'),
  bulkEditValueWrap: document.getElementById('bulk-edit-value-wrap'),
  bulkEditApplyBtn: document.getElementById('bulk-edit-apply-btn'),
  bulkEditClearBtn: document.getElementById('bulk-edit-clear-btn'),
  modalOverlay: document.getElementById('modal-overlay'),
  modalMessage: document.getElementById('modal-message'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalOkBtn: document.getElementById('modal-ok-btn'),
  settingsDialog: document.getElementById('settings-dialog'),
};

// Remembers the chosen Manufacturer filter per asset type for this page
// load only — not persisted, it's just a convenience for narrowing a long
// Model Preset list.
const modelFilterState = {};

// Filters which rows renderTable() shows, not the underlying data — see
// there for why. Not persisted and reset on every asset-type switch (in
// renderAll()), same lifecycle as modelFilterState above.
const ROW_SEARCH_THRESHOLD = 8;
let rowSearchQuery = '';
function rowMatchesSearch(row, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  return [row.name, row.serialNumber, row.assetTag].some((v) => String(v ?? '').toLowerCase().includes(q));
}

// Which rows are checked for bulk editing, by row.id — module-level (like
// rowSearchQuery above) so it survives the table's own re-renders (search,
// row edits) but not an asset-type switch, where it's reset in renderAll().
let selectedRowIds = new Set();

// Location is deliberately left out: its valid options depend on each row's
// own Company (see locationOptionsForCompany), so a single blanket value
// could easily land rows in a Company/Location combination that doesn't
// exist. Every other default (shared-by-batch) field is safe to stamp
// across a selection — row-only fields (Name, Serial Number, Asset Tag)
// aren't offered at all since overwriting those with one shared value would
// destroy the per-device data they exist to hold.
function bulkEditableColumns(assetType) {
  return defaultColumns(assetType).filter((c) => c.key !== 'location');
}

let activeTypeId = localStorage.getItem(ACTIVE_TYPE_KEY) || 'desktop_pc';
let idCounter = 0;
const newRowId = () => `r${Date.now()}_${idCounter++}`;

function emptyState() {
  return {
    defaults: {},
    rows: [],
  };
}

function getState(typeId) {
  return loadState(typeId) || emptyState();
}

// Shown once per session the first time an actual save fails (storage full,
// private browsing, etc.) — saveState() already tried and failed silently
// under the hood, so this is the only place the user finds out their edits
// from here on aren't being kept. Left up rather than auto-dismissed, since
// the underlying cause doesn't resolve itself.
let persistenceWarningShown = false;
function showPersistenceWarning() {
  if (persistenceWarningShown || !els.persistenceWarning) return;
  persistenceWarningShown = true;
  els.persistenceWarningText.textContent =
    "Your changes aren't being saved on this device right now (storage may be full, or this is a private/incognito window). " +
    'Download a CSV of anything important before closing this tab — reloading will lose unsaved rows.';
  els.persistenceWarning.hidden = false;
}

// A themed stand-in for window.confirm()/alert() — those render as a bare
// OS dialog that ignores every theme (Vista, Classic Mac, XP, Windows 3.1,
// Matrix...) this app otherwise fully re-skins. Built on the same CSS
// custom properties every panel already uses (see .modal-box in
// styles.css), so it matches whichever theme is active for free.
//
// Pass cancelText to get confirm()'s behavior (resolves true/false); omit
// it for alert()'s (a single acknowledgement button, always resolves true
// — callers that don't need the value just `await` it and move on).
let modalResolve = null;
let modalLastFocused = null;

function closeModal(result) {
  if (!els.modalOverlay || els.modalOverlay.hidden) return;
  els.modalOverlay.hidden = true;
  document.removeEventListener('keydown', onModalKeydown);
  if (modalLastFocused && typeof modalLastFocused.focus === 'function') modalLastFocused.focus();
  const resolve = modalResolve;
  modalResolve = null;
  if (resolve) resolve(result);
}

function onModalKeydown(e) {
  if (e.key === 'Escape') closeModal(false);
}

function showModal({ message, okText = 'OK', cancelText = null, danger = false }) {
  if (!els.modalOverlay) return Promise.resolve(true);
  return new Promise((resolve) => {
    modalResolve = resolve;
    modalLastFocused = document.activeElement;
    els.modalMessage.textContent = message;
    els.modalOkBtn.textContent = okText;
    els.modalOkBtn.className = danger ? 'danger' : 'primary';
    els.modalCancelBtn.hidden = !cancelText;
    els.modalCancelBtn.textContent = cancelText || '';
    els.modalOverlay.hidden = false;
    document.addEventListener('keydown', onModalKeydown);
    els.modalOkBtn.focus();
  });
}

if (els.modalOkBtn) els.modalOkBtn.addEventListener('click', () => closeModal(true));
if (els.modalCancelBtn) els.modalCancelBtn.addEventListener('click', () => closeModal(false));
if (els.modalOverlay) {
  els.modalOverlay.addEventListener('click', (e) => {
    if (e.target === els.modalOverlay) closeModal(false);
  });
}

// Unlike showPersistenceWarning() above (one-time, dismissible), this
// reflects the true current state on every single save attempt — so if the
// underlying problem is still happening after the banner's been dismissed,
// there's still something to see rather than the app going quiet about it.
function persist(typeId, state) {
  const ok = saveState(typeId, state);
  if (els.persistenceCue) els.persistenceCue.hidden = ok;
  if (!ok) showPersistenceWarning();
}

const debounceTimers = new Map();
function debouncedPersist(typeId, state, delay = 200) {
  clearTimeout(debounceTimers.get(typeId));
  debounceTimers.set(
    typeId,
    setTimeout(() => persist(typeId, state), delay)
  );
}

function getAssetType(id) {
  return ASSET_TYPES.find((t) => t.id === id);
}

// ---------- Tabs ----------

function renderTabs() {
  els.tabs.innerHTML = '';

  const activeType = getAssetType(activeTypeId);
  navToggleValue.textContent = activeType.comingSoon ? `${activeType.label} (Coming soon)` : activeType.label;

  for (const type of ASSET_TYPES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab' + (type.id === activeTypeId ? ' active' : '') + (type.comingSoon ? ' tab-coming-soon' : '');

    const svg = iconSvg(type.id);
    if (svg) {
      const icon = document.createElement('span');
      icon.className = 'tab-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = svg;
      btn.appendChild(icon);
    }
    const text = document.createElement('span');
    text.textContent = type.comingSoon ? `${type.label} (Coming soon)` : type.label;
    btn.appendChild(text);

    btn.addEventListener('click', () => {
      closeMobileNav();
      if (type.id === activeTypeId) return;
      activeTypeId = type.id;
      localStorage.setItem(ACTIVE_TYPE_KEY, activeTypeId);
      renderAll();
    });
    els.tabs.appendChild(btn);
  }

  // Every real Freshservice Asset Type now has a working template — there's
  // no "coming soon" placeholder left to imply "we know about more types
  // than this." This static (non-clickable — nothing to click through to,
  // just a pointer to the existing Leave Feedback button) note replaces
  // that signal instead, so a genuinely new type still has somewhere to be
  // requested rather than just silently not appearing in the list.
  const missingNote = document.createElement('p');
  missingNote.className = 'tab-missing-note';
  missingNote.textContent = 'Product type missing? Please use the Leave Feedback option to request this.';
  els.tabs.appendChild(missingNote);
}

// On mobile the side nav is a genuine off-canvas drawer (slides in over a
// backdrop), not an inline accordion — the .open class is what drives the
// slide-in transform in CSS. On wide screens the sidebar is always visible
// via a media query and these classes are simply irrelevant there.
const navToggleIcon = document.getElementById('nav-toggle-icon');
navToggleIcon.innerHTML = iconSvg('menu');
const navToggleValue = document.getElementById('nav-toggle-value');
const navToggleChevron = document.getElementById('nav-toggle-chevron');
navToggleChevron.innerHTML = iconSvg('chevronDown');

function openMobileNav() {
  els.tabs.classList.add('open');
  els.navBackdrop.classList.add('open');
  els.navToggle.setAttribute('aria-expanded', 'true');
  navToggleChevron.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  els.tabs.classList.remove('open');
  els.navBackdrop.classList.remove('open');
  els.navToggle.setAttribute('aria-expanded', 'false');
  navToggleChevron.classList.remove('open');
  document.body.style.overflow = '';
}

els.navToggle.addEventListener('click', () => {
  if (els.tabs.classList.contains('open')) closeMobileNav();
  else openMobileNav();
});
els.navBackdrop.addEventListener('click', closeMobileNav);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMobileNav();
});

// ---------- Defaults panels (General + Hardware Specific) ----------

// Company and Location are both closed lists — Company from every known
// Site Preset, Location from that Company's own entry in
// LOCATIONS_BY_COMPANY (js/catalog.js), which always starts with the
// Company name itself followed by its sub-locations. Picking a Company
// resets Location to that first entry (the Company name), since a
// previously-picked Location almost never still applies once the option
// list itself has changed underneath it — pick a more specific
// sub-location again afterward if needed.
function locationOptionsForCompany(company) {
  if (!company) return [];
  return LOCATIONS_BY_COMPANY[company] || [company];
}

// Asset Tag is always `${shortCode}-${serial}`, never typed by hand.
// Returns '' if the current Company doesn't match a Site Preset with a
// Short Code set yet (js/catalog.js), leaving Asset Tag blank rather than
// guessing.
function shortCodeForCompany(company) {
  const preset = SITE_PRESETS.find((p) => p.company === company);
  return preset && preset.shortCode ? preset.shortCode : '';
}

// Applies every field from a Model Preset except `product` itself — the
// Product input already holds that value (that's what triggered the
// lookup), so Model Preset and Product are one field, not two.
function applyModelPresetFields(assetType, state, preset) {
  const validColumns = new Map(defaultColumns(assetType).map((c) => [c.key, c]));
  for (const [key, value] of Object.entries(preset.fields)) {
    if (key === 'product') continue;
    const targetCol = validColumns.get(key);
    if (!targetCol) continue;
    state.defaults[key] = value;
    if (targetCol.input === 'text' && value) addSuggestion(key, String(value));
  }
  persist(activeTypeId, state);
  renderHardwareForm(assetType, state);
  refreshBulkPreview(assetType, state);
}

const UNKNOWN_MANUFACTURER = '__unknown__';

function filteredModelPresets(modelPresets, manufacturerFilter) {
  if (!manufacturerFilter) return modelPresets;
  return modelPresets.filter((p) =>
    manufacturerFilter === UNKNOWN_MANUFACTURER ? !p.manufacturer : p.manufacturer === manufacturerFilter
  );
}

function productCatalogOptions(modelPresets, manufacturerFilter) {
  const names = filteredModelPresets(modelPresets, manufacturerFilter).map((p) => p.fields.product);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b));
}

// Manufacturer filter narrows the Product field's suggestions below —
// there's no separate Model Preset control, so this is the only extra
// field a catalogued asset type adds above the ordinary Hardware fields.
function renderManufacturerFilterField(assetType, state) {
  const modelPresets = MODEL_PRESETS[assetType.id] || [];
  if (modelPresets.length === 0) return null;

  const manufacturers = [...new Set(modelPresets.map((p) => p.manufacturer).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
  if (manufacturers.length <= 1) return null;
  const hasUnknown = modelPresets.some((p) => !p.manufacturer);

  const wrap = document.createElement('div');
  wrap.className = 'field';
  const label = document.createElement('label');
  label.textContent = 'Manufacturer';
  label.htmlFor = 'def-model-manufacturer';
  wrap.appendChild(label);

  const select = document.createElement('select');
  select.id = 'def-model-manufacturer';
  select.title = "Narrows Product's suggestions below.";
  const allOpt = document.createElement('option');
  allOpt.value = '';
  allOpt.textContent = 'All Manufacturers';
  select.appendChild(allOpt);
  for (const m of manufacturers) {
    const o = document.createElement('option');
    o.value = m;
    o.textContent = m;
    select.appendChild(o);
  }
  if (hasUnknown) {
    const o = document.createElement('option');
    o.value = UNKNOWN_MANUFACTURER;
    o.textContent = 'Unknown';
    select.appendChild(o);
  }
  select.value = modelFilterState[assetType.id] || '';
  wrap.appendChild(select);

  select.addEventListener('change', () => {
    modelFilterState[assetType.id] = select.value;
    renderHardwareForm(assetType, state);
  });

  return wrap;
}

// A lightweight suggestions dropdown for text inputs, replacing the
// browser-native <input list> + <datalist> pairing — datalist support on
// mobile Safari is unreliable (the popup can fail to appear at all,
// especially once the field's been cleared), so this is a small
// self-contained combobox instead: fully within our control, consistent
// across every device. `getOptions()` is called fresh each time the list
// opens/filters, so it stays in sync with a changing Manufacturer filter
// etc. `onSelect(value)` fires after the input's value is already set.
//
// Moves `input` into a new tight-fitting wrapper div (rather than reusing
// its existing .field parent, which also contains the label above it) —
// that's what lets CSS center the dropdown-affordance chevron on the
// input's own height, not the label+input combined height. `chevron: true`
// adds that affordance — reserve it for fields backed by a real curated
// list (Product's MODEL_PRESETS catalog); a plain typed-history field has
// no such list, so a chevron there would be misleading.
function attachCombobox(input, getOptions, onSelect, { chevron = false } = {}) {
  const comboWrap = document.createElement('div');
  comboWrap.className = chevron ? 'combobox-wrap combobox-wrap--chevron' : 'combobox-wrap';
  input.replaceWith(comboWrap);
  comboWrap.appendChild(input);

  const list = document.createElement('ul');
  list.className = 'combobox-list';
  list.hidden = true;
  comboWrap.appendChild(list);

  let highlighted = -1;

  function close() {
    list.hidden = true;
    list.innerHTML = '';
    highlighted = -1;
  }

  function open(filterText) {
    const q = filterText.trim().toLowerCase();
    const options = getOptions().filter((opt) => !q || opt.toLowerCase().includes(q));
    list.innerHTML = '';
    highlighted = -1;
    if (options.length === 0) {
      close();
      return;
    }
    for (const opt of options.slice(0, 50)) {
      const li = document.createElement('li');
      li.textContent = opt;
      li.addEventListener('pointerdown', (e) => {
        e.preventDefault(); // keep focus on the input, don't let blur fire first
        choose(opt);
      });
      list.appendChild(li);
    }
    list.hidden = false;
  }

  function choose(value) {
    input.value = value;
    close();
    onSelect(value);
  }

  function updateHighlight() {
    const items = list.querySelectorAll('li');
    items.forEach((li, i) => li.classList.toggle('highlighted', i === highlighted));
    if (items[highlighted]) items[highlighted].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('focus', () => open(''));
  input.addEventListener('input', () => open(input.value));
  input.addEventListener('blur', () => setTimeout(close, 120));
  input.addEventListener('keydown', (e) => {
    const items = list.querySelectorAll('li');
    if (list.hidden || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlighted = Math.min(highlighted + 1, items.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlighted = Math.max(highlighted - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      choose(items[highlighted].textContent);
    } else if (e.key === 'Escape') {
      close();
    }
  });
}

// Builds one labeled field (label + input/select) for a Shared Defaults
// column. Shared by the General and Hardware Specific panels — which
// panel a column lands in is decided by col.group in templates.js.
function buildDefaultField(col, assetType, state, suggestions, modelPresets) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const label = document.createElement('label');
  label.textContent = col.header;
  label.htmlFor = `def-${col.key}`;
  if (col.required) {
    const marker = document.createElement('span');
    marker.className = 'required-marker';
    marker.textContent = ' *';
    label.appendChild(marker);
  }
  wrap.appendChild(label);

  if (col.key === 'assetState') {
    const select = buildAssetStateSelect(state.defaults[col.key]);
    select.id = `def-${col.key}`;
    select.addEventListener('change', () => {
      state.defaults[col.key] = select.value;
      persist(activeTypeId, state);
      refreshBulkPreview(assetType, state);
    });
    wrap.appendChild(select);
    return wrap;
  }

  if (col.key === 'company') {
    const select = buildCompanySelect(state.defaults[col.key]);
    select.id = `def-${col.key}`;
    select.addEventListener('change', () => {
      state.defaults.company = select.value;
      state.defaults.location = locationOptionsForCompany(select.value)[0] || '';
      persist(activeTypeId, state);
      renderGeneralForm(assetType, state);
      refreshAssetTagHint(state);
      refreshBulkPreview(assetType, state);
    });
    wrap.appendChild(select);
    return wrap;
  }

  if (col.key === 'location') {
    const select = buildLocationSelect(state.defaults.company, state.defaults[col.key]);
    select.id = `def-${col.key}`;
    select.addEventListener('change', () => {
      state.defaults.location = select.value;
      persist(activeTypeId, state);
      refreshBulkPreview(assetType, state);
    });
    wrap.appendChild(select);
    return wrap;
  }

  const input = document.createElement('input');
  input.id = `def-${col.key}`;
  input.type = col.input === 'date' ? 'date' : col.input === 'number' ? 'number' : 'text';
  if (col.input === 'number') input.step = 'any';
  input.value = state.defaults[col.key] ?? '';
  wrap.appendChild(input);

  const onSuggestionSelected = () => {
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };
  if (col.key === 'product' && modelPresets.length > 0) {
    attachCombobox(input, () => productCatalogOptions(modelPresets, modelFilterState[assetType.id] || ''), onSuggestionSelected, { chevron: true });
  } else if (col.input === 'text') {
    attachCombobox(input, () => suggestions[col.key] || [], onSuggestionSelected);
  }

  input.addEventListener('input', () => {
    state.defaults[col.key] = input.value;
    debouncedPersist(activeTypeId, state);
    refreshBulkPreview(assetType, state);
  });
  input.addEventListener('change', () => {
    if (col.input !== 'text' || !input.value.trim()) return;
    addSuggestion(col.key, input.value.trim());
    if (col.key === 'product' && modelPresets.length > 0) {
      const preset = modelPresets.find((p) => p.fields.product === input.value);
      if (preset) applyModelPresetFields(assetType, state, preset);
    }
  });

  return wrap;
}

function renderGeneralForm(assetType, state) {
  els.generalForm.innerHTML = '';
  const suggestions = loadSuggestions();

  for (const col of generalColumns(assetType)) {
    els.generalForm.appendChild(buildDefaultField(col, assetType, state, suggestions, []));
  }
}

function renderHardwareForm(assetType, state) {
  els.hardwareForm.innerHTML = '';
  const suggestions = loadSuggestions();
  const modelPresets = MODEL_PRESETS[assetType.id] || [];

  for (const col of hardwareColumns(assetType)) {
    const wrap = buildDefaultField(col, assetType, state, suggestions, modelPresets);

    // Manufacturer sits directly above Product, stacked in the same grid
    // cell — it exists purely to narrow Product's suggestions, so the two
    // stay visually paired rather than Manufacturer living on its own.
    if (col.key === 'product') {
      const manufacturerField = renderManufacturerFilterField(assetType, state);
      if (manufacturerField) {
        const group = document.createElement('div');
        group.className = 'field-group';
        group.appendChild(manufacturerField);
        group.appendChild(wrap);
        els.hardwareForm.appendChild(group);
        continue;
      }
    }

    els.hardwareForm.appendChild(wrap);
  }
}

// A real <select> (not a text input) for Asset State — it's a closed set
// of valid Freshservice states, and native <select> is fully reliable on
// mobile where a free-text-plus-suggestions field can be flaky.
function buildAssetStateSelect(currentValue) {
  const select = document.createElement('select');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  for (const s of ASSET_STATE_SUGGESTIONS) {
    const o = document.createElement('option');
    o.value = s;
    o.textContent = s;
    select.appendChild(o);
  }
  select.value = currentValue ?? '';
  return select;
}

// A real <select> for Company — every known Site Preset (js/catalog.js),
// nothing free-typed. Location's own options depend on which Company is
// selected here (see buildLocationSelect), so anything not in this list
// would leave Location with no matching sub-locations to offer either.
function buildCompanySelect(currentValue) {
  const select = document.createElement('select');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  const companies = SITE_PRESETS.map((p) => p.company).sort((a, b) => a.localeCompare(b));
  for (const c of companies) {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    select.appendChild(o);
  }
  select.value = currentValue ?? '';
  return select;
}

// A real <select> for Location, its options narrowed to just the given
// Company's own sub-locations (LOCATIONS_BY_COMPANY in js/catalog.js) —
// disabled with no options until a Company is chosen, since there's
// nothing to filter to yet.
function buildLocationSelect(company, currentValue) {
  const select = document.createElement('select');
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = '--';
  select.appendChild(blank);
  const options = locationOptionsForCompany(company);
  for (const loc of options) {
    const o = document.createElement('option');
    o.value = loc;
    o.textContent = loc;
    select.appendChild(o);
  }
  select.value = currentValue && options.includes(currentValue) ? currentValue : '';
  select.disabled = options.length === 0;
  return select;
}

// ---------- Bulk add panel ----------

// Points at the currently-rendered Asset Tag hint <p> so Company changes
// (via preset or typing) can update its text without rebuilding the whole
// Bulk Add panel — that would wipe any serials the user already pasted in.
let assetTagHintEl = null;
// Points at the live Assets textarea so General/Hardware field changes can
// refresh the preview below without needing renderBulkForm's own scope.
let bulkSerialsTextarea = null;

function assetTagHintText(state) {
  const shortCode = shortCodeForCompany(state.defaults.company);
  return shortCode
    ? `Asset Tag is generated automatically as ${shortCode}-<serial> from the Company above.`
    : "This company doesn't have a Short Code set up yet, so Asset Tag will be left blank — fill it in per row, or ask whoever maintains this tool to add one.";
}

function refreshAssetTagHint(state) {
  if (assetTagHintEl) assetTagHintEl.textContent = assetTagHintText(state);
}

// One line can be a bare serial (Name defaults to the same value as Asset
// Tag) or a "Name, Serial" / "Name<TAB>Serial" pair, so names assigned
// before serials were recorded don't have to match anything generated.
// Tab is what you get pasting two columns straight from a spreadsheet;
// comma works too for hand-typed lines.
function lineHasNameSerialDelimiter(line) {
  return line.includes('\t') || line.includes(',');
}

// extraCols are per-device 'row' fields beyond Name/Serial that this asset
// type wants set per line too (e.g. Phones & Telephony's Extension) — see
// extraRowColumns in templates.js. With none, this only ever splits on the
// FIRST delimiter, so a Name that itself contains a comma (legal — Bulk
// Add isn't real CSV) still round-trips intact. With extras, a plain
// split is used instead so each extra gets its own segment; a line can
// still give fewer values than there are extras (they're left blank).
function splitBulkLine(line, extraCols) {
  const delim = line.includes('\t') ? '\t' : line.includes(',') ? ',' : null;
  if (!delim) return { name: '', serial: line.trim(), extras: {} };
  if (extraCols.length === 0) {
    const idx = line.indexOf(delim);
    return { name: line.slice(0, idx).trim(), serial: line.slice(idx + 1).trim(), extras: {} };
  }
  const [name = '', serial = '', ...rest] = line.split(delim).map((p) => p.trim());
  const extras = {};
  extraCols.forEach((col, i) => {
    extras[col.key] = rest[i] ?? '';
  });
  return { name, serial, extras };
}

// Minimal CSV line parser (handles "quoted, fields" with "" escaping) —
// real .csv exports from Excel/Google Sheets need this, unlike the naive
// comma/tab split above which is only for hand-typed or pasted lines.
function parseCsvLine(line) {
  const cells = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      cells.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  cells.push(cur.trim());
  return cells;
}

const CSV_HEADER_WORDS = ['name', 'display name', 'serial', 'serial number', 'asset tag'];
function looksLikeHeaderRow(cells, extraCols) {
  // Every cell must exactly match a known header word — a single-column
  // "Serial Number" header still counts, while a real data row (e.g. a
  // bare serial with no header at all) never accidentally does.
  const words = [...CSV_HEADER_WORDS, ...extraCols.map((c) => c.header.trim().toLowerCase())];
  return cells.length > 0 && cells.every((c) => words.includes(c.trim().toLowerCase()));
}

// A .csv with a Name column and a Serial column (in that order; a Serial-
// only file works too, falling back to the same default as a bare pasted
// serial), plus any of this asset type's own extra per-row columns (e.g.
// Phones & Telephony's Extension) if the file has them — previously these
// were silently dropped by this path even though typing/pasting the same
// data into the textarea worked fine. A leading header row is detected and
// its column order (not just position) decides where each field comes
// from; without one, columns are assumed in the same order the Bulk Add
// textarea itself expects (Name, Serial, then each extra in order).
function parseCsvFile(text, extraCols) {
  let rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseCsvLine);
  if (rows.length === 0) return [];

  const hasHeader = looksLikeHeaderRow(rows[0], extraCols);
  let colTypes; // 'name' | 'serial' | { extra: key } | null, per column index
  if (hasHeader) {
    const extraByHeader = new Map(extraCols.map((c) => [c.header.trim().toLowerCase(), c.key]));
    colTypes = rows[0].map((cell) => {
      const h = cell.trim().toLowerCase();
      if (h === 'name' || h === 'display name') return 'name';
      if (h === 'serial' || h === 'serial number') return 'serial';
      return extraByHeader.has(h) ? { extra: extraByHeader.get(h) } : null;
    });
    rows = rows.slice(1);
  } else {
    colTypes = ['name', 'serial', ...extraCols.map((c) => ({ extra: c.key }))];
  }

  return rows.map((cells) => {
    // No header and only one populated column — same bare-serial fallback
    // as before (Name defaults to Asset Tag, not this column's value).
    if (!hasHeader && (cells.length === 1 || !cells[1])) {
      return { name: '', serial: cells[0] ?? '', extras: {} };
    }
    const entry = { name: '', serial: '', extras: {} };
    colTypes.forEach((type, i) => {
      if (!type || cells[i] === undefined) return;
      if (type === 'name') entry.name = cells[i];
      else if (type === 'serial') entry.serial = cells[i];
      else entry.extras[type.extra] = cells[i];
    });
    return entry;
  });
}

// Loads a previously-exported (or otherwise matching) full CSV straight
// into the Rows table for editing — every column, not just Name/Serial.
// Header cells are matched against assetType.columns by header text
// (case-insensitive); unmatched CSV columns are ignored and unmatched
// template columns are left blank rather than guessed. Returns
// matchedCount so the caller can tell "wrong template" apart from "empty
// file".
function parseCsvForEditing(assetType, text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseCsvLine);
  if (lines.length === 0) return { rows: [], matchedCount: 0 };

  const columnByHeader = new Map(assetType.columns.map((c) => [c.header.trim().toLowerCase(), c]));
  const colForIndex = lines[0].map((cell) => columnByHeader.get(cell.trim().toLowerCase()) || null);
  const matchedCount = colForIndex.filter(Boolean).length;
  if (matchedCount === 0) return { rows: [], matchedCount: 0 };

  const rows = lines.slice(1).map((cells) => {
    const row = {};
    for (const col of assetType.columns) row[col.key] = '';
    colForIndex.forEach((col, i) => {
      if (col && cells[i] !== undefined) row[col.key] = cells[i];
    });
    return row;
  });
  return { rows, matchedCount };
}

// Builds full row objects (every column, not just Name/Serial/Asset Tag)
// from the Assets textarea, using the current Shared Defaults — shared by
// the live preview and the actual "Add Assets of Another Product" commit
// so the two can never drift apart.
function buildRowsFromText(assetType, state, text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  // A bare line (no comma/tab) sitting alongside other Name,Serial lines is
  // usually a forgotten comma, not an intentional bare serial — flag it so
  // it's caught in review instead of silently becoming Name = Asset Tag.
  const anyLineHasDelimiter = lines.some(lineHasNameSerialDelimiter);
  const shortCode = shortCodeForCompany(state.defaults.company);
  const extraCols = extraRowColumns(assetType);
  return lines.map((line) => {
    const { name: manualName, serial, extras } = splitBulkLine(line, extraCols);
    const row = {};
    for (const col of defaultColumns(assetType)) {
      row[col.key] = state.defaults[col.key] ?? '';
    }
    for (const col of extraCols) {
      row[col.key] = extras[col.key] ?? '';
    }
    row.serialNumber = serial;
    row.assetTag = shortCode ? `${shortCode}-${serial}` : '';
    row.name = manualName || row.assetTag;
    row._ambiguousName = anyLineHasDelimiter && !lineHasNameSerialDelimiter(line);
    return row;
  });
}

let previewDebounceTimer = null;
function schedulePreviewUpdate(assetType, state, text) {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => renderBulkPreview(assetType, state, text), 200);
}

function refreshBulkPreview(assetType, state) {
  if (!bulkSerialsTextarea) return;
  renderBulkPreview(assetType, state, bulkSerialsTextarea.value);
}

// Read-only preview of exactly what Add Assets of Another Product would produce —
// same column set and order as the real export — so mistakes (wrong
// Company, missing Short Code, a typo'd Product) are visible before
// they're committed to the Rows table below.
function renderBulkPreview(assetType, state, text) {
  const wrap = els.bulkPreviewWrap;
  wrap.innerHTML = '';

  const rows = buildRowsFromText(assetType, state, text);
  if (rows.length === 0) return;

  const heading = document.createElement('p');
  heading.className = 'hint';
  heading.textContent = `Preview — ${rows.length} row${rows.length === 1 ? '' : 's'} will be added, exactly as they'll appear in the export:`;
  wrap.appendChild(heading);

  const tableWrapDiv = document.createElement('div');
  tableWrapDiv.className = 'table-wrap';
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  for (const col of assetType.columns) {
    const th = document.createElement('th');
    th.textContent = col.header;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const col of assetType.columns) {
      const td = document.createElement('td');
      const value = row[col.key];
      if (!value && col.required) {
        td.textContent = 'missing';
        td.className = 'preview-missing';
      } else {
        td.textContent = value ?? '';
      }
      if (col.key === 'name' && row._ambiguousName) {
        td.classList.add('preview-ambiguous');
        td.title =
          "This line had no comma/tab, so Name defaults to the Asset Tag — but other lines in this paste do have one. " +
          'If this device has a name, add it before the serial (e.g. "Name, Serial").';
        const warnIcon = document.createElement('span');
        warnIcon.className = 'tab-icon ambiguous-icon';
        warnIcon.setAttribute('aria-hidden', 'true');
        warnIcon.innerHTML = iconSvg('warning');
        td.appendChild(warnIcon);
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  tableWrapDiv.appendChild(table);
  wrap.appendChild(tableWrapDiv);
}

function renderBulkForm(assetType, state) {
  els.bulkForm.innerHTML = '';
  els.bulkPreviewWrap.innerHTML = '';

  const serialsField = document.createElement('div');
  serialsField.className = 'field field-wide';

  const serialsHeader = document.createElement('div');
  serialsHeader.className = 'bulk-serials-header';
  serialsHeader.innerHTML = `<label for="bulk-serials">Assets (one per line)</label>`;

  const serialsActions = document.createElement('div');
  serialsActions.className = 'bulk-serials-actions';

  const templateBtn = document.createElement('button');
  templateBtn.type = 'button';
  templateBtn.className = 'primary small';
  templateBtn.innerHTML = `<span class="tab-icon" aria-hidden="true">${iconSvg('download')}</span> Download Template CSV`;
  templateBtn.addEventListener('click', () => {
    const template = 'Name,Serial\r\nMAR-01,LL7QX4MQ9N\r\n';
    downloadCsv('freshservice-asset-import-name-serial-template.csv', template);
  });
  serialsActions.appendChild(templateBtn);

  const importBtn = document.createElement('button');
  importBtn.type = 'button';
  importBtn.className = 'primary small';
  importBtn.innerHTML = `<span class="tab-icon" aria-hidden="true">${iconSvg('upload')}</span> Import CSV`;
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv,text/csv';
  fileInput.hidden = true;
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    const fileExtraCols = extraRowColumns(assetType);
    const entries = parseCsvFile(await file.text(), fileExtraCols);
    // Join with a tab, not a comma: splitBulkLine prefers tab when
    // present, so a Name that itself contains a comma (legal in a quoted
    // CSV field) survives the round-trip through this textarea intact.
    textarea.value = entries
      .map(({ name, serial, extras }) => {
        const extraVals = fileExtraCols.map((c) => extras[c.key] ?? '');
        return name || extraVals.some(Boolean) ? [name, serial, ...extraVals].join('\t') : serial;
      })
      .join('\n');
    renderBulkPreview(assetType, state, textarea.value);
  });
  serialsActions.appendChild(importBtn);
  serialsActions.appendChild(fileInput);

  serialsHeader.appendChild(serialsActions);
  serialsField.appendChild(serialsHeader);

  const textarea = document.createElement('textarea');
  textarea.id = 'bulk-serials';
  textarea.rows = 6;
  const extraCols = extraRowColumns(assetType);
  if (extraCols.length > 0) {
    const extraHeaders = extraCols.map((c) => c.header).join(', ');
    const extraExample = extraCols.map(() => '123').join(', ');
    textarea.placeholder =
      'Paste one per line — a bare serial (Name defaults to the same value as Asset Tag), or ' +
      `"Name, Serial, ${extraHeaders}" (or paste columns from a spreadsheet) to set them yourself ` +
      `— trailing values can be left off a line if you don't have them yet\n` +
      `e.g.\nLL7QX4MQ9N\nMAR-05, LXQL7XR217, ${extraExample}\n...`;
  } else {
    textarea.placeholder =
      'Paste one per line — a bare serial (Name defaults to the same value as Asset Tag), or ' +
      '"Name, Serial" (or paste two columns from a spreadsheet) to set the name yourself\n' +
      'e.g.\nLL7QX4MQ9N\nMAR-05, LXQL7XR217\n...' +
      '\n...or use Import CSV above to load a Name,Serial file instead.';
  }
  bulkSerialsTextarea = textarea;
  textarea.addEventListener('input', () => schedulePreviewUpdate(assetType, state, textarea.value));
  serialsField.appendChild(textarea);
  const serialsHint = document.createElement('p');
  serialsHint.className = 'hint';
  serialsHint.textContent = assetTagHintText(state);
  assetTagHintEl = serialsHint;
  serialsField.appendChild(serialsHint);
  els.bulkForm.appendChild(serialsField);
}

// ---------- Table ----------

function isRowInvalid(assetType, row, col) {
  if (!col.required) return false;
  return !String(row[col.key] ?? '').trim();
}

// The red border on a missing-required-field input/select is a purely
// visual cue — without this, a screen reader user tabbing through the
// table gets no indication a field is invalid at all. Centralized here so
// every one of the (input/select) x (initial render/on-change) call sites
// below sets both consistently instead of the class alone.
function setFieldInvalid(el, isInvalid) {
  el.classList.toggle('invalid', isInvalid);
  if (isInvalid) {
    el.setAttribute('aria-invalid', 'true');
  } else {
    el.removeAttribute('aria-invalid');
  }
}

function countRowsMissingFields(assetType, rows) {
  return rows.reduce((count, row) => {
    const rowMissing = assetType.columns.some((c) => isRowInvalid(assetType, row, c));
    return count + (rowMissing ? 1 : 0);
  }, 0);
}

// A serial pasted or typed twice creates two rows that look identical to
// Freshservice — flag it (not block it, same philosophy as the ambiguous-
// name warning) rather than let it silently through to a failed or
// mismatched import. Patches the already-rendered inputs directly instead
// of a full renderTable() call, so editing one row's serial doesn't steal
// focus back from whichever field is being typed into.
function refreshDuplicateWarnings(state) {
  const counts = new Map();
  for (const row of state.rows) {
    const serial = String(row.serialNumber ?? '').trim();
    if (!serial) continue;
    counts.set(serial, (counts.get(serial) || 0) + 1);
  }
  for (const row of state.rows) {
    const tr = els.tableWrap.querySelector(`tr[data-row-id="${row.id}"]`);
    const input = tr && tr.querySelector('input[data-key="serialNumber"]');
    if (!input) continue;
    const serial = String(row.serialNumber ?? '').trim();
    const otherCount = serial ? (counts.get(serial) || 1) - 1 : 0;
    const isDuplicate = otherCount > 0;
    const message = isDuplicate
      ? `Duplicate serial number — also used on ${otherCount} other row${otherCount === 1 ? '' : 's'}.`
      : '';
    input.classList.toggle('duplicate', isDuplicate);
    input.title = message;

    // The .duplicate class/title above is a hover-only, sighted-user cue —
    // this is the same warning exposed to a screen reader via the field's
    // own accessible description, discovered on focus rather than relying
    // on a separate announcement.
    let desc = tr.querySelector('.dup-desc');
    if (isDuplicate) {
      if (!desc) {
        desc = document.createElement('span');
        desc.className = 'dup-desc sr-only';
        desc.id = `dup-desc-${row.id}`;
        input.insertAdjacentElement('afterend', desc);
      }
      desc.textContent = message;
      input.setAttribute('aria-invalid', 'true');
      input.setAttribute('aria-describedby', desc.id);
    } else {
      // Only clear aria-invalid if setFieldInvalid() (see above) isn't
      // also flagging this same field invalid for a missing-required-value
      // reason — the .invalid class is what setFieldInvalid toggles, so
      // it's the source of truth for whether that's still the case.
      if (!input.classList.contains('invalid')) input.removeAttribute('aria-invalid');
      input.removeAttribute('aria-describedby');
      if (desc) desc.remove();
    }
  }
}

// Builds the single input/select that holds the value about to be stamped
// onto every selected row — mirrors the per-row widgets in renderTable
// (real <select> for Asset State/Company, typed input matching col.input
// otherwise) since the bulk value needs to be just as valid as a per-row
// edit would be.
function renderBulkEditValueWidget(col, currentValue) {
  els.bulkEditValueWrap.innerHTML = '';
  if (!col) return;
  let widget;
  if (col.key === 'assetState') {
    widget = buildAssetStateSelect(currentValue ?? '');
  } else if (col.key === 'company') {
    widget = buildCompanySelect(currentValue ?? '');
  } else {
    widget = document.createElement('input');
    widget.type = col.input === 'date' ? 'date' : col.input === 'number' ? 'number' : 'text';
    if (col.input === 'number') widget.step = 'any';
    widget.value = currentValue ?? '';
  }
  widget.id = 'bulk-edit-value';
  els.bulkEditValueWrap.appendChild(widget);
}

// Field options only get rebuilt when the asset type actually changes
// (tracked via a dataset marker on the <select> itself) — every other
// renderTable() call (search filtering, another row's checkbox, the table
// re-rendering after Apply) leaves whatever field/value the user has
// mid-entry alone, since #bulk-edit-wrap lives outside #table-wrap and
// nothing else touches it.
function updateBulkEditToolbar(assetType, state) {
  if (!els.bulkEditWrap) return;

  const columns = bulkEditableColumns(assetType);
  if (els.bulkEditField.dataset.assetType !== assetType.id) {
    els.bulkEditField.innerHTML = '';
    for (const col of columns) {
      const opt = document.createElement('option');
      opt.value = col.key;
      opt.textContent = col.header;
      els.bulkEditField.appendChild(opt);
    }
    els.bulkEditField.dataset.assetType = assetType.id;
    els.bulkEditField.value = columns[0]?.key || '';
    renderBulkEditValueWidget(columns[0], '');
  }

  els.bulkEditWrap.hidden = selectedRowIds.size === 0;
  els.bulkEditCount.textContent = `${selectedRowIds.size} row${selectedRowIds.size === 1 ? '' : 's'} selected`;
}

function renderTable(assetType, state) {
  els.tableWrap.innerHTML = '';
  els.rowCount.textContent = `${state.rows.length} row${state.rows.length === 1 ? '' : 's'}`;

  // Drop any selected id that no longer has a matching row — e.g. it was
  // deleted individually, or the whole batch was cleared — so the bulk-edit
  // toolbar's count never overstates how many rows are actually still
  // checked.
  const liveRowIds = new Set(state.rows.map((r) => r.id));
  for (const id of selectedRowIds) {
    if (!liveRowIds.has(id)) selectedRowIds.delete(id);
  }
  updateBulkEditToolbar(assetType, state);

  // Stays visible after the download-time confirm dialog is dismissed —
  // the red border on an individual invalid field is easy to lose track
  // of once you've scrolled (especially on mobile), so this is the
  // persistent trail back to "which rows still need attention." Computed
  // against every row regardless of the search filter below — a row
  // scrolled out of view by a search shouldn't drop out of this count.
  if (els.invalidRowCount) {
    const missing = countRowsMissingFields(assetType, state.rows);
    els.invalidRowCount.hidden = missing === 0;
    els.invalidRowCount.textContent = missing > 0 ? `${missing} row${missing === 1 ? '' : 's'} missing required fields` : '';
  }

  // A filter box for a handful of rows is clutter, not help — only worth
  // showing once scrolling to find one row actually becomes the
  // alternative.
  if (els.rowSearchWrap) {
    els.rowSearchWrap.hidden = state.rows.length <= ROW_SEARCH_THRESHOLD;
  }

  if (state.rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No rows yet. Add rows above from pasted serial numbers or an imported CSV.';
    els.tableWrap.appendChild(empty);
    return;
  }

  // Filters which rows render below, not state.rows itself — Download CSV,
  // the missing-fields count above, and duplicate-serial detection all
  // still see every row regardless of what's filtered out of view.
  const visibleRows = state.rows.filter((row) => rowMatchesSearch(row, rowSearchQuery));
  if (visibleRows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = `No rows match "${rowSearchQuery}".`;
    els.tableWrap.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');

  // Selects/deselects every currently-visible row at once — checked when
  // all of them are already selected, indeterminate when only some are, so
  // it always reflects the visible set rather than the full (possibly
  // search-filtered) selection.
  const thSelect = document.createElement('th');
  const visibleIds = visibleRows.map((r) => r.id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedRowIds.has(id)).length;
  const selectAllCb = document.createElement('input');
  selectAllCb.type = 'checkbox';
  selectAllCb.setAttribute('aria-label', 'Select all visible rows');
  selectAllCb.checked = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  selectAllCb.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
  selectAllCb.addEventListener('change', () => {
    for (const id of visibleIds) {
      if (selectAllCb.checked) selectedRowIds.add(id);
      else selectedRowIds.delete(id);
    }
    renderTable(assetType, state);
  });
  thSelect.appendChild(selectAllCb);
  headRow.appendChild(thSelect);

  for (const col of assetType.columns) {
    const th = document.createElement('th');
    th.textContent = col.header;
    headRow.appendChild(th);
  }
  const thActions = document.createElement('th');
  thActions.textContent = '';
  headRow.appendChild(thActions);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  for (const row of visibleRows) {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;

    const tdSelect = document.createElement('td');
    const rowCb = document.createElement('input');
    rowCb.type = 'checkbox';
    rowCb.checked = selectedRowIds.has(row.id);
    rowCb.setAttribute('aria-label', `Select row (${row.name || row.assetTag || 'unnamed'})`);
    rowCb.addEventListener('change', () => {
      if (rowCb.checked) selectedRowIds.add(row.id);
      else selectedRowIds.delete(row.id);
      renderTable(assetType, state);
    });
    tdSelect.appendChild(rowCb);
    tr.appendChild(tdSelect);

    for (const col of assetType.columns) {
      const td = document.createElement('td');
      // Read by the mobile card layout (css/styles.css, max-width: 640px)
      // via a ::before { content: attr(data-label) } — the table's own
      // <thead> is hidden at that width, so this is what labels each field
      // in a stacked card instead.
      td.dataset.label = col.header;

      if (col.key === 'assetState') {
        const select = buildAssetStateSelect(row[col.key]);
        select.dataset.key = col.key;
        setFieldInvalid(select, isRowInvalid(assetType, row, col));
        select.addEventListener('change', () => {
          row[col.key] = select.value;
          setFieldInvalid(select, isRowInvalid(assetType, row, col));
          persist(activeTypeId, state);
        });
        td.appendChild(select);
        tr.appendChild(td);
        continue;
      }

      if (col.key === 'company') {
        const select = buildCompanySelect(row[col.key]);
        select.dataset.key = col.key;
        select.title = select.value;
        setFieldInvalid(select, isRowInvalid(assetType, row, col));
        select.addEventListener('change', () => {
          row.company = select.value;
          row.location = locationOptionsForCompany(select.value)[0] || '';
          persist(activeTypeId, state);
          renderTable(assetType, state);
        });
        td.appendChild(select);
        tr.appendChild(td);
        continue;
      }

      if (col.key === 'location') {
        const select = buildLocationSelect(row.company, row[col.key]);
        select.dataset.key = col.key;
        select.title = select.value;
        setFieldInvalid(select, isRowInvalid(assetType, row, col));
        select.addEventListener('change', () => {
          row.location = select.value;
          select.title = select.value;
          setFieldInvalid(select, isRowInvalid(assetType, row, col));
          persist(activeTypeId, state);
        });
        td.appendChild(select);
        tr.appendChild(td);
        continue;
      }

      const input = document.createElement('input');
      input.type = col.input === 'date' ? 'date' : col.input === 'number' ? 'number' : 'text';
      if (col.input === 'number') input.step = 'any';
      input.value = row[col.key] ?? '';
      input.dataset.key = col.key;
      // A title showing the full value covers Product/Processor/etc. (any
      // free-text field long enough to clip in this table's compact
      // columns) without hovering being the only way to read it — dates and
      // numbers are never long enough for this to matter.
      if (col.input === 'text') input.title = input.value;
      setFieldInvalid(input, isRowInvalid(assetType, row, col));

      let ambiguousIcon = null;
      let nameWrap = null;
      if (col.key === 'name' && row._ambiguousName) {
        input.classList.add('ambiguous');
        input.title =
          'This row came from a bare-serial line pasted alongside Name,Serial lines — double-check the Name is right.';
        ambiguousIcon = document.createElement('span');
        ambiguousIcon.className = 'tab-icon ambiguous-icon';
        ambiguousIcon.setAttribute('aria-hidden', 'true');
        ambiguousIcon.innerHTML = iconSvg('warning');
        nameWrap = document.createElement('div');
        nameWrap.className = 'name-cell';
      }

      input.addEventListener('input', () => {
        row[col.key] = input.value;
        setFieldInvalid(input, isRowInvalid(assetType, row, col));
        if (col.key === 'name' && row._ambiguousName) {
          row._ambiguousName = false;
          input.classList.remove('ambiguous');
          if (ambiguousIcon) ambiguousIcon.remove();
        }
        if (col.input === 'text') input.title = input.value;
        if (col.key === 'serialNumber') refreshDuplicateWarnings(state);
        debouncedPersist(activeTypeId, state);
      });
      input.addEventListener('change', () => {
        if (col.input === 'text' && col.source === 'default' && input.value.trim()) {
          addSuggestion(col.key, input.value.trim());
        }
      });

      if (nameWrap) {
        nameWrap.appendChild(input);
        nameWrap.appendChild(ambiguousIcon);
        td.appendChild(nameWrap);
      } else {
        td.appendChild(input);
      }
      tr.appendChild(td);
    }

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn danger';
    delBtn.title = `Delete row (${row.name || row.assetTag || 'unnamed'})`;
    delBtn.setAttribute('aria-label', delBtn.title);
    delBtn.innerHTML = `<span class="tab-icon" aria-hidden="true">${iconSvg('close')}</span>`;
    delBtn.addEventListener('click', async () => {
      const ok = await showModal({
        message: `Delete row "${row.name || row.assetTag || 'unnamed'}"? This cannot be undone.`,
        okText: 'Delete',
        cancelText: 'Cancel',
        danger: true,
      });
      if (!ok) return;
      state.rows = state.rows.filter((r) => r.id !== row.id);
      persist(activeTypeId, state);
      renderTable(assetType, state);
    });
    tdActions.appendChild(delBtn);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  els.tableWrap.appendChild(table);
  refreshDuplicateWarnings(state);
}

// ---------- Toolbar actions ----------

// Hardcoded cap on distinct Product values per export — Add Assets of
// Another Product is meant for mixing in a handful of extra products, not
// an unbounded number of them in one file.
const MAX_PRODUCT_TYPES = 10;

function wireToolbar(assetType, state) {
  if (els.addRowsBtn) {
    els.addRowsBtn.onclick = async () => {
      const text = bulkSerialsTextarea ? bulkSerialsTextarea.value : '';
      const rows = buildRowsFromText(assetType, state, text);
      if (rows.length === 0) return;

      const existingProducts = new Set(state.rows.map((r) => r.product).filter(Boolean));
      const newProduct = state.defaults.product;
      if (newProduct && !existingProducts.has(newProduct) && existingProducts.size >= MAX_PRODUCT_TYPES) {
        await showModal({
          message: `This export already has ${MAX_PRODUCT_TYPES} different products in it. Download it and start a new export before adding another.`,
        });
        return;
      }

      for (const row of rows) {
        row.id = newRowId();
        state.rows.push(row);
      }
      if (bulkSerialsTextarea) bulkSerialsTextarea.value = '';
      els.bulkPreviewWrap.innerHTML = '';
      persist(activeTypeId, state);
      renderTable(assetType, state);
    };
  }

  if (els.importEditBtn && els.importEditFile) {
    els.importEditBtn.onclick = () => els.importEditFile.click();
    els.importEditFile.onchange = async () => {
      const file = els.importEditFile.files[0];
      els.importEditFile.value = '';
      if (!file) return;
      const { rows, matchedCount } = parseCsvForEditing(assetType, await file.text());
      if (matchedCount === 0) {
        await showModal({
          message: `That CSV's header row doesn't match any columns from the "${assetType.label}" template, so nothing was imported. Make sure the first row has headers like Name, Serial Number, Asset Tag, etc.`,
        });
        return;
      }
      if (rows.length === 0) {
        await showModal({ message: 'No data rows found in that CSV (just a header row, or the file was empty).' });
        return;
      }
      for (const row of rows) {
        row.id = newRowId();
        state.rows.push(row);
      }
      persist(activeTypeId, state);
      renderTable(assetType, state);
    };
  }

  els.clearRowsBtn.onclick = async () => {
    if (state.rows.length === 0) return;
    const ok = await showModal({
      message: `Delete all ${state.rows.length} row(s) for ${assetType.label}? This cannot be undone.`,
      okText: 'Delete All',
      cancelText: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    state.rows = [];
    persist(activeTypeId, state);
    renderTable(assetType, state);
  };

  els.downloadBtn.onclick = async () => {
    if (state.rows.length === 0) {
      await showModal({ message: 'Add at least one row before downloading.' });
      return;
    }
    const missing = countRowsMissingFields(assetType, state.rows);
    if (missing > 0) {
      const ok = await showModal({
        message: `${missing} row(s) are missing required fields (highlighted in red). Download anyway?`,
        okText: 'Download Anyway',
        cancelText: 'Cancel',
      });
      if (!ok) return;
    }
    const csv = buildCsv(assetType, state.rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`freshservice-${assetType.id}-import-${today}.csv`, csv);
    els.openFreshserviceBtn.hidden = false;
  };
}

// ---------- Root render ----------

// Points at the live assetType/state from the most recent renderAll() call
// — so the row-search listener (wired once, outside the per-render toolbar
// closures) can re-render against the actual in-memory state being edited,
// not a fresh getState() read from localStorage that could be briefly
// behind a still-debounced save.
let currentAssetType = null;
let currentState = null;

function renderAll() {
  const assetType = getAssetType(activeTypeId);

  renderTabs();

  if (assetType.comingSoon) {
    els.typeDescription.textContent = '';
    els.activeSections.hidden = true;
    els.comingSoonPanel.hidden = false;
    const modelCount = (MODEL_PRESETS[assetType.id] || []).length;
    els.comingSoonMessage.textContent =
      `There's no Freshservice import template wired up for ${assetType.label} yet, so this tab isn't functional. ` +
      (modelCount > 0
        ? `${modelCount} product${modelCount === 1 ? '' : 's'} from your product export ${modelCount === 1 ? 'is' : 'are'} already catalogued in js/catalog.js and ready to use the moment a template is added.`
        : 'Once a template is added for this type, it will work like any other tab.');
    return;
  }

  els.activeSections.hidden = false;
  els.comingSoonPanel.hidden = true;

  const state = getState(activeTypeId);
  currentAssetType = assetType;
  currentState = state;
  els.typeDescription.textContent = `Fill in General and Hardware Specific details, bulk-add rows from pasted serial numbers, then fine-tune and download a CSV matching the Freshservice "${assetType.label}" import template.`;
  rowSearchQuery = '';
  if (els.rowSearch) els.rowSearch.value = '';
  selectedRowIds.clear();
  renderGeneralForm(assetType, state);
  renderHardwareForm(assetType, state);
  renderBulkForm(assetType, state);
  renderTable(assetType, state);
  wireToolbar(assetType, state);
}

const importEditIcon = document.getElementById('import-edit-icon');
if (importEditIcon) importEditIcon.innerHTML = iconSvg('upload');

const addRowsIcon = document.getElementById('add-rows-icon');
if (addRowsIcon) addRowsIcon.innerHTML = iconSvg('plus');

const clearRowsIcon = document.getElementById('clear-rows-icon');
if (clearRowsIcon) clearRowsIcon.innerHTML = iconSvg('close');

const downloadIcon = document.getElementById('download-icon');
if (downloadIcon) downloadIcon.innerHTML = iconSvg('download');

const persistenceWarningIcon = document.getElementById('persistence-warning-icon');
if (persistenceWarningIcon) persistenceWarningIcon.innerHTML = iconSvg('warning');
const persistenceWarningCloseIcon = document.getElementById('persistence-warning-close-icon');
if (persistenceWarningCloseIcon) persistenceWarningCloseIcon.innerHTML = iconSvg('close');
const persistenceCueIcon = document.getElementById('persistence-cue-icon');
if (persistenceCueIcon) persistenceCueIcon.innerHTML = iconSvg('warning');
if (els.persistenceWarningClose) {
  els.persistenceWarningClose.addEventListener('click', () => {
    els.persistenceWarning.hidden = true;
  });
}

// Lives outside #table-wrap (see index.html), so renderTable() rebuilding
// the table underneath it never touches this input or steals its focus —
// wired once here rather than per-render like the table's own controls.
let rowSearchDebounceTimer = null;
if (els.rowSearch) {
  els.rowSearch.addEventListener('input', () => {
    clearTimeout(rowSearchDebounceTimer);
    rowSearchDebounceTimer = setTimeout(() => {
      rowSearchQuery = els.rowSearch.value.trim();
      if (currentAssetType && currentState) renderTable(currentAssetType, currentState);
    }, 150);
  });
}

// #bulk-edit-wrap's own controls (field select, Apply, Clear Selection) —
// wired once here, same reasoning as #row-search above: the element lives
// outside #table-wrap so renderTable() never destroys or recreates it.
if (els.bulkEditField) {
  els.bulkEditField.addEventListener('change', () => {
    if (!currentAssetType) return;
    const col = bulkEditableColumns(currentAssetType).find((c) => c.key === els.bulkEditField.value);
    renderBulkEditValueWidget(col, '');
  });
}

if (els.bulkEditApplyBtn) {
  els.bulkEditApplyBtn.addEventListener('click', () => {
    if (!currentAssetType || !currentState || selectedRowIds.size === 0) return;
    const col = bulkEditableColumns(currentAssetType).find((c) => c.key === els.bulkEditField.value);
    if (!col) return;
    const widget = document.getElementById('bulk-edit-value');
    const value = widget ? widget.value : '';
    for (const row of currentState.rows) {
      if (!selectedRowIds.has(row.id)) continue;
      row[col.key] = value;
      // Company's own options list is closed (js/catalog.js) and Location's
      // valid choices depend on it — same reset the per-row Company select
      // does on change, so a bulk Company edit can't strand a row on a
      // Location that no longer belongs to it.
      if (col.key === 'company') row.location = locationOptionsForCompany(value)[0] || '';
    }
    persist(activeTypeId, currentState);
    selectedRowIds.clear();
    renderTable(currentAssetType, currentState);
  });
}

if (els.bulkEditClearBtn) {
  els.bulkEditClearBtn.addEventListener('click', () => {
    selectedRowIds.clear();
    if (currentAssetType && currentState) renderTable(currentAssetType, currentState);
  });
}

const openFreshserviceIcon = document.getElementById('open-freshservice-icon');
if (openFreshserviceIcon) openFreshserviceIcon.innerHTML = iconSvg('externalLink');
els.openFreshserviceBtn.onclick = () => window.open(FRESHSERVICE_IMPORT_URL, '_blank', 'noopener');

const FEEDBACK_EMAIL = 'danielbazeley95@gmail.com';
const feedbackLink = document.getElementById('feedback-link');
if (feedbackLink) {
  const version = document.querySelector('.version-badge')?.textContent?.trim() || '';
  const subject = encodeURIComponent('Bug Found/Feature Request');
  const body = encodeURIComponent(`Version: ${version}\n\nDescribe the bug or feature request:\n`);
  feedbackLink.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  document.getElementById('feedback-link-icon').innerHTML = iconSvg('mail');
  feedbackLink.addEventListener('click', () => {
    if (els.settingsDialog) els.settingsDialog.close();
  });
}

// ---------- Popout dialogs (Settings, Help, Release Notes) ----------

function wireInfoDialog(dialog, openers, closeBtn) {
  if (!dialog) return;
  for (const opener of openers) {
    if (opener) opener.addEventListener('click', () => dialog.showModal());
  }
  if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}

const settingsMenuBtn = document.getElementById('settings-menu-btn');
const settingsDialogClose = document.getElementById('settings-dialog-close');
if (settingsMenuBtn && els.settingsDialog && settingsDialogClose) {
  document.getElementById('settings-menu-btn-icon').innerHTML = iconSvg('settings');
  document.getElementById('settings-dialog-close-icon').innerHTML = iconSvg('close');
  wireInfoDialog(els.settingsDialog, [settingsMenuBtn], settingsDialogClose);
}

const helpBtn = document.getElementById('help-btn');
const helpDialog = document.getElementById('help-dialog');
const helpDialogClose = document.getElementById('help-dialog-close');
if (helpBtn && helpDialog && helpDialogClose) {
  document.getElementById('help-btn-icon').innerHTML = iconSvg('help');
  document.getElementById('help-dialog-close-icon').innerHTML = iconSvg('close');
  wireInfoDialog(helpDialog, [helpBtn], helpDialogClose);
}

const releaseNotesBtn = document.getElementById('release-notes-btn');
const releaseNotesDialog = document.getElementById('release-notes-dialog');
const releaseNotesClose = document.getElementById('release-notes-close');
const versionBadgeBtn = document.getElementById('version-badge-btn');
if (releaseNotesBtn && releaseNotesDialog && releaseNotesClose) {
  document.getElementById('release-notes-btn-icon').innerHTML = iconSvg('notes');
  document.getElementById('release-notes-close-icon').innerHTML = iconSvg('close');
  wireInfoDialog(releaseNotesDialog, [releaseNotesBtn, versionBadgeBtn], releaseNotesClose);
}

// Help and What's New both live inside #settings-dialog now — opening
// either should hand off from the settings menu rather than stacking a
// second modal <dialog> (with its own backdrop) on top of it. Not needed
// for version-badge-btn, which opens Release Notes directly from the page
// and is never nested inside the settings menu to begin with.
if (els.settingsDialog) {
  for (const opener of [helpBtn, releaseNotesBtn]) {
    if (opener) opener.addEventListener('click', () => els.settingsDialog.close());
  }
}

// ---------- Matrix theme's falling-character rain ----------

// A background ambience, not a foreground effect — every guard here exists
// so it doesn't get in the way of actually using the app: dim (low alpha,
// so it reads clearly behind panels without fighting their text), throttled
// well below 60fps (redraws every MATRIX_FRAME_INTERVAL ms, not every
// frame), paused via the Page Visibility API whenever the tab isn't
// visible, and skipped entirely under prefers-reduced-motion. Only ever
// running while [data-theme='matrix'] is actually selected — start/stop
// are called from applyTheme() below.
const MATRIX_CHARS =
  'アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789';
const MATRIX_FONT_SIZE = 16;
const MATRIX_FRAME_INTERVAL = 70;
const matrixCanvas = document.getElementById('matrix-rain');
let matrixCtx = null;
let matrixColumns = [];
let matrixFrameId = null;
let matrixLastFrameTime = 0;

function matrixResize() {
  if (!matrixCanvas) return;
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  const columnCount = Math.ceil(matrixCanvas.width / MATRIX_FONT_SIZE);
  matrixColumns = Array.from({ length: columnCount }, () => Math.random() * -100);
}

function matrixDraw(time) {
  matrixFrameId = requestAnimationFrame(matrixDraw);
  if (time - matrixLastFrameTime < MATRIX_FRAME_INTERVAL) return;
  matrixLastFrameTime = time;

  // A translucent black rect over the previous frame, rather than
  // clearing it outright, is what leaves the fading trail behind each
  // falling character instead of a hard-edged blink.
  matrixCtx.fillStyle = 'rgba(0, 0, 0, 0.08)';
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  matrixCtx.fillStyle = 'rgba(57, 255, 106, 0.45)';
  matrixCtx.font = `${MATRIX_FONT_SIZE}px monospace`;

  for (let i = 0; i < matrixColumns.length; i++) {
    const char = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
    const x = i * MATRIX_FONT_SIZE;
    const y = matrixColumns[i] * MATRIX_FONT_SIZE;
    matrixCtx.fillText(char, x, y);
    if (y > matrixCanvas.height && Math.random() > 0.975) {
      matrixColumns[i] = 0;
    } else {
      matrixColumns[i]++;
    }
  }
}

function startMatrixRain() {
  if (!matrixCanvas || matrixFrameId || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  matrixCtx = matrixCanvas.getContext('2d');
  matrixResize();
  window.addEventListener('resize', matrixResize);
  matrixLastFrameTime = 0;
  matrixFrameId = requestAnimationFrame(matrixDraw);
}

function stopMatrixRain() {
  if (matrixFrameId) {
    cancelAnimationFrame(matrixFrameId);
    matrixFrameId = null;
  }
  window.removeEventListener('resize', matrixResize);
  if (matrixCtx && matrixCanvas) {
    matrixCtx.clearRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.documentElement.getAttribute('data-theme') !== 'matrix') return;
  if (document.hidden) {
    stopMatrixRain();
  } else {
    startMatrixRain();
  }
});

// ---------- Theme selector ----------

// "System" (no stored value, or explicitly 'system') leaves no data-theme
// attribute at all, so css/styles.css's prefers-color-scheme media query
// decides — this only ever sets/clears the attribute for the explicit
// overrides listed in THEME_VALUES (kept in sync with the identical list
// in index.html's inline before-paint script, and with the <option>
// values in the Theme <select> itself). The inline script already applies
// a saved override before first paint (to avoid a flash of the wrong
// theme); this just keeps the <select> in sync and reacts to changes.
const THEME_KEY = 'fsai:v1:theme';
const THEME_VALUES = ['light', 'dark', 'vista', 'mac', 'xp', 'win31', 'matrix'];
const themeSelect = document.getElementById('theme-select');
if (themeSelect) {
  document.getElementById('theme-select-icon').innerHTML = iconSvg('theme');

  function applyTheme(value) {
    if (THEME_VALUES.includes(value)) {
      document.documentElement.setAttribute('data-theme', value);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (value === 'matrix') {
      startMatrixRain();
    } else {
      stopMatrixRain();
    }
  }

  const storedTheme = localStorage.getItem(THEME_KEY) || 'system';
  themeSelect.value = storedTheme;
  applyTheme(storedTheme);

  themeSelect.addEventListener('change', () => {
    localStorage.setItem(THEME_KEY, themeSelect.value);
    applyTheme(themeSelect.value);
  });
}

renderAll();

// ---------- Install as PWA ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => {});
  });
}

// The browser only offers a programmatic install prompt on Chromium-based
// browsers (Chrome/Edge/Android) via `beforeinstallprompt` — Safari (iOS
// and macOS) has no equivalent event, so this button simply never appears
// there; Add to Home Screen on iOS is still available through the native
// Share sheet, which the apple-touch-icon/apple-mobile-web-app-* tags in
// index.html's <head> are for.
let deferredInstallPrompt = null;
const installAppBtn = document.getElementById('install-app-btn');
if (installAppBtn) {
  document.getElementById('install-app-icon').innerHTML = iconSvg('install');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    installAppBtn.hidden = false;
  });

  installAppBtn.onclick = async () => {
    if (!deferredInstallPrompt) return;
    if (els.settingsDialog) els.settingsDialog.close();
    installAppBtn.hidden = true;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
  };

  window.addEventListener('appinstalled', () => {
    installAppBtn.hidden = true;
    deferredInstallPrompt = null;
  });
}
