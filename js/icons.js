// Small hand-authored 2D line icons (no icon font/library — keeps the app
// dependency-free). Each entry is the inner markup of a 24x24 stroke icon;
// app.js wraps it in an <svg> that inherits the surrounding text color, so
// these adapt automatically to light/dark theme and active/muted states.
// Keyed by asset type id (see ASSET_TYPES in js/templates.js).

export const ICONS = {
  monitor: `
    <rect x="3" y="4" width="18" height="12" rx="1.2"/>
    <line x1="8" y1="20" x2="16" y2="20"/>
    <line x1="12" y1="16" x2="12" y2="20"/>
  `,
  touchscreen: `
    <rect x="3" y="4" width="18" height="12" rx="1.2"/>
    <line x1="8" y1="20" x2="16" y2="20"/>
    <line x1="12" y1="16" x2="12" y2="20"/>
    <circle cx="12" cy="10" r="0.9" fill="currentColor" stroke="none"/>
    <path d="M9.8 10a2.2 2.2 0 014.4 0"/>
    <path d="M8.2 10a3.8 3.8 0 017.6 0"/>
  `,
  laptop_pc: `
    <path d="M6.5 5.5h11a1 1 0 011 1V14h-13V6.5a1 1 0 011-1z"/>
    <path d="M2.5 17.5h19l-1.3 1.8a2 2 0 01-1.6.7H5.4a2 2 0 01-1.6-.7L2.5 17.5z"/>
  `,
  desktop_pc: `
    <rect x="2.5" y="5" width="12" height="9" rx="1"/>
    <line x1="6" y1="17.5" x2="10.5" y2="17.5"/>
    <line x1="8.2" y1="14" x2="8.2" y2="17.5"/>
    <rect x="16.5" y="5" width="5" height="14" rx="1"/>
    <line x1="18" y1="9" x2="20" y2="9"/>
  `,
  tablet: `
    <rect x="6" y="2" width="12" height="20" rx="2"/>
    <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none"/>
  `,
  printer_copier: `
    <path d="M6.5 9V4.5h11V9"/>
    <rect x="4" y="9" width="16" height="7" rx="1"/>
    <rect x="7.5" y="15" width="9" height="6"/>
  `,
  phone_telephony: `
    <path d="M5 4.2c-0.6 3.2 0.6 6.5 3 9.8 2.4 3.2 5.3 5.2 8.5 6l1.4-2.9-3.2-1.7-1.7 1.4c-1.9-1.2-3.5-2.9-4.7-4.9l1.6-1.6-1.9-3.2-3-0.9z"/>
  `,
  wifi_access_point: `
    <path d="M4 9a12 12 0 0116 0"/>
    <path d="M7 12.4a7.6 7.6 0 0110 0"/>
    <path d="M10 15.8a3.2 3.2 0 014 0"/>
    <circle cx="12" cy="19" r="0.9" fill="currentColor" stroke="none"/>
  `,
  network_switch: `
    <circle cx="5" cy="6" r="2"/>
    <circle cx="19" cy="6" r="2"/>
    <circle cx="12" cy="18" r="2"/>
    <line x1="6.7" y1="7.3" x2="11" y2="16.3"/>
    <line x1="17.3" y1="7.3" x2="13" y2="16.3"/>
  `,
  server: `
    <rect x="4" y="4" width="16" height="6" rx="1"/>
    <rect x="4" y="14" width="16" height="6" rx="1"/>
    <circle cx="7.5" cy="7" r="0.7" fill="currentColor" stroke="none"/>
    <circle cx="7.5" cy="17" r="0.7" fill="currentColor" stroke="none"/>
  `,
  windows_server: `
    <rect x="4" y="4" width="16" height="6" rx="1"/>
    <rect x="4" y="14" width="16" height="6" rx="1"/>
    <line x1="14" y1="5.4" x2="14" y2="8.6"/>
    <line x1="12.4" y1="7" x2="15.6" y2="7"/>
    <circle cx="7.5" cy="17" r="0.7" fill="currentColor" stroke="none"/>
  `,
  docking_station: `
    <path d="M9 2.5v5"/>
    <path d="M15 2.5v5"/>
    <path d="M6 8h12v3a6 6 0 01-12 0V8z"/>
    <path d="M12 17v5"/>
  `,
  computer_generic: `
    <rect x="7" y="7" width="10" height="10" rx="1"/>
    <line x1="9" y1="3" x2="9" y2="7"/>
    <line x1="12" y1="3" x2="12" y2="7"/>
    <line x1="15" y1="3" x2="15" y2="7"/>
    <line x1="9" y1="17" x2="9" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <line x1="15" y1="17" x2="15" y2="21"/>
    <line x1="3" y1="9" x2="7" y2="9"/>
    <line x1="3" y1="12" x2="7" y2="12"/>
    <line x1="3" y1="15" x2="7" y2="15"/>
    <line x1="17" y1="9" x2="21" y2="9"/>
    <line x1="17" y1="12" x2="21" y2="12"/>
    <line x1="17" y1="15" x2="21" y2="15"/>
  `,
  hardware_other: `
    <path d="M14.8 6.2a4 4 0 00-5.4 5.4L4 17l3 3 5.4-5.4a4 4 0 005.4-5.4l-2.1 2.1-2-2 2.1-2.1z"/>
  `,
  menu: `
    <line x1="4" y1="7" x2="20" y2="7"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="17" x2="20" y2="17"/>
  `,
  close: `
    <line x1="6" y1="6" x2="18" y2="18"/>
    <line x1="18" y1="6" x2="6" y2="18"/>
  `,
  mail: `
    <rect x="3" y="5" width="18" height="14" rx="1.5"/>
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>
  `,
  upload: `
    <path d="M12 15V4"/>
    <path d="M7.5 8.5L12 4l4.5 4.5"/>
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>
  `,
  download: `
    <path d="M12 4v11"/>
    <path d="M7.5 10.5L12 15l4.5-4.5"/>
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>
  `,
};

export function iconSvg(key) {
  const inner = ICONS[key];
  if (!inner) return '';
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
