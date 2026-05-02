import * as XLSX from 'xlsx';

export type ExcelSheetData = {
  name: string;
  data: Record<string, unknown>[];
};

export function exportToExcel(sheets: ExcelSheetData[], fileName: string) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(sheet.data, { header: Object.keys(sheet.data[0] || {}) });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  });

  XLSX.writeFile(workbook, fileName);
}

export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
}
