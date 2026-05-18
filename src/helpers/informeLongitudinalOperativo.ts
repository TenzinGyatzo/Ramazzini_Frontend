/**
 * Derivaciones operativas para Informe longitudinal cardiometabólico (cliente).
 */
import type {
  CondicionControlResumenInformeLongitudinal,
  CondicionObesidadResumenInformeLongitudinal,
  EventoConcentradoCardiometabolicoEsc,
  InformeLongitudinalCardiometabolico,
  ResumenCondicionesCardiometabolicasInformeLongitudinal,
  ResumenIndicadoresLongitudinalEsc,
  SeguimientoProgramadoConcentradoCardiometabolicoEsc,
} from '@/interfaces/documentos.inteface';
import { CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL } from '@/helpers/informeLongitudinalCardiometabolicoOptions';
import {
  CONFIG_UMBRALES_SEVERIDAD_ILC,
  inferirNivelRiesgoLongitudinalDescontrol,
  inferirTendenciaLongitudinalAgregada,
} from '@/helpers/informeLongitudinalRiesgoTrayectoria';
import { resumenRegimenTratamientoEnPeriodo } from '@/helpers/informeLongitudinalTratamiento';
import {
  CONDICION_ILC_A_ESC,
  codigoControlClinicoParaTendencia,
  codigoEstadoVigenciaDesdeResultado,
  diagnosticoActivoEnEvento,
  diagnosticoObesidadEnEvento,
  estadoActualControlDesdeVisita,
  evaluarCondicionEnEvento,
  eventoConcentradoAEscForm,
  tendenciaControlDesdeSerie,
  tendenciaControlAString,
  type CondicionControlIlc,
} from '@/helpers/informeLongitudinalCoherenciaEsc';
import type { EscCoherenciaContexto } from '@/helpers/cardiometabolico/coherenciaClinicaEsc';
import {
  derivarResumenIndicadoresCompleto,
  eventosCronologicos,
  proyectarResumenIndicadoresParaPersistencia,
  type ResumenIndicadoresEnriquecido,
} from '@/helpers/informeLongitudinalIndicadores';
export type {
  InferenciaRiesgoTendenciaResult,
  ParamsInferenciaRiesgoDescontrol,
} from '@/helpers/informeLongitudinalRiesgoTrayectoria';
export {
  CONFIG_UMBRALES_SEVERIDAD_ILC,
  inferirNivelRiesgoLongitudinalDescontrol,
  inferirTendenciaLongitudinalAgregada,
};

/** Valores exactos de `EstadoSeguimientoProgramadoCardiometabolico` (backend). */
export const ESTADO_SEGUIMIENTO_PROG = {
  PROGRAMADA: 'Programada',
  REALIZADA: 'Realizada',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
} as const;

export interface MetricasDerivadasSeguimiento {
  /**
   * Citas de agenda seleccionadas **excluyendo** las que están en estado `Realizada` (ese estado no participa en métricas).
   */
  numeroSeguimientosProgramados: number;
  /** Igual al número de eventos de seguimiento cardiometabólico incluidos en el informe (`eventosConcentrados.length`). */
  numeroSeguimientosRealizados: number;
  numeroInasistencias: number;
  numeroCancelaciones: number;
  /** Registros con indicio de reprogramación (`fechaReprogramada` o enlace desde Step1), solo en filas no `Realizada`. */
  numeroReprogramaciones: number;
  /**
   * `eventos_incluidos / (eventos_incluidos + inasistencias + cancelaciones)` en agenda (solo filas no `Realizada`).
   * Las citas solo `Programada` quedan fuera del denominador.
   */
  porcentajeAsistencia: number | undefined;
  numeroEventosValidos?: number;
}

function normEstado(estado?: string): string | undefined {
  if (typeof estado !== 'string') return undefined;
  return estado.trim();
}

/**
 * Ratio de “asistencia efectiva”: eventos incluidos en el informe frente a inasistencias y cancelaciones en agenda.
 * Denominador = `nEventosIncluidos + nNoAsistio + nCancelada`. Si es 0 ⇒ `undefined`.
 */
export function calcularPorcentajeAsistenciaCerradas(
  nEventosIncluidos: number,
  nNoAsistio: number,
  nCancelada: number,
): number | undefined {
  const denom = nEventosIncluidos + nNoAsistio + nCancelada;
  if (denom <= 0) return undefined;
  return Math.round((100 * nEventosIncluidos) / denom * 10) / 10;
}

