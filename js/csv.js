// CSV generation + small formatting helpers.

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
