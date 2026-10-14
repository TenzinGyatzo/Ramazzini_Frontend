/**
 * Indicador de pasos del formulario de documentos (FormStepper).
 * Con pocos pasos se muestra una barra por segmentos, uno por paso y con clic;
 * con muchos (p. ej. control prenatal) se conserva la barra continua.
 */

export const MAX_PASOS_SEGMENTADOS = 16;

/** Los documentos aún no organizados por secciones nombran sus pasos «Paso N». */
const NOMBRE_GENERICO = /^Paso \d+$/;

export function nombreDePaso(nombre: string | undefined | null): string | null {
  const limpio = (nombre ?? '').trim();
  if (!limpio || NOMBRE_GENERICO.test(limpio)) return null;
  return limpio;
}

export function usarPasosSegmentados(totalPasos: number): boolean {
  return totalPasos > 1 && totalPasos <= MAX_PASOS_SEGMENTADOS;
}

export type EstadoSegmento = 'previo' | 'actual' | 'pendiente' | 'completado';

/**
 * `pasoActual` puede valer `totalPasos + 1` (pantalla «¡Completado!»):
 * en ese caso todos los segmentos se ven completos.
 */
export function estadoSegmento(
  paso: number,
  pasoActual: number,
  totalPasos: number,
): EstadoSegmento {
  if (pasoActual > totalPasos) return 'completado';
  if (paso === pasoActual) return 'actual';
  return paso < pasoActual ? 'previo' : 'pendiente';
}
