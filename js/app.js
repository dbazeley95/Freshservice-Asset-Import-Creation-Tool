import { ASSET_TYPES, ASSET_STATE_SUGGESTIONS, defaultColumns, rowColumns } from './templates.js';
import { buildCsv, downloadCsv, applyNamePattern } from './csv.js';
import { loadState, saveState, clearState, loadSuggestions, addSuggestion } from './storage.js';
import { SITE_PRESETS, MODEL_PRESETS } from './catalog.js';
import { iconSvg } from './icons.js';

const ACTIVE_TYPE_KEY = 'fsai:v1:activeType';

const els = {
  tabs: document.getElementById('type-tabs'),
  defaultsForm: document.getElementById('defaults-form'),
  bulkForm: document.getElementById('bulk-form'),
  tableWrap: document.getElementById('table-wrap'),
  rowCount: document.getElementById('row-count'),
  downloadBtn: document.getElementById('download-btn'),
  addRowBtn: document.getElementById('add-row-btn'),
  clearRowsBtn: document.getElementById('clear-rows-btn'),
  typeDescription: document.getElementById('type-description'),
  activeSections: document.getElementById('active-sections'),
  comingSoonPanel: document.getElementById('coming-soon-panel'),
  comingSoonMessage: document.getElementById('coming-soon-message'),
  navToggle: document.getElementById('nav-toggle'),
  navBackdrop: document.getElementById('nav-backdrop'),
};

// Remembers the chosen Manufacturer filter per asset type for this page
// load only — not persisted, it's just a convenience for narrowing a long
// Model Preset list.
const modelFilterState = {};

let activeTypeId = localStorage.getItem(ACTIVE_TYPE_KEY) || 'desktop_pc';
let idCounter = 0;
const newRowId = () => `r${Date.now()}_${idCounter++}`;

function emptyState() {
  return {
    defaults: {},
    rows: [],
    nextN: 1,
    tagPrefix: '',
    namePattern: '',
  };
}

function getState(typeId) {
  return loadState(typeId) || emptyState();
}

function persist(typeId, state) {
  saveState(typeId, state);
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
}

// On mobile the side nav is a genuine off-canvas drawer (slides in over a
// backdrop), not an inline accordion — the .open class is what drives the
// slide-in transform in CSS. On wide screens the sidebar is always visible
// via a media query and these classes are simply irrelevant there.
const navToggleIcon = document.getElementById('nav-toggle-icon');
navToggleIcon.innerHTML = iconSvg('menu');

function openMobileNav() {
  els.tabs.classList.add('open');
  els.navBackdrop.classList.add('open');
  els.navToggle.setAttribute('aria-expanded', 'true');
  navToggleIcon.innerHTML = iconSvg('close');
  document.body.style.overflow = 'hidden';
}

function closeMobileNav() {
  els.tabs.classList.remove('open');
  els.navBackdrop.classList.remove('open');
  els.navToggle.setAttribute('aria-expanded', 'false');
  navToggleIcon.innerHTML = iconSvg('menu');
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

// ---------- Defaults panel ----------

function buildPresetField(labelText, id, options, onChange, formatOptionLabel = (o) => o.label) {
  const wrap = document.createElement('div');
  wrap.className = 'field';

  const label = document.createElement('label');
  label.textContent = labelText;
  label.htmlFor = id;
  wrap.appendChild(label);

  const select = document.createElement('select');
  select.id = id;

  const sortedOptions = [...options].sort((a, b) => a.label.localeCompare(b.label));
  for (const opt of sortedOptions) {
    const o = document.createElement('option');
    o.value = opt.id;
    o.textContent = formatOptionLabel(opt);
    select.appendChild(o);
  }
  // No blank/"Custom" placeholder option — leave the dropdown showing
  // nothing selected instead, so it never looks like a preset was already
  // applied when it wasn't.
  select.selectedIndex = -1;

  select.addEventListener('change', () => onChange(select.value));
  wrap.appendChild(select);
  return { wrap, select };
}

function applySitePreset(assetType, state, presetId) {
  const preset = SITE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return;
  state.defaults.company = preset.company;
  state.defaults.location = preset.location;
  addSuggestion('company', preset.company);
  addSuggestion('location', preset.location);
  persist(activeTypeId, state);
  renderDefaultsForm(assetType, state);
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
  renderDefaultsForm(assetType, state);
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
// field a catalogued asset type adds above Shared Defaults.
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
    renderDefaultsForm(assetType, state);
  });

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Narrows the Product suggestions below. Pick a suggested Product to auto-fill Warranty/Cost/specs for that model.';
  wrap.appendChild(hint);

  return wrap;
}

