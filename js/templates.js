// Column/schema definitions for each Freshservice asset import template.
// `header` strings are copied verbatim from the real Freshservice import
// templates so generated CSVs match column-for-column.
//
// col.source:
//   'row'     -> unique per asset (Name, Serial Number, Asset Tag)
//   'default' -> usually shared across a batch, editable per row afterwards
//
// col.group (only on 'default' columns) splits the Defaults panel in two:
//   'general'  -> Company/Location — which site this batch belongs to
//   'hardware' -> everything else — what the hardware itself is/costs

function col(key, header, input, source, opts = {}) {
  return { key, header, input, source, required: true, ...opts };
}

// The field set/order every asset type shares, in one place — every
// template below either uses this as-is or spreads it and appends its own
// type-specific fields after End of Life (Processor/Memory/Disk, Screen
// Size, OS/Storage, etc.). Before this existed, each template was hand-typed
// independently and drifted out of sync with the others (TV / Digital
// Signage and Projectors both shipped with End of Life in the wrong place)
// — building every template from this one list makes that class of mistake
// structurally impossible going forward. `nameHeader` exists only for
// Tablet, whose real Freshservice header is "Display Name" rather than
// "Name".
function standardColumns({ nameHeader = 'Name' } = {}) {
  return [
    col('name', nameHeader, 'text', 'row'),
    col('company', 'Company', 'text', 'default', { group: 'general' }),
    col('location', 'Location', 'text', 'default', { group: 'general' }),
    col('assetTag', 'Asset Tag', 'text', 'row'),
    col('product', 'Product', 'text', 'default', { group: 'hardware' }),
    col('serialNumber', 'Serial Number', 'text', 'row'),
    col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
    col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
    col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
    col('warranty', 'Warranty (In Months)', 'number', 'default', { group: 'hardware' }),
    col('warrantyExpiry', 'Warranty Expiry Date', 'date', 'default', { group: 'hardware' }),
    col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
  ];
}

export const ASSET_TYPES = [
  {
    id: 'monitor',
    label: 'Monitor',
    columns: [...standardColumns(), col('monitorSize', 'Monitor Size (In Inches)', 'number', 'default', { group: 'hardware' })],
  },
  {
    id: 'touchscreen',
    label: 'Interactive Touchscreen',
    columns: standardColumns(),
  },
  {
    id: 'tv_digital_signage',
    label: 'TV / Digital Signage',
    columns: [...standardColumns(), col('screenSize', 'Screen Size (In Inches)', 'number', 'default', { group: 'hardware' })],
  },
  {
    id: 'projector',
    label: 'Projectors',
    columns: standardColumns(),
  },
  {
    id: 'laptop_pc',
    label: 'Laptop',
    columns: [
      ...standardColumns(),
      col('processor', 'Processor', 'text', 'default', { group: 'hardware' }),
      col('memory', 'Memory(GB)', 'number', 'default', { group: 'hardware' }),
      col('disk', 'Disk Space(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'desktop_pc',
    label: 'Desktop',
    columns: [
      ...standardColumns(),
      col('processor', 'Processor', 'text', 'default', { group: 'hardware' }),
      col('memory', 'Memory(GB)', 'number', 'default', { group: 'hardware' }),
      col('disk', 'Disk Space(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'tablet',
    label: 'iPads / Tablets',
    columns: [
      ...standardColumns({ nameHeader: 'Display Name' }),
      col('os', 'OS', 'text', 'default', { group: 'hardware' }),
      col('storage', 'Storage(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'wifi_access_point',
    label: 'Wi-Fi Access Points',
    columns: standardColumns(),
  },
  {
    id: 'network_switch',
    label: 'Network Switches',
    columns: standardColumns(),
  },
  {
    id: 'phone_telephony',
    label: 'Phones & Telephony',
    columns: [...standardColumns(), col('extension', 'Extension', 'text', 'row', { required: false })],
  },
  {
    id: 'printer_copier',
    label: 'Printers & Copiers',
    columns: [...standardColumns(), col('ipAddress', 'IP Address', 'text', 'default', { group: 'hardware', required: false })],
  },
  {
    id: 'server',
    label: 'Servers',
    columns: [
      ...standardColumns(),
      col('memory', 'Memory(GB)', 'number', 'default', { group: 'hardware' }),
      col('disk', 'Disk Space(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'ups',
    label: 'UPS',
    columns: standardColumns(),
  },
  // Kept last among the working tabs (rather than up with the other
  // real device types) — it's a catch-all bucket that shouldn't be
  // anyone's first choice, so it's deliberately out of the way.
  {
    id: 'hardware_other',
    label: 'Other Devices',
    columns: standardColumns(),
  },
  {
    id: 'docking_station',
    label: 'Docking Stations',
    columns: standardColumns(),
  },
];

export const ASSET_STATE_SUGGESTIONS = [
  'In Use',
  'In Stock',
  'In Repair',
  'On Lease',
  'Missing',
  'Retired',
  'Disposed',
];

export function getAssetType(id) {
  return ASSET_TYPES.find((t) => t.id === id);
}

export function defaultColumns(assetType) {
  return assetType.columns.filter((c) => c.source === 'default');
}

export function rowColumns(assetType) {
  return assetType.columns.filter((c) => c.source === 'row');
}

export function generalColumns(assetType) {
  return assetType.columns.filter((c) => c.source === 'default' && c.group === 'general');
}

export function hardwareColumns(assetType) {
  return assetType.columns.filter((c) => c.source === 'default' && c.group === 'hardware');
}

// 'row' columns beyond the three every type already has (Name, Serial
// Number, Asset Tag — the last one always computed, never typed) are
// genuinely per-device fields, like Phones & Telephony's Extension. Bulk
// Add lets you paste them as extra comma/tab-separated values per line —
// see splitBulkLine in app.js — rather than treating them as a shared
// batch default the way Cost/Warranty/etc. work.
export function extraRowColumns(assetType) {
  return rowColumns(assetType).filter((c) => !['name', 'serialNumber', 'assetTag'].includes(c.key));
}