/**
 * Métricas a partir de `seguimientosProgramadosConcentrados` y `eventosConcentrados` (selección paso 1).
 * Las filas de agenda con estado `Realizada` se ignoran por completo (no cuentan para nada).
 * `numeroSeguimientosRealizados` = número de eventos de seguimiento incluidos en el informe.
 */
export function derivarMetricasSeguimientoYEventos(
  seguimientos: SeguimientoProgramadoConcentradoCardiometabolicoEsc[] | undefined,
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): MetricasDerivadasSeguimiento {
  const lista = Array.isArray(seguimientos) ? seguimientos : [];
  let nNoAsistio = 0;
  let nCancelada = 0;
  let nProgramada = 0;
  let nReprog = 0;
  /** Filas de agenda consideradas (todas las seleccionadas salvo `Realizada`). */
  let nAgendaNoRealizada = 0;

  for (const s of lista) {
    const e = normEstado(s.estado);
    if (e === ESTADO_SEGUIMIENTO_PROG.REALIZADA) {
      continue;
    }
    nAgendaNoRealizada += 1;
    if (e === ESTADO_SEGUIMIENTO_PROG.NO_ASISTIO) nNoAsistio += 1;
    else if (e === ESTADO_SEGUIMIENTO_PROG.CANCELADA) nCancelada += 1;
    else if (e === ESTADO_SEGUIMIENTO_PROG.PROGRAMADA) nProgramada += 1;

    const reprog =
      Boolean(s.esResultadoDeReprogramacion || (s.fechaReprogramada && String(s.fechaReprogramada).trim() !== ''));
    if (reprog) nReprog += 1;
  }

  const evList = Array.isArray(eventosConcentrados) ? eventosConcentrados : [];

  void nProgramada;

  const nEventosIncluidos = evList.length;
  return {
    numeroSeguimientosProgramados: nAgendaNoRealizada,
    numeroSeguimientosRealizados: nEventosIncluidos,
    numeroInasistencias: nNoAsistio,
    numeroCancelaciones: nCancelada,
    numeroReprogramaciones: nReprog,
    porcentajeAsistencia: calcularPorcentajeAsistenciaCerradas(nEventosIncluidos, nNoAsistio, nCancelada),
    numeroEventosValidos: contarEventosConDatosNumericos(evList),
  };
}

/** Evento “válido” si hay al menos un dato en TA sistólica/diastólica, IMC o panel lab mínimo. */
export function contarEventosConDatosNumericos(eventos: EventoConcentradoCardiometabolicoEsc[]): number {
  let n = 0;
  for (const ev of eventos) {
    const tas = ev.signosVitales?.tensionArterialSistolica;
    const tad = ev.signosVitales?.tensionArterialDiastolica;
    const taOk = tas != null && !Number.isNaN(Number(tas)) && tad != null && !Number.isNaN(Number(tad));
    const imc = ev.somatometria?.indiceMasaCorporal;
    const imcOk = imc != null && !Number.isNaN(Number(imc));
    const gluc = ev.laboratorio?.glucosaMgDl;
    const hba = ev.laboratorio?.hba1cPorcentaje;
    const ldl = ev.laboratorio?.ldlMgDl;
    const labOk =
      (gluc != null && !Number.isNaN(Number(gluc))) ||
      (hba != null && !Number.isNaN(Number(hba))) ||
      (ldl != null && !Number.isNaN(Number(ldl)));
    if (taOk || imcOk || labOk) n += 1;
  }
  return n;
}

export { eventosCronologicos } from '@/helpers/informeLongitudinalIndicadores';

const ORDEN_GRADO_OBESIDAD: Record<string, number> = {
  SOBREPESO: 1,
  OBESIDAD_I: 2,
  OBESIDAD_II: 3,
  OBESIDAD_III: 4,
};

function tendenciaGradoObesidadDesdeSerie(grados: string[]): string | undefined {
  if (grados.length < 2) return undefined;
  const o0 = ORDEN_GRADO_OBESIDAD[grados[0]!];
  const o1 = ORDEN_GRADO_OBESIDAD[grados[grados.length - 1]!];
  if (o0 == null || o1 == null) return undefined;
  if (o0 === o1) return 'Estable';
  if (o1 < o0) return 'Mejoría';
  if (o1 > o0) return 'Empeoramiento';
  return undefined;
}

