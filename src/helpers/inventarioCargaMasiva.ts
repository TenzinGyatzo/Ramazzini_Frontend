import type {
  FilaCargaMasiva,
  Insumo,
} from '@/interfaces/inventario.interface';

export const MAX_FILAS_CARGA_MASIVA = 500;

/** Encabezados de la plantilla. Las cuatro últimas columnas son las que captura el usuario. */
export const ENCABEZADOS_PLANTILLA = [
  'Insumo',
  'Unidad',
  'Presentación',
  'Unidades por presentación',
  'Requiere lote',
  'Requiere caducidad',
  'Cantidad (unidades)',
  'Cantidad (presentaciones)',
  'Lote',
  'Caducidad (DD/MM/AAAA)',
] as const;

export const COLUMNA_LOTE = ENCABEZADOS_PLANTILLA.indexOf('Lote');

type Celda = string | number;

/** Hoja «Entradas»: encabezado y un renglón por insumo activo, listo para capturar. */
export function filasDePlantilla(insumos: Insumo[]): Celda[][] {
  return [
    [...ENCABEZADOS_PLANTILLA],
    ...insumos
      .filter((insumo) => insumo.activo)
      .map((insumo) => [
        insumo.nombre,
        insumo.unidad,
        insumo.presentacion ?? '',
        insumo.unidadesPorPresentacion,
        insumo.controlaLote ? 'Sí' : 'No',
        insumo.controlaCaducidad ? 'Sí' : 'No',
        '',
        '',
        '',
        '',
      ]),
  ];
}

export function instruccionesDePlantilla(): string[][] {
  return [
    ['Cómo llenar la plantilla'],
    ['1. Captura solo los renglones de los insumos que llegaron; deja en blanco los demás.'],
    ['2. Escribe la cantidad en unidades, en presentaciones (cajas), o en ambas: se suman.'],
    ['3. Si el insumo requiere lote, cópialo tal como viene en el empaque.'],
    ['4. Si requiere caducidad, escríbela como día/mes/año, por ejemplo 31/05/2027.'],
    ['5. No cambies los nombres de los insumos ni los encabezados.'],
    ['6. Para un insumo que no está en la lista, agrégalo primero al catálogo y descarga la plantilla de nuevo.'],
    ['7. Si un mismo insumo llegó en dos lotes, copia su renglón y captura cada lote por separado.'],
  ];
}

/**
 * Número de serie de fecha de Excel → `AAAA-MM-DD`. Se calcula sin zona horaria para
 * que la fecha no se recorra un día según el equipo.
 */
export function serialExcelAFecha(serial: number): string {
  const fecha = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  return fecha.toISOString().slice(0, 10);
}

function celdaATexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor).trim();
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/**
 * Lee la hoja (arreglo de renglones, tal como la entrega la librería de Excel) y
 * devuelve los renglones con algún dato, cada uno con su número de renglón en el archivo.
 * Las columnas se ubican por su encabezado, no por su posición.
 */
export function leerFilasDePlantilla(hoja: unknown[][]): {
  filas: FilaCargaMasiva[];
  error?: string;
} {
  const indiceEncabezado = hoja.findIndex((renglon) =>
    (renglon ?? []).some((celda) => normalizar(celdaATexto(celda)) === 'insumo'),
  );
  if (indiceEncabezado < 0) {
    return {
      filas: [],
      error:
        'No se encontró la columna «Insumo». Usa la plantilla descargada desde esta pantalla.',
    };
  }

  const encabezados = (hoja[indiceEncabezado] ?? []).map((celda) =>
    normalizar(celdaATexto(celda)),
  );
  const columna = (inicio: string) =>
    encabezados.findIndex((encabezado) => encabezado.startsWith(inicio));
  const col = {
    insumo: columna('insumo'),
    cantidad: columna('cantidad (unidades)'),
    presentaciones: columna('cantidad (presentaciones)'),
    lote: columna('lote'),
    caducidad: columna('caducidad'),
  };
  if (col.cantidad < 0 && col.presentaciones < 0) {
    return {
      filas: [],
      error:
        'No se encontraron las columnas de cantidad. Usa la plantilla descargada desde esta pantalla.',
    };
  }

  const filas: FilaCargaMasiva[] = [];
  hoja.slice(indiceEncabezado + 1).forEach((renglon, desplazamiento) => {
    const celda = (indice: number) =>
      indice >= 0 ? celdaATexto((renglon ?? [])[indice]) : '';
    const crudaCaducidad = col.caducidad >= 0 ? (renglon ?? [])[col.caducidad] : '';
    const fila: FilaCargaMasiva = {
      fila: indiceEncabezado + desplazamiento + 2,
      insumo: celda(col.insumo),
      cantidad: celda(col.cantidad),
      presentaciones: celda(col.presentaciones),
      lote: celda(col.lote),
      // Una celda con formato de fecha llega como número de serie
      caducidad:
        typeof crudaCaducidad === 'number'
          ? serialExcelAFecha(crudaCaducidad)
          : celdaATexto(crudaCaducidad),
    };
    const conDatos =
      fila.insumo || fila.cantidad || fila.presentaciones || fila.lote || fila.caducidad;
    if (conDatos) filas.push(fila);
  });

  if (filas.length > MAX_FILAS_CARGA_MASIVA) {
    return {
      filas: [],
      error: `El archivo tiene ${filas.length} renglones; el máximo por carga es ${MAX_FILAS_CARGA_MASIVA}.`,
    };
  }
  return { filas };
}
