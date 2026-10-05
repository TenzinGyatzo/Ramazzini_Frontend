/**
 * Un trabajador puede tener audiometrías de dos orígenes: la que se captura en
 * Ramazzini y la que hace un tercero y se registra como resultado clínico. En la
 * aptitud al puesto y en las estadísticas cuenta una sola: la más reciente; si
 * ambas son del mismo día, la de Ramazzini. Una externa no concluyente no cuenta.
 *
 * Paridad con `backend/src/utils/audiometria-fuente.util.ts`.
 */

type Fecha = Date | string | number | null | undefined;

export interface AudiometriaExternaLike {
  fechaEstudio?: Fecha;
  resultadoGlobal?: string | null;
}

/** Día calendario (UTC) de una fecha; `null` si no es válida. */
export function diaUtc(fecha: Fecha): string | null {
  if (fecha == null || fecha === '') return null;
  const d = new Date(fecha);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Una externa no concluyente no aporta resultado: no entra en la comparación. */
export function esAudiometriaExternaUtilizable(
  externa: AudiometriaExternaLike | null | undefined,
): externa is AudiometriaExternaLike {
  return (
    !!externa &&
    externa.resultadoGlobal !== 'NO_CONCLUYENTE' &&
    diaUtc(externa.fechaEstudio) !== null
  );
}

/**
 * `true` si debe usarse la audiometría externa en lugar de la de Ramazzini:
 * cuando no hay de Ramazzini o la externa es de un día posterior.
 */
export function usarAudiometriaExterna(
  fechaNativa: Fecha,
  externa: AudiometriaExternaLike | null | undefined,
): boolean {
  if (!esAudiometriaExternaUtilizable(externa)) return false;
  const diaNativa = diaUtc(fechaNativa);
  if (diaNativa === null) return true;
  return (diaUtc(externa.fechaEstudio) as string) > diaNativa;
}
