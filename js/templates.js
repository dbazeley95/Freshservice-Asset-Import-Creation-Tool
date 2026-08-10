// Column/schema definitions for each Freshservice asset import template.
// `header` strings are copied verbatim from the real Freshservice import
// templates so generated CSVs match column-for-column.
//
// col.source:
//   'row'     -> unique per asset (Name, Serial Number, Asset Tag)
//   'default' -> usually shared across a batch, editable per row afterwards

function col(key, header, input, source, opts = {}) {
  return { key, header, input, source, ...opts };
}

export const ASSET_TYPES = [
  {
    id: 'monitor',
    label: 'Monitor',
    icon: '🖵',
    columns: [
      col('name', 'Name', 'text', 'row', { required: true }),
      col('company', 'Company', 'text', 'default', { required: true }),
      col('location', 'Location', 'text', 'default', { required: true }),
      col('serialNumber', 'Serial Number', 'text', 'row', { required: true }),
      col('assetTag', 'Asset Tag', 'text', 'row', { required: true }),
      col('product', 'Product', 'text', 'default', { required: true }),
      col('monitorSize', 'Monitor Size (In Inches)', 'number', 'default'),
      col('warranty', 'Warranty* (in months)', 'number', 'default'),
      col('assetState', 'Asset State', 'text', 'default', { datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default'),
      col('endOfLife', 'End of Life', 'date', 'default', { required: true }),
      col('cost', 'Cost', 'number', 'default'),
    ],
  },
  {
    id: 'touchscreen',
    label: 'Interactive Touchscreen',
    icon: '🖐️',
    columns: [
      col('name', 'Name', 'text', 'row', { required: true }),
      col('company', 'Company', 'text', 'default', { required: true }),
      col('location', 'Location', 'text', 'default', { required: true }),
      col('serialNumber', 'Serial Number', 'text', 'row', { required: true }),
      col('assetTag', 'Asset Tag', 'text', 'row', { required: true }),
      col('product', 'Product', 'text', 'default', { required: true }),
      col('warranty', 'Warranty* (in months)', 'number', 'default'),
      col('assetState', 'Asset State', 'text', 'default', { datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default'),
      col('endOfLife', 'End of Life', 'date', 'default', { required: true }),
      col('cost', 'Cost', 'number', 'default'),
    ],
  },
  {
    id: 'laptop_pc',
    label: 'Laptop / PC',
    icon: '💻',
    columns: [
      col('name', 'Name', 'text', 'row', { required: true }),
      col('company', 'Company', 'text', 'default', { required: true }),
      col('location', 'Location', 'text', 'default', { required: true }),
      col('assetTag', 'Asset Tag', 'text', 'row', { required: true }),
      col('product', 'Product', 'text', 'default', { required: true }),
      col('serialNumber', 'Serial Number', 'text', 'row', { required: true }),
      col('cost', 'Cost', 'number', 'default'),
      col('warranty', 'Warranty (In Months)', 'number', 'default'),
      col('assetState', 'Asset State', 'text', 'default', { datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default'),
      col('endOfLife', 'End of Life', 'date', 'default', { required: true }),
      col('processor', 'Processor', 'text', 'default'),
      col('memory', 'Memory(GB)', 'number', 'default'),
      col('disk', 'Disk Space(GB)', 'number', 'default'),
    ],
  },
  {
    id: 'desktop_pc',
    label: 'Desktop PC',
    icon: '🖥️',
    columns: [
      col('name', 'Name', 'text', 'row', { required: true }),
      col('company', 'Company', 'text', 'default', { required: true }),
      col('location', 'Location', 'text', 'default', { required: true }),
      col('assetTag', 'Asset Tag', 'text', 'row', { required: true }),
      col('product', 'Product', 'text', 'default', { required: true }),
      col('serialNumber', 'Serial Number', 'text', 'row', { required: true }),
      col('cost', 'Cost', 'number', 'default'),
      col('warranty', 'Warranty (In Months)', 'number', 'default'),
      col('assetState', 'Asset State', 'text', 'default', { datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default'),
      col('endOfLife', 'End of Life', 'date', 'default', { required: true }),
      col('processor', 'Processor', 'text', 'default'),
      col('memory', 'Memory(GB)', 'number', 'default'),
      col('disk', 'Disk Space(GB)', 'number', 'default'),
    ],
  },
  {
    id: 'tablet',
    label: 'Tablet',
    icon: '📱',
    columns: [
      col('name', 'Display Name', 'text', 'row', { required: true }),
      col('company', 'Company', 'text', 'default', { required: true }),
      col('location', 'Location', 'text', 'default', { required: true }),
      col('assetTag', 'Asset Tag', 'text', 'row', { required: true }),
      col('product', 'Product', 'text', 'default', { required: true }),
      col('serialNumber', 'Serial Number', 'text', 'row', { required: true }),
      col('cost', 'Cost', 'number', 'default'),
      col('warranty', 'Warranty (In Months)', 'number', 'default'),
      col('assetState', 'Asset State', 'text', 'default', { datalist: 'assetStates' }),
      col('acquisitionDate', 'Acquisition Date', 'date', 'default'),
      col('endOfLife', 'End of Life', 'date', 'default', { required: true }),
      col('os', 'OS', 'text', 'default'),
      col('storage', 'Storage(GB)', 'number', 'default'),
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
  { id: 'printer_copier', label: 'Printers & Copiers', icon: '🖨️', comingSoon: true, columns: [] },
  { id: 'phone_telephony', label: 'Phones & Telephony', icon: '☎️', comingSoon: true, columns: [] },
  { id: 'wifi_access_point', label: 'Wi-Fi Access Points', icon: '📶', comingSoon: true, columns: [] },
  { id: 'network_switch', label: 'Network Switches', icon: '🔀', comingSoon: true, columns: [] },
  { id: 'server', label: 'Servers', icon: '🖧', comingSoon: true, columns: [] },
  { id: 'windows_server', label: 'Windows Servers', icon: '🪟', comingSoon: true, columns: [] },
  { id: 'docking_station', label: 'Docking Stations', icon: '🔌', comingSoon: true, columns: [] },
  { id: 'computer_generic', label: 'Computer (Unspecified)', icon: '❓', comingSoon: true, columns: [] },
  { id: 'hardware_other', label: 'Hardware (Uncategorised)', icon: '🧰', comingSoon: true, columns: [] },
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
