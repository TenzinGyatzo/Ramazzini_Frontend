/**
 * Tablero de salud: secciones en que se agrupan las tarjetas y cifras clave.
 * Los datos llegan del servidor como una entrada por centro de trabajo; cada
 * indicador es una lista dentro de un arreglo de un solo elemento
 * (getDashboardData en backend/src/modules/trabajadores/trabajadores.service.ts).
 */

type DatosDeCentro = Record<string, unknown[][] | undefined> | null | undefined;

/** Registros de un indicador en los centros que se están viendo (null = todos). */
export function registrosDe(
  datos: DatosDeCentro[],
  indiceCentro: number | null,
  clave: string,
): unknown[] {
  const centros = indiceCentro === null ? datos : [datos[indiceCentro]];
  return centros.flatMap((centro) => centro?.[clave]?.[0] ?? []);
}

export interface SeccionDeTablero {
  id: string;
  titulo: string;
  icono: string;
}

export const SECCIONES_DE_TABLERO: SeccionDeTablero[] = [
  { id: 'poblacion', titulo: 'Población y salud física', icono: 'fas fa-users' },
  { id: 'exposicion', titulo: 'Exposición y antecedentes', icono: 'fas fa-triangle-exclamation' },
  { id: 'saludMental', titulo: 'Salud mental', icono: 'fas fa-brain' },
  { id: 'saludVisual', titulo: 'Salud visual', icono: 'fas fa-eye' },
  { id: 'gabinete', titulo: 'Estudios de gabinete', icono: 'fas fa-stethoscope' },
  { id: 'aptitud', titulo: 'Aptitud y consultas', icono: 'fas fa-clipboard-check' },
];

export interface CifraClave {
  clave: string;
  titulo: string;
  valor: string;
  detalle: string;
}

const porcentaje = (parte: number, total: number) =>
  total > 0 ? `${Math.round((parte / total) * 100)} %` : '';

/**
 * Cifras que resumen el tablero. La cobertura compara a quienes tienen el
 * documento en el periodo contra los trabajadores activos.
 */
export function cifrasClave(
  datos: DatosDeCentro[],
  indiceCentro: number | null,
  conFiltros = false,
): CifraClave[] {
  const contar = (clave: string) => registrosDe(datos, indiceCentro, clave).length;
  const activos = contar('grupoEtario');
  const conExploracion = contar('imc');
  const aptitudes = registrosDe(datos, indiceCentro, 'aptitudes') as { aptitudPuesto?: string | null }[];
  const aptos = aptitudes.filter((a) => a?.aptitudPuesto === 'Apto Sin Restricciones').length;

  const cobertura = (cuantos: number) =>
    activos > 0 && cuantos <= activos ? `${porcentaje(cuantos, activos)} de los activos` : '';

  return [
    {
      clave: 'activos',
      titulo: 'Trabajadores activos',
      valor: String(activos),
      detalle: conFiltros ? 'Con los filtros elegidos' : 'Plantilla actual',
    },
    {
      clave: 'exploracion',
      titulo: 'Con exploración física',
      valor: String(conExploracion),
      detalle: cobertura(conExploracion),
    },
    {
      clave: 'aptitud',
      titulo: 'Con aptitud evaluada',
      valor: String(aptitudes.length),
      detalle: aptitudes.length ? `${porcentaje(aptos, aptitudes.length)} aptos sin restricciones` : '',
    },
    {
      clave: 'consultas',
      titulo: 'Consultas médicas',
      valor: String(contar('consultas')),
      detalle: '',
    },
  ];
}
