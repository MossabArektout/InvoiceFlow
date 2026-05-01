const escapeCsvValue = (value: unknown) => {
  const raw = value == null ? '' : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
};

export const toCsv = (headers: string[], rows: Array<Array<unknown>>) => {
  const headerLine = headers.map(escapeCsvValue).join(',');
  const bodyLines = rows.map((row) => row.map(escapeCsvValue).join(','));
  return [headerLine, ...bodyLines].join('\n');
};
