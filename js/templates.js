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

export const ASSET_TYPES = [
  {
    id: 'monitor',
    label: 'Monitor',
    columns: [
      col('name', 'Name', 'text', 'row'),
      col('company', 'Company', 'text', 'default', { group: 'general' }),
      col('location', 'Location', 'text', 'default', { group: 'general' }),
      col('serialNumber', 'Serial Number', 'text', 'row'),
      col('assetTag', 'Asset Tag', 'text', 'row'),
      col('product', 'Product', 'text', 'default', { group: 'hardware' }),
      col('monitorSize', 'Monitor Size (In Inches)', 'number', 'default', { group: 'hardware' }),
      col('warranty', 'Warranty* (in months)', 'number', 'default', { group: 'hardware' }),
      col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
      col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
      col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'touchscreen',
    label: 'Interactive Touchscreen',
    columns: [
      col('name', 'Name', 'text', 'row'),
      col('company', 'Company', 'text', 'default', { group: 'general' }),
      col('location', 'Location', 'text', 'default', { group: 'general' }),
      col('serialNumber', 'Serial Number', 'text', 'row'),
      col('assetTag', 'Asset Tag', 'text', 'row'),
      col('product', 'Product', 'text', 'default', { group: 'hardware' }),
      col('warranty', 'Warranty* (in months)', 'number', 'default', { group: 'hardware' }),
      col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
      col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
      col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'laptop_pc',
    label: 'Laptop',
    columns: [
      col('name', 'Name', 'text', 'row'),
      col('company', 'Company', 'text', 'default', { group: 'general' }),
      col('location', 'Location', 'text', 'default', { group: 'general' }),
      col('assetTag', 'Asset Tag', 'text', 'row'),
      col('product', 'Product', 'text', 'default', { group: 'hardware' }),
      col('serialNumber', 'Serial Number', 'text', 'row'),
      col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
      col('warranty', 'Warranty (In Months)', 'number', 'default', { group: 'hardware' }),
      col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
      col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
      col('processor', 'Processor', 'text', 'default', { group: 'hardware' }),
      col('memory', 'Memory(GB)', 'number', 'default', { group: 'hardware' }),
      col('disk', 'Disk Space(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'desktop_pc',
    label: 'Desktop',
    columns: [
      col('name', 'Name', 'text', 'row'),
      col('company', 'Company', 'text', 'default', { group: 'general' }),
      col('location', 'Location', 'text', 'default', { group: 'general' }),
      col('assetTag', 'Asset Tag', 'text', 'row'),
      col('product', 'Product', 'text', 'default', { group: 'hardware' }),
      col('serialNumber', 'Serial Number', 'text', 'row'),
      col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
      col('warranty', 'Warranty (In Months)', 'number', 'default', { group: 'hardware' }),
      col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
      col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
      col('processor', 'Processor', 'text', 'default', { group: 'hardware' }),
      col('memory', 'Memory(GB)', 'number', 'default', { group: 'hardware' }),
      col('disk', 'Disk Space(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  {
    id: 'tablet',
    label: 'iPads / Tablets',
    columns: [
      col('name', 'Display Name', 'text', 'row'),
      col('company', 'Company', 'text', 'default', { group: 'general' }),
      col('location', 'Location', 'text', 'default', { group: 'general' }),
      col('assetTag', 'Asset Tag', 'text', 'row'),
      col('product', 'Product', 'text', 'default', { group: 'hardware' }),
      col('serialNumber', 'Serial Number', 'text', 'row'),
      col('cost', 'Cost', 'number', 'default', { group: 'hardware' }),
      col('warranty', 'Warranty (In Months)', 'number', 'default', { group: 'hardware' }),
      col('assetState', 'Asset State', 'text', 'default', { group: 'hardware', datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default', { group: 'hardware' }),
      col('endOfLife', 'End of Life', 'date', 'default', { group: 'hardware' }),
      col('os', 'OS', 'text', 'default', { group: 'hardware' }),
      col('storage', 'Storage(GB)', 'number', 'default', { group: 'hardware' }),
    ],
  },
  // The types below don't have a Freshservice import template wired up
  // yet, so they have no columns and the app shows a "Coming soon"
  // message instead of Defaults/Bulk Add/Rows for them. Their Model
  // Presets already exist in js/catalog.js (MODEL_PRESETS[id]) so nothing
  // from a product export is lost — add the columns here once a real
  // template is available and they'll work like any other asset type.
  //
  // These ids/labels mirror the exact "Asset Type" values from a
  // Freshservice product export, so each one lines up with a real
  // Freshservice asset type rather than a guessed grouping.
  { id: 'printer_copier', label: 'Printers & Copiers', comingSoon: true, columns: [] },
  { id: 'phone_telephony', label: 'Phones & Telephony', comingSoon: true, columns: [] },
  { id: 'wifi_access_point', label: 'Wi-Fi Access Points', comingSoon: true, columns: [] },
  { id: 'network_switch', label: 'Network Switches', comingSoon: true, columns: [] },
  { id: 'server', label: 'Servers', comingSoon: true, columns: [] },
  { id: 'docking_station', label: 'Docking Stations', comingSoon: true, columns: [] },
  { id: 'computer_generic', label: 'Computer (Unspecified)', comingSoon: true, columns: [] },
  { id: 'hardware_other', label: 'Hardware (Uncategorised)', comingSoon: true, columns: [] },
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