function buildControlResumenDesdeEventos(
  cron: EventoConcentradoCardiometabolicoEsc[],
  condicionIlc: CondicionControlIlc,
  ctx?: EscCoherenciaContexto,
): CondicionControlResumenInformeLongitudinal | undefined {
  const escKey = CONDICION_ILC_A_ESC[condicionIlc];
  let presente = false;
  let huboDatoRelevante = false;
  let codigoEstadoVigencia: string | undefined;
  let razonUltimaVisita: string | undefined;
  let estadoActual: string | undefined;
  const serieClinica: ('CONTROLADA' | 'NO_CONTROLADA')[] = [];

  for (const ev of cron) {
    const form = eventoConcentradoAEscForm(ev);
    const resultado = evaluarCondicionEnEvento(ev, escKey, ctx);
    if (diagnosticoActivoEnEvento(ev, escKey)) presente = true;

    const vigencia = codigoEstadoVigenciaDesdeResultado(resultado, form, escKey);
    codigoEstadoVigencia = vigencia;
    razonUltimaVisita = resultado.razon;
    if (vigencia !== 'SIN_DIAGNOSTICO_ACTIVO' || resultado.diagnosticoActivo) {
      huboDatoRelevante = true;
    }

    const ctrlVisita = estadoActualControlDesdeVisita(resultado, form, escKey);
    if (ctrlVisita) estadoActual = ctrlVisita;

    const clinico = codigoControlClinicoParaTendencia(resultado, form, escKey);
    if (clinico) serieClinica.push(clinico);
  }

  if (!huboDatoRelevante && !presente) return undefined;

  const tendencia = tendenciaControlAString(tendenciaControlDesdeSerie(serieClinica));
  const out: CondicionControlResumenInformeLongitudinal = {
    presente,
    codigoEstadoVigencia,
    razonUltimaVisita,
  };
  if (estadoActual) out.estadoActual = estadoActual;
  if (tendencia) out.tendencia = tendencia;
  return out;
}

function buildObesidadResumenDesdeEventos(
  cron: EventoConcentradoCardiometabolicoEsc[],
): CondicionObesidadResumenInformeLongitudinal | undefined {
  let presente = false;
  const grados: string[] = [];

  for (const ev of cron) {
    if (diagnosticoObesidadEnEvento(ev)) presente = true;
    const g = ev.estadoCondiciones?.obesidad?.grado?.trim();
    if (g && diagnosticoObesidadEnEvento(ev)) grados.push(g);
  }

  if (!presente && grados.length === 0) return undefined;

  const out: CondicionObesidadResumenInformeLongitudinal = { presente };
  if (grados.length) {
    out.gradoActual = grados[grados.length - 1];
    const tend = tendenciaGradoObesidadDesdeSerie(grados);
    if (tend) out.tendencia = tend;
  }
  return out;
}

/**
 * Agrega resumen por condición usando coherencia ESC por visita.
 * `presente` solo con diagnóstico activo documentado; vigencia y tendencia según plan ILC.
 */
export function derivarResumenCondicionesDesdeEventos(
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
  ctx?: EscCoherenciaContexto,
): ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined {
  const cron = eventosCronologicos(Array.isArray(eventosConcentrados) ? eventosConcentrados : []);
  if (cron.length === 0) return undefined;

  const out: ResumenCondicionesCardiometabolicasInformeLongitudinal = {};
  const hta = buildControlResumenDesdeEventos(cron, 'hipertension', ctx);
  const dm = buildControlResumenDesdeEventos(cron, 'diabetes', ctx);
  const dis = buildControlResumenDesdeEventos(cron, 'dislipidemia', ctx);
  const ob = buildObesidadResumenDesdeEventos(cron);
  if (hta) out.hipertension = hta;
  if (dm) out.diabetes = dm;
  if (dis) out.dislipidemia = dis;
  if (ob) out.obesidad = ob;

  return Object.keys(out).length ? out : undefined;
}

/**
 * Proyección slim (6 ejes visibles) desde eventos concentrados.
 * Para inferencia usar `derivarResumenIndicadoresCompleto`.
 */
