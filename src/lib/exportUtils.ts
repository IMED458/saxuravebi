import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'მონაცემები');
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Export several named sheets into a single .xlsx workbook. */
export function exportSheets(sheets: { name: string; rows: any[] }[], filename: string) {
  const workbook = XLSX.utils.book_new();
  let appended = 0;
  sheets.forEach((s) => {
    const rows = s.rows && s.rows.length ? s.rows : [{ ' ': 'მონაცემები არ არის' }];
    const ws = XLSX.utils.json_to_sheet(rows);
    // Sheet names are limited to 31 chars and cannot contain some symbols.
    const safe = s.name.slice(0, 31).replace(/[\\/?*[\]:]/g, '');
    XLSX.utils.book_append_sheet(workbook, ws, safe || `Sheet${appended + 1}`);
    appended++;
  });
  if (appended === 0) return;
  XLSX.writeFile(workbook, `${filename}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCsv(data: any[], filename: string) {
  if (!data || data.length === 0) return;
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csvOutput = XLSX.utils.sheet_to_csv(worksheet);

  const blob = new Blob(['\uFEFF' + csvOutput], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
