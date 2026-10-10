/**
 * Estimación de la prima de riesgo de trabajo: tipos de lo que entrega el servidor
 * (calcularSiniestralidad en backend/src/modules/incapacidades/incapacidades-prima.util.ts)
 * y la fórmula. Es una ESTIMACIÓN: varias de sus reglas son supuestos sin confirmar
 * (docs/incapacidades-especificacion.md, secciones 8 y 13).
 */
import type { Opcion } from './incapacidades';
import type { TrabajadorDePanel } from './incapacidadesPanel';

export type CriterioPrima = 'terminados' | 'ocurridos';

export const CRITERIOS_PRIMA: (Opcion<CriterioPrima> & { descripcion: string })[] = [
  {
    valor: 'terminados',
    texto: 'Casos terminados en el año',
    descripcion:
      'Cada caso entra completo, con todos sus días, en el año en que terminó. Los casos que siguen en curso no entran.',
  },
  {
    valor: 'ocurridos',
    texto: 'Días ocurridos en el año',
    descripcion:
      'Cada día cuenta en el año en que ocurrió. La incapacidad permanente y la defunción, en el año de su fecha.',
  },
];

export interface CasoDePrima {
  idCaso: string;
  idTrabajador: string;
  tipoRiesgo?: string;
  fechaInicio: string;
  fechaTermino: string | null;
  dias: number;
  porcentajeIPP: number;
  defuncion: boolean;
  enCalificacion: boolean;
}

export interface Siniestralidad {
  anio: number;
  criterio: CriterioPrima;
  S: number;
  I: number;
  D: number;
  casos: CasoDePrima[];
  excluidos: { trayecto: number; enCurso: number };
  trabajadoresActivos: number;
  centros: { _id: string; nombreCentro: string }[];
  trabajadores: TrabajadorDePanel[];
}

/** Duración promedio de vida activa de quien no sufre un riesgo, en años. */
export const V = 28;
/** Prima mínima de riesgo, como fracción. */
export const M = 0.005;
export const FACTORES_DE_PRIMA: (Opcion<'2.3' | '2.2'> & { numero: number })[] = [
  { valor: '2.3', numero: 2.3, texto: '2.3' },
  { valor: '2.2', numero: 2.2, texto: '2.2 (sistema de seguridad y salud acreditado)' },
];

/** SUPUESTOS sin confirmar: variación máxima por año y límites de la prima, en puntos porcentuales. */
export const VARIACION_MAXIMA = 1;
export const PRIMA_MINIMA = 0.5;
export const PRIMA_MAXIMA = 15;

export interface ResultadoDePrima {
  /** Resultado de la fórmula, en porcentaje. */
  calculada: number;
  /** Después de aplicar los topes, en porcentaje. */
  aplicable: number;
  /** Topes que modificaron el resultado. */
  ajustes: string[];
  /** Diferencia contra la prima anterior, en puntos porcentuales; null si no se capturó. */
  diferencia: number | null;
}

const redondear = (valor: number) => Math.round(valor * 100000) / 100000;

/**
 * Prima = [(S/365) + V × (I + D)] × (F/N) + M, expresada en porcentaje.
 * Devuelve null si N no es mayor a cero.
 */
export function calcularPrima(datos: {
  S: number;
  I: number;
  D: number;
  N: number;
  F: number;
  /** En porcentaje. */
  primaAnterior?: number | null;
}): ResultadoDePrima | null {
  if (!(datos.N > 0) || !(datos.F > 0)) return null;
  const calculada = redondear(
    ((datos.S / 365 + V * (datos.I + datos.D)) * (datos.F / datos.N) + M) * 100,
  );
  const anterior =
    typeof datos.primaAnterior === 'number' && datos.primaAnterior > 0 ? datos.primaAnterior : null;
  const ajustes: string[] = [];
  let aplicable = calculada;

  if (anterior !== null) {
    if (aplicable > anterior + VARIACION_MAXIMA) {
      aplicable = anterior + VARIACION_MAXIMA;
      ajustes.push(`No puede subir más de ${VARIACION_MAXIMA} punto porcentual respecto a la prima anterior.`);
    } else if (aplicable < anterior - VARIACION_MAXIMA) {
      aplicable = anterior - VARIACION_MAXIMA;
      ajustes.push(`No puede bajar más de ${VARIACION_MAXIMA} punto porcentual respecto a la prima anterior.`);
    }
  }
  if (aplicable < PRIMA_MINIMA) {
    aplicable = PRIMA_MINIMA;
    ajustes.push(`No puede ser menor a ${PRIMA_MINIMA} %.`);
  } else if (aplicable > PRIMA_MAXIMA) {
    aplicable = PRIMA_MAXIMA;
    ajustes.push(`No puede ser mayor a ${PRIMA_MAXIMA} %.`);
  }
  aplicable = redondear(aplicable);

  return {
    calculada,
    aplicable,
    ajustes,
    diferencia: anterior === null ? null : redondear(aplicable - anterior),
  };
}

/** `0.54355` → `0.54355 %`. */
export const textoDePrima = (porcentaje: number): string =>
  `${porcentaje.toLocaleString('es-MX', { minimumFractionDigits: 5, maximumFractionDigits: 5 })} %`;

/** Años que se pueden consultar: el actual y los seis anteriores. */
export function aniosDisponibles(anioActual: number): number[] {
  return Array.from({ length: 7 }, (_, i) => anioActual - i);
}
