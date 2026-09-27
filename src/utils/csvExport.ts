/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Utilidad para exportación de datos en formato CSV con soporte UTF-8 (BOM)
 */

export function downloadCSV(filename: string, headers: string[], rows: any[][]): void {
  if (typeof window === 'undefined') return;

  const csvContent = [
    headers.join(','),
    ...rows.map(row => 
      row.map(val => {
        const str = String(val === undefined || val === null ? '' : val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
