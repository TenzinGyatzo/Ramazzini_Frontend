/**
 * Presentación clínica de `resumenCondiciones` en UI/PDF ILC.
 * Traduce datos técnicos del motor a lenguaje longitudinal legible.
 */
import type {
  CondicionControlResumenInformeLongitudinal,
  CondicionObesidadResumenInformeLongitudinal,
  ResumenCondicionesCardiometabolicasInformeLongitudinal,
  ResumenIndicadorLongitudinalEsc,
  ResumenIndicadoresLongitudinalEsc,
} from '@/interfaces/documentos.inteface';
import {
  ESTADO_CONTROL_CONDICION_OPTS,
  GRADO_OBESIDAD_OPTS,
} from '@/helpers/eventoSeguimientoCardiometabolicoOptions';

export const TEXTO_CONDICION_NO_DOCUMENTADA = 'No documentada';
export const TEXTO_CONDICION_NO_VALORABLE = 'No valorable';
export const TEXTO_DIAGNOSTICO_NO_ACTIVO = 'No activo';

export const ETIQUETA_ESTADO = 'Estado';
export const ETIQUETA_DIAGNOSTICO = 'Diagnóstico';
export const ETIQUETA_HALLAZGO = 'Hallazgo actual';
export const ETIQUETA_ESTADO_ACTUAL = 'Estado actual';
export const ETIQUETA_EVOLUCION = 'Evolución reciente';
export const ETIQUETA_CAMBIO_IMC = 'Cambio IMC';
export const ETIQUETA_CAMBIO_PESO = 'Cambio peso';

/** @deprecated Ya no se muestra en vista clínica; conservado por compatibilidad de imports. */
export const TEXTO_SIN_TENDENCIA = 'Sin tendencia';

export interface LineaResumenCondicionVista {
  soloValor?: boolean;
  etiqueta?: string;
  valor: string;
}

export interface BloqueResumenCondicionVista {
  titulo: string;
  lineas: LineaResumenCondicionVista[];
}

export interface CondicionLongitudinalVista {
  existeDiagnostico: boolean;
  estadoActual?: string;
  evolucionReciente?: string;
  hallazgoActual?: string;
  detalleCambio?: string;
  /** Etiqueta para detalleCambio (IMC o peso). */
  etiquetaCambio?: string;
}

export interface OpcionesResumenCondicionesVista {
  resumenIndicadores?: ResumenIndicadoresLongitudinalEsc;
}

const CONDICIONES_ILC_VISTA = [
  { key: 'hipertension' as const, titulo: 'Hipertensión' },
  { key: 'diabetes' as const, titulo: 'DM2' },
  { key: 'dislipidemia' as const, titulo: 'Dislipidemia' },
  { key: 'obesidad' as const, titulo: 'Obesidad' },
];

function fmtIndicadorNum(val: number | undefined | null): string | null {
  if (val == null) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return String(val);
  return String(Number.parseFloat(n.toFixed(2)));
}