export function derivarResumenIndicadoresMinimo(
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): ResumenIndicadoresLongitudinalEsc | undefined {
  return proyectarResumenIndicadoresParaPersistencia(derivarResumenIndicadoresCompleto(eventosConcentrados));
}

export { derivarResumenIndicadoresCompleto, proyectarResumenIndicadoresParaPersistencia };
export type { ResumenIndicadoresEnriquecido };

export function derivarDatosFaltantesDesdeUltimoEvento(
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): string[] {
  const cron = eventosCronologicos(Array.isArray(eventosConcentrados) ? eventosConcentrados : []);
  if (cron.length === 0) return ['No hay eventos clínicos seleccionados en el periodo; la interpretación longitudinal queda muy limitada.'];
  const ult = cron[cron.length - 1]!;
  const lineas: string[] = [];

  if (cron.length < 2) {
    lineas.push('No hay suficientes mediciones temporales en el periodo para valorar tendencias con solidez (se requiere al menos dos controles fechados).');
  }

  const sis = ult.signosVitales?.tensionArterialSistolica;
  const dia = ult.signosVitales?.tensionArterialDiastolica;
  if (sis == null || dia == null) {
    lineas.push('En el último control considerado no se dispone de tensión arterial completa (sistólica y diastólica), lo que limita la valoración hemodinámica.');
  }
  if (ult.somatometria?.peso == null) {
    lineas.push('En el último control considerado no hay peso registrado; la evolución ponderal no puede integrarse.');
  }
  if (ult.somatometria?.indiceMasaCorporal == null) {
    lineas.push('En el último control considerado no hay IMC registrado.');
  }
  if (ult.laboratorio?.glucosaMgDl == null) {
    lineas.push('No se cuenta con glucosa en el último control considerado; el seguimiento glucémico queda incompleto.');
  }
  if (ult.laboratorio?.hba1cPorcentaje == null) {
    lineas.push('No se cuenta con HbA1c reciente en el último control considerado; la valoración del control glucémico a medio plazo queda limitada.');
  }
  if (ult.laboratorio?.ldlMgDl == null && ult.laboratorio?.trigliceridosMgDl == null) {
    lineas.push('El perfil lipídico disponible es insuficiente para valorar evolución completa (sin LDL ni triglicéridos en el último control).');
  }
  return lineas;
}

export interface ResultadoInferenciaLongitudinal {
  consistenciaSeguimiento?: string;
  nivelRiesgoLongitudinal?: string;
  tendenciaLongitudinal?: string;
  interpretacionRiesgoLongitudinal?: string;
}

/**
 * Consistencia ordinal (sin cambiar reglas): Adecuado / Irregular / Insuficiente / No valorable.
 */
export function inferirConsistenciaSeguimiento(
  m: MetricasDerivadasSeguimiento,
  nEventosIncluidos: number,
): { consistenciaSeguimiento?: string } {
  const consistente = CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL as readonly string[];
  const noVal = 'No valorable';
  if (nEventosIncluidos <= 0) {
    return { consistenciaSeguimiento: noVal };
  }
  const pct = m.porcentajeAsistencia;
  let cons: string = consistente[0]!;
  if (typeof pct === 'number' && pct < 50 && m.numeroSeguimientosProgramados > 0) cons = consistente[2]!;
  else if (typeof pct === 'number' && pct < 70 && pct >= 50) cons = consistente[1]!;
  return { consistenciaSeguimiento: cons };
}

/**
 * Inferencia completa (consistencia + riesgo por descontrol) para llamadas que aún pasan un solo bloque de métricas.
 * Preferir las funciones específicas cuando se disponga de `resumenIndicadores` / `resumenCondiciones`.
 */
