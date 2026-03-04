/**
 * Generic CSV export utility for admin analytics.
 *
 * Generates a CSV file and triggers a browser download.
 */

function escapeCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a CSV string from column headers and row data.
 */
export function buildCsvString(
  columns: string[],
  rows: string[][]
): string {
  const header = columns.map(escapeCell).join(",");
  const body = rows
    .map((row) => row.map(escapeCell).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

/**
 * Download a CSV file in the browser.
 *
 * @param columns - Column headers
 * @param rows - Array of string arrays (each row's cell values)
 * @param filename - Download filename (without extension)
 */
export function exportToCsv(
  columns: string[],
  rows: string[][],
  filename: string
): void {
  const csv = buildCsvString(columns, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