function labelEstadoControl(code?: string): string {
  if (!code?.trim()) return TEXTO_CONDICION_NO_VALORABLE;
  if (code === 'NO_VALORABLE') return TEXTO_CONDICION_NO_VALORABLE;
  const o = ESTADO_CONTROL_CONDICION_OPTS.find((x) => x.value === code);
  if (o) return o.label;
  return code
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function labelHallazgoActual(codigoEstadoVigencia?: string): string {
  switch (codigoEstadoVigencia?.trim()) {
    case 'SIN_DIAGNOSTICO_ACTIVO':
      return 'Sin evidencia relevante';
    case 'HALLAZGO_COMPATIBLE':
      return 'Hallazgo compatible';
    case 'ALTERACION_DOCUMENTADA':
      return 'Alteración documentada';
    case 'NO_VALORABLE':
      return TEXTO_CONDICION_NO_VALORABLE;
    default:
      return TEXTO_CONDICION_NO_VALORABLE;
  }
}

function labelGradoObesidad(code?: string): string {
  if (!code?.trim()) return TEXTO_CONDICION_NO_VALORABLE;
  const o = GRADO_OBESIDAD_OPTS.find((x) => x.value === code);
  if (o) return o.label;
  return code.replace(/_/g, ' ');
}

function tramoIndicador(o?: ResumenIndicadorLongitudinalEsc): string | undefined {
  if (!o || typeof o !== 'object') return undefined;
  const vi = o.valorInicial;
  const vf = o.valorFinal;
  if (vi == null && vf == null) return undefined;
  const sVi = fmtIndicadorNum(vi);
  const sVf = fmtIndicadorNum(vf);
  if (sVi != null && sVf != null) return `${sVi} → ${sVf}`;
  if (sVi != null) return sVi;
  if (sVf != null) return sVf;
  return undefined;
}

function anexarNotasCondicion(
  lineas: LineaResumenCondicionVista[],
  bloque: { interpretacionAutomatica?: string; observaciones?: string },
): void {
  if (bloque.interpretacionAutomatica?.trim()) {
    lineas.push({ soloValor: true, valor: bloque.interpretacionAutomatica.trim() });
  }
  if (bloque.observaciones?.trim()) {
    lineas.push({ etiqueta: 'Observaciones', valor: bloque.observaciones.trim() });
  }
}

function estaDocumentadaControl(b?: CondicionControlResumenInformeLongitudinal): boolean {
  if (!b || typeof b !== 'object') return false;
  if (b.presente === true) return true;
  return Boolean(b.codigoEstadoVigencia?.trim());
}

function estaDocumentadaObesidad(b?: CondicionObesidadResumenInformeLongitudinal): boolean {
  if (!b || typeof b !== 'object') return false;
  if (b.presente === false) return false;
  if (b.presente === true) return true;
  return Boolean(b.gradoActual?.trim());
}

export function mapearCondicionControlVista(
  bloque: CondicionControlResumenInformeLongitudinal | undefined,
): CondicionLongitudinalVista | null {
  if (!estaDocumentadaControl(bloque)) return null;

  const existeDiagnostico = bloque!.presente === true;

  if (existeDiagnostico) {
    const estadoActual = bloque!.estadoActual?.trim()
      ? labelEstadoControl(bloque!.estadoActual)
      : TEXTO_CONDICION_NO_VALORABLE;
    const evolucionReciente = bloque!.tendencia?.trim() || undefined;
    return { existeDiagnostico: true, estadoActual, evolucionReciente };
  }

  return {
    existeDiagnostico: false,
    hallazgoActual: labelHallazgoActual(bloque!.codigoEstadoVigencia),
  };
}

export function mapearObesidadVista(
  bloque: CondicionObesidadResumenInformeLongitudinal | undefined,
  indicadores?: ResumenIndicadoresLongitudinalEsc,
): CondicionLongitudinalVista | null {
  if (!estaDocumentadaObesidad(bloque)) return null;

  const grado = bloque!.gradoActual?.trim();
  const estadoActual = grado ? labelGradoObesidad(grado) : TEXTO_CONDICION_NO_VALORABLE;

  const tramoImc = tramoIndicador(indicadores?.indiceMasaCorporal);
  if (tramoImc) {
    return {
      existeDiagnostico: bloque!.presente === true,
      estadoActual,
      detalleCambio: tramoImc,
      etiquetaCambio: ETIQUETA_CAMBIO_IMC,
    };
  }

  const tramoPeso = tramoIndicador(indicadores?.peso);
  if (tramoPeso) {
    return {
      existeDiagnostico: bloque!.presente === true,
      estadoActual,
      detalleCambio: `${tramoPeso} kg`,
      etiquetaCambio: ETIQUETA_CAMBIO_PESO,
    };
  }

  return {
    existeDiagnostico: bloque!.presente === true,
    estadoActual,
  };
}

export function lineasDesdeCondicionLongitudinalVista(
  m: CondicionLongitudinalVista,
): LineaResumenCondicionVista[] {
  const lineas: LineaResumenCondicionVista[] = [];

  if (!m.existeDiagnostico) {
    lineas.push({ etiqueta: ETIQUETA_DIAGNOSTICO, valor: TEXTO_DIAGNOSTICO_NO_ACTIVO });
    if (m.hallazgoActual) {
      lineas.push({ etiqueta: ETIQUETA_HALLAZGO, valor: m.hallazgoActual });
    }
    return lineas;
  }

  if (m.estadoActual) {
    lineas.push({ etiqueta: ETIQUETA_ESTADO_ACTUAL, valor: m.estadoActual });
  }
  if (m.evolucionReciente) {
    lineas.push({ etiqueta: ETIQUETA_EVOLUCION, valor: m.evolucionReciente });
  }
  if (m.detalleCambio && m.etiquetaCambio) {
    lineas.push({ etiqueta: m.etiquetaCambio, valor: m.detalleCambio });
  }

  return lineas;
}

function lineasDesdeCondicionControl(
  bloque: CondicionControlResumenInformeLongitudinal | undefined,
): LineaResumenCondicionVista[] {
  const mapeado = mapearCondicionControlVista(bloque);
  if (!mapeado) {
    return [{ etiqueta: ETIQUETA_ESTADO, valor: TEXTO_CONDICION_NO_DOCUMENTADA }];
  }
  const lineas = lineasDesdeCondicionLongitudinalVista(mapeado);
  anexarNotasCondicion(lineas, bloque ?? {});
  return lineas;
}

function lineasDesdeObesidad(
  bloque: CondicionObesidadResumenInformeLongitudinal | undefined,
  indicadores?: ResumenIndicadoresLongitudinalEsc,
): LineaResumenCondicionVista[] {
  const mapeado = mapearObesidadVista(bloque, indicadores);
  if (!mapeado) {
    return [{ etiqueta: ETIQUETA_ESTADO, valor: TEXTO_CONDICION_NO_DOCUMENTADA }];
  }
  const lineas = lineasDesdeCondicionLongitudinalVista(mapeado);
  anexarNotasCondicion(lineas, bloque ?? {});
  return lineas;
}

/**
 * Siempre devuelve las 4 condiciones cardiometabólicas del ILC (aunque falten en `resumenCondiciones`).
 */
export function bloquesResumenCondicionesParaVista(
  rc: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined,
  opts?: OpcionesResumenCondicionesVista,
): BloqueResumenCondicionVista[] {
  const indicadores = opts?.resumenIndicadores;
  return CONDICIONES_ILC_VISTA.map(({ key, titulo }) => {
    if (key === 'obesidad') {
      return { titulo, lineas: lineasDesdeObesidad(rc?.obesidad, indicadores) };
    }
    const bloque = rc?.[key] as CondicionControlResumenInformeLongitudinal | undefined;
    return { titulo, lineas: lineasDesdeCondicionControl(bloque) };
  });
}