export function inferirConsistenciaYNivelRiesgo(
  m: MetricasDerivadasSeguimiento,
  nEventosIncluidos: number,
  extra?: {
    resumenIndicadores?: ResumenIndicadoresLongitudinalEsc;
    resumenCondiciones?: ResumenCondicionesCardiometabolicasInformeLongitudinal;
    datosFaltantesRelevantes?: string[];
    eventosConcentrados?: EventoConcentradoCardiometabolicoEsc[];
  },
): ResultadoInferenciaLongitudinal {
  const cons = inferirConsistenciaSeguimiento(m, nEventosIncluidos);
  const evValOk = typeof m.numeroEventosValidos === 'number' ? m.numeroEventosValidos : 0;
  const datosN = Array.isArray(extra?.datosFaltantesRelevantes) ? extra!.datosFaltantesRelevantes!.length : 0;
  const risk = inferirNivelRiesgoLongitudinalDescontrol({
    resumenIndicadores: extra?.resumenIndicadores,
    resumenCondiciones: extra?.resumenCondiciones,
    metricas: m,
    nEventosIncluidos,
    numeroEventosValidos: evValOk,
    datosFaltantesCount: datosN,
    eventosConcentrados: extra?.eventosConcentrados,
  });
  return {
    ...cons,
    nivelRiesgoLongitudinal: risk.nivelRiesgoLongitudinal,
    tendenciaLongitudinal: risk.tendenciaLongitudinal,
    interpretacionRiesgoLongitudinal: risk.interpretacionRiesgoLongitudinal,
  };
}

const VIÑETA_MEJORIA_VARIACION =
  'La mejoría en indicadores coincide temporalmente con variación de régimen terapéutico entre controles del periodo.';
const VIÑETA_DESCONTROL_VARIACION =
  'Persisten alteraciones en indicadores pese a variación de régimen terapéutico entre controles del periodo.';
const VIÑETA_VARIACION_REGIMEN =
  'Se observa variación de régimen terapéutico entre controles del periodo (cambios en medicación o dosis).';

const VIÑETA_MEJORIA_ESTABLE =
  'La mejoría en indicadores coincide con un régimen terapéutico estable en los controles con medicación registrada.';
const VIÑETA_DESCONTROL_ESTABLE =
  'Persisten alteraciones en indicadores pese a un régimen terapéutico estable en el periodo.';
const VIÑETA_REGIMEN_ESTABLE =
  'Se mantiene el mismo régimen terapéutico (medicamentos y dosis) en los controles del periodo con tratamiento registrado.';

const VIÑETA_TRATAMIENTO_UNICO_CONTROL =
  'Tratamiento farmacológico documentado en el único control del periodo.';
const VIÑETA_TRATAMIENTO_PARCIAL_UN_CONTROL =
  'Tratamiento farmacológico documentado en un solo control del periodo; en los demás no consta régimen activo.';
const VIÑETA_TRATAMIENTO_PARCIAL_VARIOS =
  'Tratamiento farmacológico no consta en todos los controles del periodo; el análisis se basa en los controles con régimen registrado.';

function cuentaIndicadoresConTendencia(
  resumen: ResumenIndicadoresLongitudinalEsc | undefined,
  tendencia: string,
): number {
  if (!resumen || typeof resumen !== 'object') return 0;
  let n = 0;
  for (const o of Object.values(resumen)) {
    if (o?.tendencia === tendencia) n += 1;
  }
  return n;
}

function haySenalMejoriaIndicadores(
  tendenciaLongitudinal: string | undefined,
  resumen: ResumenIndicadoresLongitudinalEsc | undefined,
): boolean {
  if (tendenciaLongitudinal === 'Favorable') return true;
  return cuentaIndicadoresConTendencia(resumen, 'Mejoría') >= 2;
}

function haySenalDescontrolIndicadores(
  tendenciaLongitudinal: string | undefined,
  resumen: ResumenIndicadoresLongitudinalEsc | undefined,
): boolean {
  if (tendenciaLongitudinal === 'Desfavorable') return true;
  return cuentaIndicadoresConTendencia(resumen, 'Empeoramiento') >= 1;
}

/**
 * Viñetas de contexto terapéutico (0–3). Solo evidencia de soporte; no alertas ni limitaciones.
 *
 * Sin viñetas solo si ningún control del periodo documenta tratamiento farmacológico en tabla.
 * Cubre: régimen estable, variación entre controles, tratamiento en parte de visitas y cruces con tendencia.
 */