function renderDefaultsForm(assetType, state) {
  els.defaultsForm.innerHTML = '';
  const suggestions = loadSuggestions();

  els.defaultsForm.appendChild(
    buildPresetField('Company / Location Preset', 'def-preset-site', SITE_PRESETS, (val) =>
      applySitePreset(assetType, state, val)
    ).wrap
  );

  const modelPresets = MODEL_PRESETS[assetType.id] || [];

  for (const col of defaultColumns(assetType)) {
    const wrap = document.createElement('div');
    wrap.className = 'field';

    const label = document.createElement('label');
    label.textContent = col.header + (col.required ? ' *' : '');
    label.htmlFor = `def-${col.key}`;
    wrap.appendChild(label);

    const input = document.createElement('input');
    input.id = `def-${col.key}`;
    input.type = col.input === 'date' ? 'date' : col.input === 'number' ? 'number' : 'text';
    if (col.input === 'number') input.step = 'any';
    input.value = state.defaults[col.key] ?? '';

    if (col.key === 'assetState') {
      input.setAttribute('list', 'dl-asset-state');
    } else if (col.key === 'product' && modelPresets.length > 0) {
      const listId = `dl-${assetType.id}-product-catalog`;
      input.setAttribute('list', listId);
      const options = productCatalogOptions(modelPresets, modelFilterState[assetType.id] || '');
      wrap.appendChild(buildDatalist(listId, options));
    } else if (col.input === 'text') {
      const listId = `dl-${assetType.id}-${col.key}`;
      input.setAttribute('list', listId);
      wrap.appendChild(buildDatalist(listId, suggestions[col.key] || []));
    }

    input.addEventListener('input', () => {
      state.defaults[col.key] = input.value;
      debouncedPersist(activeTypeId, state);
    });
    input.addEventListener('change', () => {
      if (col.input !== 'text' || !input.value.trim()) return;
      addSuggestion(col.key, input.value.trim());
      if (col.key === 'product' && modelPresets.length > 0) {
        const preset = modelPresets.find((p) => p.fields.product === input.value);
        if (preset) applyModelPresetFields(assetType, state, preset);
      }
    });

    wrap.appendChild(input);

    // Manufacturer sits directly above Product, stacked in the same grid
    // cell — it exists purely to narrow Product's suggestions, so the two
    // stay visually paired rather than Manufacturer living up with the
    // other presets.
    if (col.key === 'product') {
      const manufacturerField = renderManufacturerFilterField(assetType, state);
      if (manufacturerField) {
        const group = document.createElement('div');
        group.className = 'field-group';
        group.appendChild(manufacturerField);
        group.appendChild(wrap);
        els.defaultsForm.appendChild(group);
        continue;
      }
    }

    els.defaultsForm.appendChild(wrap);
  }
}

function buildDatalist(id, options) {
  const dl = document.createElement('datalist');
  dl.id = id;
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt;
    dl.appendChild(o);
  }
  return dl;
}

// ---------- Bulk add panel ----------

function renderBulkForm(assetType, state) {
  els.bulkForm.innerHTML = '';

  const serialsField = document.createElement('div');
  serialsField.className = 'field field-wide';
  serialsField.innerHTML = `<label for="bulk-serials">Serial Numbers (one per line)</label>`;
  const textarea = document.createElement('textarea');
  textarea.id = 'bulk-serials';
  textarea.rows = 6;
  textarea.placeholder = 'Paste one serial number per line\ne.g.\nLL7QX4MQ9N\nLXQL7XR217\n...';
  serialsField.appendChild(textarea);
  els.bulkForm.appendChild(serialsField);

  const tagField = document.createElement('div');
  tagField.className = 'field';
  tagField.innerHTML = `<label for="bulk-tag-prefix">Asset Tag Prefix</label>`;
  const tagInput = document.createElement('input');
  tagInput.type = 'text';
  tagInput.id = 'bulk-tag-prefix';
  tagInput.placeholder = 'e.g. SCL-';
  tagInput.value = state.tagPrefix || '';
  tagInput.addEventListener('input', () => {
    state.tagPrefix = tagInput.value;
    debouncedPersist(activeTypeId, state);
  });
  tagField.appendChild(tagInput);
  els.bulkForm.appendChild(tagField);

  const patternField = document.createElement('div');
  patternField.className = 'field';
  patternField.innerHTML = `<label for="bulk-name-pattern">Name Pattern</label>`;
  const patternInput = document.createElement('input');
  patternInput.type = 'text';
  patternInput.id = 'bulk-name-pattern';
  patternInput.placeholder = 'e.g. ICTSUITE Monitor {n} or MAR-{n2}';
  patternInput.value = state.namePattern || '';
  patternInput.addEventListener('input', () => {
    state.namePattern = patternInput.value;
    debouncedPersist(activeTypeId, state);
  });
  patternField.appendChild(patternInput);
  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = '{n} = sequence number, {n2}/{n3} = zero-padded, {serial}/{company}/{location}/{product} also available.';
  patternField.appendChild(hint);
  els.bulkForm.appendChild(patternField);

  const startField = document.createElement('div');
  startField.className = 'field';
  startField.innerHTML = `<label for="bulk-start-n">Starting Number</label>`;
  const startInput = document.createElement('input');
  startInput.type = 'number';
  startInput.id = 'bulk-start-n';
  startInput.value = state.nextN;
  startField.appendChild(startInput);
  els.bulkForm.appendChild(startField);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'primary';
  addBtn.textContent = 'Add Rows from Serials';
  addBtn.addEventListener('click', () => {
    const serials = textarea.value
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (serials.length === 0) return;

    let n = Number(startInput.value) || 1;
    for (const serial of serials) {
      const row = { id: newRowId() };
      for (const col of defaultColumns(assetType)) {
        row[col.key] = state.defaults[col.key] ?? '';
      }
      row.serialNumber = serial;
      row.assetTag = (state.tagPrefix || '') + serial;
      row.name = state.namePattern
        ? applyNamePattern(state.namePattern, n, {
            serial,
            company: state.defaults.company,
            location: state.defaults.location,
            product: state.defaults.product,
          })
        : '';
      state.rows.push(row);
      n += 1;
    }
    state.nextN = n;
    textarea.value = '';
    persist(activeTypeId, state);
    renderTable(assetType, state);
    renderBulkForm(assetType, state);
  });
  els.bulkForm.appendChild(addBtn);
}

