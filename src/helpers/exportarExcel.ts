import * as xlsx from 'xlsx';
import {
  cellValueForColumn,
  headerForKey,
  ordenarColumnasParaArchivo,
} from '@/helpers/exportarTrabajadoresColumnas';

export type ExportarTrabajadoresResult =
  | { ok: true; exportedColumnCount: number }
  | { ok: false; reason: 'no_columns' };

function esNumeroEmpleadoValido(numeroEmpleado: unknown): boolean {
  return (
    typeof numeroEmpleado === 'string' &&
    numeroEmpleado !== '-' &&
    numeroEmpleado !== '' &&
    /^\d{1,7}$/.test(numeroEmpleado)
  );
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function calcularAnchosColumnas(
  headers: string[],
  rows: Record<string, string | number>[],
): { wch: number }[] {
  return headers.map((header) => {
    let maxLen = header.length;
    for (const row of rows) {
      const cell = row[header];
      const len = cell == null ? 0 : String(cell).length;
      if (len > maxLen) maxLen = len;
    }
    return { wch: clamp(maxLen + 1, 8, 40) };
  });
}

/** Descarga filas ya armadas (encabezado → valor) como .xlsx, con filtro y encabezado fijo. */
export function descargarFilasExcel(
  filas: Record<string, string | number>[],
  nombreArchivo: string,
  nombreHoja: string,
): void {
  const headers = filas.length ? Object.keys(filas[0]) : [];
  const worksheet = xlsx.utils.json_to_sheet(filas, { header: headers });
  worksheet['!autofilter'] = { ref: worksheet['!ref'] || '' };
  worksheet['!cols'] = calcularAnchosColumnas(headers, filas);
  worksheet['!views'] = [
    { state: 'frozen', ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', workbookViewId: 0 },
  ];
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, nombreHoja);
  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(link.href);
}

/**
 * Exporta trabajadores a Excel con las columnas indicadas.
 * Se filtran por régimen y se ordenan como la plantilla de importación (ver `ordenarColumnasParaArchivo`).
 */
export function exportarTrabajadoresDesdeFrontend(
  trabajadoresFiltrados: any[],
  nombreArchivo = 'trabajadores.xlsx',
  columnKeys: string[] = [],
  isSIRES = false,
): ExportarTrabajadoresResult {
  const orderedKeys = ordenarColumnasParaArchivo(columnKeys, isSIRES);
  if (orderedKeys.length === 0) return { ok: false, reason: 'no_columns' };

  const tieneNumerosEmpleadoValidos = trabajadoresFiltrados.some((t) =>
    esNumeroEmpleadoValido(t.numeroEmpleado),
  );

  // Si Num. Trab. está seleccionado pero no hay valores válidos, omitir la columna en el archivo
  const keysParaArchivo = orderedKeys.filter(
    (k) => k !== 'numeroEmpleado' || tieneNumerosEmpleadoValidos,
  );
  if (keysParaArchivo.length === 0) return { ok: false, reason: 'no_columns' };

  const headers = keysParaArchivo.map(headerForKey);

  const trabajadoresData = trabajadoresFiltrados.map((trabajador) => {
    const row: Record<string, string | number> = {};
    for (const key of keysParaArchivo) {
      row[headerForKey(key)] = cellValueForColumn(trabajador, key);
    }
    return row;
  });

  const worksheet = xlsx.utils.json_to_sheet([]);
  xlsx.utils.sheet_add_json(worksheet, trabajadoresData, {
    origin: 'A1',
    skipHeader: false,
  });

  worksheet['!autofilter'] = {
    ref: worksheet['!ref'] || '',
  };
  worksheet['!cols'] = calcularAnchosColumnas(headers, trabajadoresData);
  worksheet['!views'] = [
    {
      state: 'frozen',
      ySplit: 1,
      topLeftCell: 'A2',
      activePane: 'bottomLeft',
      workbookViewId: 0,
    },
  ];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Trabajadores');

  const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = nombreArchivo;
  link.click();
  URL.revokeObjectURL(link.href);

  return { ok: true, exportedColumnCount: keysParaArchivo.length };
}