export function derivarContextoTerapeutico(params: {
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined;
  resumenIndicadores: ResumenIndicadoresLongitudinalEsc | undefined;
  tendenciaLongitudinal: string | undefined;
}): string[] {
  const reg = resumenRegimenTratamientoEnPeriodo(params.eventosConcentrados);
  if (reg.controlesConTratamiento === 0) return [];

  const mejoria = haySenalMejoriaIndicadores(params.tendenciaLongitudinal, params.resumenIndicadores);
  const descontrol = haySenalDescontrolIndicadores(params.tendenciaLongitudinal, params.resumenIndicadores);
  const hayVariacion = reg.fingerprintsDistintos >= 2;
  const hayEstable = reg.fingerprintsDistintos === 1;
  const tratamientoParcial = reg.controlesConTratamiento < reg.controlesTotales;
  const unicoControlConTratamiento = reg.controlesConTratamiento === 1;

  const out: string[] = [];

  if (hayVariacion) {
    if (mejoria) out.push(VIÑETA_MEJORIA_VARIACION);
    if (descontrol) out.push(VIÑETA_DESCONTROL_VARIACION);
    if (!mejoria && !descontrol) out.push(VIÑETA_VARIACION_REGIMEN);
  } else if (hayEstable) {
    if (reg.controlesTotales === 1 && unicoControlConTratamiento) {
      out.push(VIÑETA_TRATAMIENTO_UNICO_CONTROL);
    } else if (unicoControlConTratamiento && tratamientoParcial) {
      out.push(VIÑETA_TRATAMIENTO_PARCIAL_UN_CONTROL);
    } else {
      if (mejoria) out.push(VIÑETA_MEJORIA_ESTABLE);
      else if (descontrol) out.push(VIÑETA_DESCONTROL_ESTABLE);
      else out.push(VIÑETA_REGIMEN_ESTABLE);
    }
  }

  if (
    tratamientoParcial &&
    reg.controlesTotales >= 2 &&
    !unicoControlConTratamiento &&
    out.length < 3
  ) {
    out.push(VIÑETA_TRATAMIENTO_PARCIAL_VARIOS);
  }

  return out.slice(0, 3);
}

/** Sugerencia algorítmica de riesgo (no muta el formulario). */
export function calcularSugerenciaRiesgoLongitudinal(
  form: InformeLongitudinalCardiometabolico,
): InferenciaRiesgoTendenciaResult {
  const ev = form.eventosConcentrados || [];
  const met = derivarMetricasSeguimientoYEventos(form.seguimientosProgramadosConcentrados || [], ev);
  const indCompleto = derivarResumenIndicadoresCompleto(ev);
  const rc = form.resumenCondiciones ?? derivarResumenCondicionesDesdeEventos(ev, undefined);
  const nEv = typeof form.numeroEventosIncluidos === 'number' ? form.numeroEventosIncluidos : 0;
  const evValOk =
    typeof form.numeroEventosValidos === 'number'
      ? form.numeroEventosValidos
      : typeof met.numeroEventosValidos === 'number'
        ? met.numeroEventosValidos
        : 0;
  const datosN = Array.isArray(form.datosFaltantesRelevantes) ? form.datosFaltantesRelevantes.length : 0;
  return inferirNivelRiesgoLongitudinalDescontrol({
    resumenIndicadores: indCompleto ?? form.resumenIndicadores,
    resumenCondiciones: rc,
    metricas: met,
    nEventosIncluidos: nEv,
    numeroEventosValidos: evValOk,
    datosFaltantesCount: datosN,
    eventosConcentrados: ev,
  });
}

/**
 * Aplica métricas, resumen de indicadores, condiciones, datos faltantes y derivaciones del informe.
 * Con `preservarJuicioClinicoRiesgo: true` actualiza trayectoria/estructura sin pisar riesgo ni interpretación del médico.
 */