// ---------- Table ----------

function isRowInvalid(assetType, row, col) {
  if (!col.required) return false;
  return !String(row[col.key] ?? '').trim();
}

function renderTable(assetType, state) {
  els.tableWrap.innerHTML = '';
  els.rowCount.textContent = `${state.rows.length} row${state.rows.length === 1 ? '' : 's'}`;

  if (state.rows.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No rows yet. Add rows from pasted serial numbers, or add a blank row to enter one manually.';
    els.tableWrap.appendChild(empty);
    return;
  }

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
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
  const suggestions = loadSuggestions();

  for (const row of state.rows) {
    const tr = document.createElement('tr');
    tr.dataset.rowId = row.id;
    for (const col of assetType.columns) {
      const td = document.createElement('td');
      const input = document.createElement('input');
      input.type = col.input === 'date' ? 'date' : col.input === 'number' ? 'number' : 'text';
      if (col.input === 'number') input.step = 'any';
      input.value = row[col.key] ?? '';
      input.dataset.key = col.key;
      if (isRowInvalid(assetType, row, col)) input.classList.add('invalid');

      if (col.key === 'assetState') {
        input.setAttribute('list', 'dl-asset-state');
      }

      input.addEventListener('input', () => {
        row[col.key] = input.value;
        input.classList.toggle('invalid', isRowInvalid(assetType, row, col));
        debouncedPersist(activeTypeId, state);
      });
      input.addEventListener('change', () => {
        if (col.input === 'text' && col.source === 'default' && input.value.trim()) {
          addSuggestion(col.key, input.value.trim());
        }
      });

      td.appendChild(input);
      tr.appendChild(td);
    }

    const tdActions = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => {
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
  void suggestions;
}

// ---------- Toolbar actions ----------

function wireToolbar(assetType, state) {
  els.addRowBtn.onclick = () => {
    const row = { id: newRowId() };
    for (const col of assetType.columns) {
      row[col.key] = col.source === 'default' ? state.defaults[col.key] ?? '' : '';
    }
    state.rows.push(row);
    persist(activeTypeId, state);
    renderTable(assetType, state);
  };

  els.clearRowsBtn.onclick = () => {
    if (state.rows.length === 0) return;
    const ok = confirm(`Delete all ${state.rows.length} row(s) for ${assetType.label}? This cannot be undone.`);
    if (!ok) return;
    state.rows = [];
    persist(activeTypeId, state);
    renderTable(assetType, state);
  };

  els.downloadBtn.onclick = () => {
    if (state.rows.length === 0) {
      alert('Add at least one row before downloading.');
      return;
    }
    const missing = state.rows.reduce((count, row) => {
      const rowMissing = assetType.columns.some((c) => isRowInvalid(assetType, row, c));
      return count + (rowMissing ? 1 : 0);
    }, 0);
    if (missing > 0) {
      const ok = confirm(
        `${missing} row(s) are missing required fields (highlighted in red). Download anyway?`
      );
      if (!ok) return;
    }
    const csv = buildCsv(assetType, state.rows);
    const today = new Date().toISOString().slice(0, 10);
    downloadCsv(`freshservice-${assetType.id}-import-${today}.csv`, csv);
  };
}

// ---------- Root render ----------

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
  els.typeDescription.textContent = `Fill in shared defaults, bulk-add rows from pasted serial numbers, then fine-tune and download a CSV matching the Freshservice "${assetType.label}" import template.`;
  renderDefaultsForm(assetType, state);
  renderBulkForm(assetType, state);
  renderTable(assetType, state);
  wireToolbar(assetType, state);
}

document.getElementById('dl-asset-state-holder').appendChild(
  buildDatalist('dl-asset-state', ASSET_STATE_SUGGESTIONS)
);

renderAll();
