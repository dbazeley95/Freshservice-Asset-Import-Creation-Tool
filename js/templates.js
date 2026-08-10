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
