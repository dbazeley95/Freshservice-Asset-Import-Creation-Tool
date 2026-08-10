// CSV generation + small formatting/pattern helpers. No parsing needed since
// this tool only ever produces import files, never reads them back.

export function escapeCsvField(value) {
  const str = value === undefined || value === null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// <input type="date"> gives YYYY-MM-DD; Freshservice templates use DD/MM/YYYY.
export function formatDateForExport(isoDate) {
  if (!isoDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

export function buildCsv(assetType, rows) {
  const headerLine = assetType.columns.map((c) => escapeCsvField(c.header)).join(',');
  const lines = rows.map((row) =>
    assetType.columns
      .map((c) => {
        const raw = row[c.key];
        const value = c.input === 'date' ? formatDateForExport(raw) : raw;
        return escapeCsvField(value);
      })
      .join(',')
  );
  return [headerLine, ...lines].join('\r\n') + '\r\n';
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Applies a naming pattern with tokens:
//   {n}     sequence number, no padding
//   {n2} {n3} {n4} ...  sequence number zero-padded to that width
//   {serial}   the serial number for this row
//   {company} {location} {product}   current default values
export function applyNamePattern(pattern, n, ctx) {
  return pattern
    .replace(/\{n(\d)\}/g, (_, width) => String(n).padStart(Number(width), '0'))
    .replace(/\{n\}/g, String(n))
    .replace(/\{serial\}/g, ctx.serial ?? '')
    .replace(/\{company\}/g, ctx.company ?? '')
    .replace(/\{location\}/g, ctx.location ?? '')
    .replace(/\{product\}/g, ctx.product ?? '');
}
