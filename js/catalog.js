// Bundled catalogs for quick-fill dropdowns in the Defaults panel.
//
// This is deliberately just plain data — no admin UI, no server. To add,
// edit, or retire an entry, edit this file, commit, and push; GitHub Pages
// picks it up on the next deploy. Selecting a preset only pre-fills fields;
// every field stays freely editable afterwards, so a slightly-wrong preset
// never blocks you.

// One entry per Company. `company` maps straight onto the Company column.
export const COMPANY_PRESETS = [
  { id: 'cardinal-newman', label: 'Cardinal Newman', company: 'Cardinal Newman' },
  { id: 'holy-family', label: 'Holy Family', company: 'Holy Family' },
  { id: 'st-albans', label: 'St Albans', company: 'St Albans' },
  { id: 'st-annes', label: 'St Annes', company: 'St Annes' },
  { id: 'st-augustines', label: 'St Augustines', company: 'St Augustines' },
  { id: 'st-charles-borromeo', label: 'St Charles Borromeo', company: 'St Charles Borromeo' },
  { id: 'st-cuthbert-mayne', label: 'St Cuthbert Mayne', company: 'St Cuthbert Mayne' },
  { id: 'st-cuthberts', label: 'St Cuthberts', company: 'St Cuthberts' },
  { id: 'st-edmunds', label: 'St Edmunds', company: 'St Edmunds' },
  { id: 'st-hugh-of-lincoln', label: 'St Hugh of Lincoln', company: 'St Hugh of Lincoln' },
  { id: 'st-josephs-guildford', label: 'St Josephs (Guildford)', company: 'St Josephs (Guildford)' },
  { id: 'st-polycarps', label: 'St Polycarps', company: 'St Polycarps' },
  { id: 'st-thomas-of-canterbury', label: 'St Thomas of Canterbury', company: 'St Thomas of Canterbury' },
  { id: 'the-marist', label: 'The Marist', company: 'The Marist' },
  { id: 'sjb', label: 'SJB', company: 'SJB' },
  { id: 'salesian-school', label: 'Salesian School', company: 'Salesian School' },
  { id: 'xavier-cet', label: 'Xavier CET', company: 'Xavier CET' },
  { id: 'sjb-safe', label: 'SJB - SAfE', company: 'SJB - SAfE' },
  { id: 'sjb-mathshub', label: 'SJB - Mathshub', company: 'SJB - Mathshub' },
  { id: 'st-francis', label: 'St Francis', company: 'St Francis' },
  { id: 'st-clements', label: 'St Clements', company: 'St Clements' },
  { id: 'st-josephs-redhill', label: 'St Josephs (Redhill)', company: 'St Josephs (Redhill)' },
  { id: 'st-peters-leatherhead', label: 'St Peters (Leatherhead)', company: 'St Peters (Leatherhead)' },
  { id: 'st-josephs-dorking', label: 'St Josephs (Dorking)', company: 'St Josephs (Dorking)' },
];

// One entry per site/building. `location` maps straight onto the Location
// column. There's no easy way to export a real locations list from
// Freshservice yet, so this temporarily mirrors COMPANY_PRESETS. Once a
// real locations list is available, replace this with its own array (same
// shape as COMPANY_PRESETS, using `location` instead of `company`).
export const LOCATION_PRESETS = COMPANY_PRESETS.map((c) => ({
  id: c.id,
  label: c.label,
  location: c.company,
}));

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