export function aplicarIteracionDosAlFormulario(
  form: InformeLongitudinalCardiometabolico,
  opts?: {
    aplicarInterpretacionInferidaSiVacio?: boolean;
    /** Sobrescribe `datosFaltantesRelevantes` con lo derivado (evita fusión manual en esta iteración). */
    recalcDatosFaltantes?: boolean;
    /** Asigna riesgo, interpretación, consistencia y resumenCondiciones desde heurísticas (legacy/tests). */
    sobrescribirInterpretacionAutomatizada?: boolean;
    /** Derivación estructural + trayectoria; no asigna `nivelRiesgoLongitudinal` ni `interpretacionRiesgoLongitudinal`. */
    preservarJuicioClinicoRiesgo?: boolean;
    /** Sexo del paciente para coherencia ESC (p. ej. HDL). */
    coherenciaCtx?: EscCoherenciaContexto;
  },
): void {
  const seg = form.seguimientosProgramadosConcentrados || [];
  const ev = form.eventosConcentrados || [];
  const met = derivarMetricasSeguimientoYEventos(seg, ev);

  form.numeroSeguimientosProgramados = met.numeroSeguimientosProgramados;
  form.numeroSeguimientosRealizados = met.numeroSeguimientosRealizados;
  form.numeroInasistencias = met.numeroInasistencias;
  form.numeroCancelaciones = met.numeroCancelaciones;
  form.numeroReprogramaciones = met.numeroReprogramaciones;
  form.porcentajeAsistencia = met.porcentajeAsistencia;
  form.numeroEventosValidos = met.numeroEventosValidos;

  const indCompleto = derivarResumenIndicadoresCompleto(ev);
  const indSlim = proyectarResumenIndicadoresParaPersistencia(indCompleto);
  if (indSlim) form.resumenIndicadores = indSlim;
  else delete form.resumenIndicadores;

  if (opts?.recalcDatosFaltantes !== false) {
    form.datosFaltantesRelevantes = derivarDatosFaltantesDesdeUltimoEvento(ev);
  }

  const nEv = typeof form.numeroEventosIncluidos === 'number' ? form.numeroEventosIncluidos : 0;

  const derivarEstructura =
    opts?.sobrescribirInterpretacionAutomatizada === true || opts?.preservarJuicioClinicoRiesgo === true;

  if (derivarEstructura) {
    const rc = derivarResumenCondicionesDesdeEventos(ev, opts?.coherenciaCtx);
    if (rc) form.resumenCondiciones = rc;
    else delete form.resumenCondiciones;

    const cons = inferirConsistenciaSeguimiento(met, nEv);
    form.consistenciaSeguimiento = cons.consistenciaSeguimiento;
    const evValOk = typeof met.numeroEventosValidos === 'number' ? met.numeroEventosValidos : 0;
    const risk = inferirNivelRiesgoLongitudinalDescontrol({
      resumenIndicadores: indCompleto ?? form.resumenIndicadores,
      resumenCondiciones: form.resumenCondiciones,
      metricas: met,
      nEventosIncluidos: nEv,
      numeroEventosValidos: evValOk,
      datosFaltantesCount: Array.isArray(form.datosFaltantesRelevantes) ? form.datosFaltantesRelevantes.length : 0,
      eventosConcentrados: ev,
    });
    form.tendenciaLongitudinal = risk.tendenciaLongitudinal;

    if (opts?.sobrescribirInterpretacionAutomatizada === true && opts?.preservarJuicioClinicoRiesgo !== true) {
      form.nivelRiesgoLongitudinal = risk.nivelRiesgoLongitudinal;
      form.interpretacionRiesgoLongitudinal = risk.interpretacionRiesgoLongitudinal;
    }
    delete form.factoresPersistentes;
    delete form.alertasRelevantes;
  } else if (opts?.aplicarInterpretacionInferidaSiVacio) {
    const infer = inferirConsistenciaYNivelRiesgo(met, nEv, {
      resumenIndicadores: indCompleto ?? form.resumenIndicadores,
      resumenCondiciones: form.resumenCondiciones,
      datosFaltantesRelevantes: form.datosFaltantesRelevantes,
      eventosConcentrados: ev,
    });
    if (!form.consistenciaSeguimiento) form.consistenciaSeguimiento = infer.consistenciaSeguimiento;
    if (!form.nivelRiesgoLongitudinal) form.nivelRiesgoLongitudinal = infer.nivelRiesgoLongitudinal;
    if (!form.tendenciaLongitudinal) form.tendenciaLongitudinal = infer.tendenciaLongitudinal;
    if (!form.interpretacionRiesgoLongitudinal) form.interpretacionRiesgoLongitudinal = infer.interpretacionRiesgoLongitudinal;
  }

  const ctx = derivarContextoTerapeutico({
    eventosConcentrados: ev,
    resumenIndicadores: form.resumenIndicadores,
    tendenciaLongitudinal: form.tendenciaLongitudinal,
  });
  if (ctx.length) form.contextoTerapeutico = ctx;
  else delete form.contextoTerapeutico;
}
