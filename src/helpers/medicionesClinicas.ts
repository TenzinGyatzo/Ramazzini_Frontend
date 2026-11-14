/**
 * Mediciones clínicas (peso, altura, signos vitales…): los pasos abren vacíos y solo se
 * guarda lo que se midió. Sin medición no hay categoría («Óptima», «Sobrepeso»…).
 * Espec: docs/mediciones-sin-valores-por-defecto-propuesta.md
 */

/** Hay un número capturado (un campo vacío llega como '', null o undefined). */
export function esMedicion(valor: unknown): boolean {
  if (valor === undefined || valor === null || valor === '') return false;
  return Number.isFinite(Number(valor));
}

/** IMC redondeado a dos decimales, o null si falta el peso o la altura. */
export function imcDesdePesoAltura(peso: unknown, altura: unknown): number | null {
  if (!esMedicion(peso) || !esMedicion(altura)) return null;
  const p = Number(peso);
  const a = Number(altura);
  if (p <= 0 || a <= 0) return null;
  return Math.round((p / a ** 2) * 100) / 100;
}

/** «13 de octubre de 2026» a partir de la fecha de un documento. */
export function fechaLegible(fecha: string | undefined | null): string {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Mediciones opcionales (seguimiento cardiometabólico): de cada grupo se envía solo lo
 * capturado; un grupo sin ninguna medición no se envía.
 */
export function quitarMedicionesVacias<T extends Record<string, any>>(datos: T, grupos: string[]): T {
  const o: Record<string, any> = { ...datos };
  for (const grupo of grupos) {
    if (!o[grupo] || typeof o[grupo] !== 'object') continue;
    const medido = Object.fromEntries(
      Object.entries(o[grupo]).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    );
    if (Object.keys(medido).length) o[grupo] = medido;
    else delete o[grupo];
  }
  return o as T;
}

/**
 * Cintura en los resúmenes de la aptitud (vista previa y PDF). Es opcional en la exploración
 * física: sin medición (aunque se haya marcado «Se desconoce») no se menciona.
 */
export function textoCinturaResumen(ef: {
  circunferenciaCintura?: number | null;
  circunferenciaCinturaSeDesconoce?: boolean;
  categoriaCircunferenciaCintura?: string | null;
}): string {
  if (esMedicion(ef.circunferenciaCintura)) {
    const categoria = ef.categoriaCircunferenciaCintura ? ` - ${ef.categoriaCircunferenciaCintura}` : '';
    return ` Cintura: ${ef.circunferenciaCintura} cm${categoria}.`;
  }
  return '';
}
