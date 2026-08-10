// Bundled catalogs for quick-fill dropdowns in the Defaults panel.
//
// This is deliberately just plain data — no admin UI, no server. To add,
// edit, or retire an entry, edit this file, commit, and push; GitHub Pages
// picks it up on the next deploy. Selecting a preset only pre-fills fields;
// every field stays freely editable afterwards, so a slightly-wrong preset
// never blocks you.

// One entry per site/building you buy for. `company` and `location` map
// straight onto the Company/Location columns.
export const LOCATION_PRESETS = [
  { id: 'st-clements', label: 'St Clements', company: 'St Clements', location: 'St Clements' },
  { id: 'the-marist', label: 'The Marist', company: 'The Marist', location: 'The Marist' },
];

// Keyed by asset type id (see js/templates.js). Each entry's `fields` only
// needs to set the keys that are meaningful for that model — anything not
// present in the asset type's columns is ignored, and anything you leave
// out (e.g. an unknown Cost) just leaves that field blank for you to fill
// in by hand. Field keys must match the `key` used in js/templates.js.
export const MODEL_PRESETS = {
  monitor: [
    {
      id: 'viewsonic-v226hql',
      label: 'ViewSonic V226HQL (22")',
      fields: { product: 'V226HQL', monitorSize: 22, warranty: 12, cost: 75 },
    },
    {
      id: 'acer-e2221hn',
      label: 'Acer E2221HN (22")',
      fields: { product: 'E2221HN', monitorSize: 22, warranty: 12, cost: 75 },
    },
  ],
  touchscreen: [
    {
      id: 'iiyama-prolite-te5564mis',
      label: 'Iiyama ProLite TE5564MIS',
      fields: { product: 'Prolite TE5564MIS', warranty: 12, cost: 1500 },
    },
  ],
  laptop_pc: [
    {
      id: 'toshiba-satellite-pro-c40',
      label: 'Toshiba Satellite Pro C40-H-111',
      fields: {
        product: 'SATELLITE PRO C40-H-111',
        processor: 'Intel(R) Core(TM) i5-1035G1',
        memory: 8,
        disk: 240,
        warranty: 12,
        cost: 400,
      },
    },
  ],
  desktop_pc: [
    {
      id: 'dell-pro-slim-qcs1250',
      label: 'Dell Pro Slim QCS1250',
      fields: {
        product: 'Dell Pro Slim QCS1250',
        memory: 16,
        disk: 512,
        // Processor/Warranty/Cost intentionally left out — fill these in
        // to match your actual order, then this preset will carry them
        // next time.
      },
    },
  ],
  tablet: [
    {
      id: 'ipad-a16',
      label: 'iPad (A16)',
      fields: { product: 'iPad (A16)', os: 'iPadOS', storage: 128, warranty: 12, cost: 350 },
    },
  ],
};
