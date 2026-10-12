/**
 * Tablero de salud: vigencia de la aptitud al puesto al día de hoy. Cuenta la
 * aptitud más reciente de cada trabajador activo, sin importar el periodo
 * elegido. Mismos cortes que la tabla de trabajadores
 * (`calcularEstadoVigencia` en components/DataTableDT.vue): la aptitud dura un
 * año y está «por vencer» en sus últimos dos meses.
 */
export type EstadoDeVigencia = 'Vigente' | 'Por vencer' | 'Vencido';

const DIA = 1000 * 3600 * 24;
export const DIAS_DE_VIGENCIA = 365;
export const DIAS_PARA_AVISAR = 304;

/** null si la fecha no es válida. */
export function estadoDeVigencia(
  fecha: string | Date | null | undefined,
  hoy: Date = new Date(),
): EstadoDeVigencia | null {
  if (!fecha) return null;
  const desde = new Date(fecha);
  if (Number.isNaN(desde.getTime())) return null;
  const dias = Math.ceil((hoy.getTime() - desde.getTime()) / DIA);
  if (dias < DIAS_PARA_AVISAR) return 'Vigente';
  return dias < DIAS_DE_VIGENCIA ? 'Por vencer' : 'Vencido';
}

export interface ResumenDeVigencia {
  /** Trabajadores activos considerados. */
  activos: number;
  conAptitud: number;
  sinAptitud: number;
  vigentes: number;
  porVencer: number;
  vencidas: number;
}

export function resumirVigencia(
  registros: { fechaAptitudPuesto?: string | Date | null }[],
  hoy: Date = new Date(),
): ResumenDeVigencia {
  const estados = registros.map((registro) => estadoDeVigencia(registro?.fechaAptitudPuesto, hoy));
  const cuantos = (estado: EstadoDeVigencia) => estados.filter((e) => e === estado).length;
  const conAptitud = estados.filter(Boolean).length;
  return {
    activos: registros.length,
    conAptitud,
    sinAptitud: registros.length - conAptitud,
    vigentes: cuantos('Vigente'),
    porVencer: cuantos('Por vencer'),
    vencidas: cuantos('Vencido'),
  };
}
