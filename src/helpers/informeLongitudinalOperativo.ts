/**
 * Derivaciones operativas y borradores de texto para Informe longitudinal cardiometabólico (cliente).
 * Las fórmulas están documentadas; validar frente al negocio si hace falta.
 */
import type {
  CondicionControlResumenInformeLongitudinal,
  CondicionObesidadResumenInformeLongitudinal,
  EventoConcentradoCardiometabolicoEsc,
  InformeLongitudinalCardiometabolico,
  ResumenCondicionesCardiometabolicasInformeLongitudinal,
  ResumenIndicadoresLongitudinalEsc,
  ResumenIndicadorLongitudinalEsc,
  SeguimientoProgramadoConcentradoCardiometabolicoEsc,
} from '@/interfaces/documentos.inteface';
import {
  CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL,
  GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA,
} from '@/helpers/informeLongitudinalCardiometabolicoOptions';
import {
  CONFIG_UMBRALES_SEVERIDAD_ILC,
  inferirNivelRiesgoLongitudinalDescontrol,
  inferirTendenciaLongitudinalAgregada,
} from '@/helpers/informeLongitudinalRiesgoTrayectoria';
import { resumenRegimenTratamientoEnPeriodo } from '@/helpers/informeLongitudinalTratamiento';
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

function parseFechaComparable(f?: string): number {
  if (!f || typeof f !== 'string') return NaN;
  const t = Date.parse(f.includes('T') ? f : `${f}T12:00:00.000Z`);
  return Number.isNaN(t) ? NaN : t;
}

/** Ordena por `fechaControl` ascendente y descarta sin fecha válida para series. */
function eventosCronologicos(events: EventoConcentradoCardiometabolicoEsc[]): EventoConcentradoCardiometabolicoEsc[] {
  return [...events]
    .filter((e) => typeof e.fechaControl === 'string' && Number.isFinite(parseFechaComparable(e.fechaControl)))
    .sort((a, b) => parseFechaComparable(a.fechaControl!) - parseFechaComparable(b.fechaControl!));
}

function buildIndicador(
  valoresConFecha: { v: number; idx: number }[],
): ResumenIndicadorLongitudinalEsc | undefined {
  const nums = valoresConFecha.filter((x) => !Number.isNaN(x.v));
  if (nums.length === 0) return undefined;
  const primero = nums[0];
  const ultimo = nums[nums.length - 1];
  const mejor = Math.min(...nums.map((x) => x.v));
  const peor = Math.max(...nums.map((x) => x.v));
  const inicial = primero!.v;
  const final = ultimo!.v;
  const cambioAbsoluto = final - inicial;
  const cambioPorcentual =
    inicial !== 0 ? Math.round(((final - inicial) / Math.abs(inicial)) * 10000) / 100 : undefined;
  return {
    valorInicial: inicial,
    valorFinal: final,
    cambioAbsoluto,
    cambioPorcentual,
    mejorValor: mejor,
    peorValor: peor,
    tieneDatosSuficientes: nums.length >= 2,
    numeroMediciones: nums.length,
    tendencia:
      nums.length < 2
        ? undefined
        : cambioAbsoluto < -0.0001
          ? 'Mejoría'
          : cambioAbsoluto > 0.0001
            ? 'Empeoramiento'
            : 'Estable',
    interpretacion: nums.length < 2 ? undefined : `Serie longitudinal (${nums.length} mediciones incluidas en el informe).`,
  };
}

/**
 * Serie mínima para TA (sist/diast), peso, IMC, glucosa y HbA1c (sin lípidos en este resumen).
 * Cada eje solo aparece si hay al menos un valor; tendencia solo con ≥2 mediciones (`buildIndicador`).
 */
export function derivarResumenIndicadoresMinimo(
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): ResumenIndicadoresLongitudinalEsc | undefined {
  const cron = eventosCronologicos(Array.isArray(eventosConcentrados) ? eventosConcentrados : []);
  if (cron.length === 0) return undefined;

  const tas: { v: number; idx: number }[] = [];
  const tasDia: { v: number; idx: number }[] = [];
  const peso: { v: number; idx: number }[] = [];
  const imc: { v: number; idx: number }[] = [];
  const glu: { v: number; idx: number }[] = [];
  const hba: { v: number; idx: number }[] = [];

  cron.forEach((e, idx) => {
    const sis = e.signosVitales?.tensionArterialSistolica;
    const dia = e.signosVitales?.tensionArterialDiastolica;
    if (sis != null && !Number.isNaN(Number(sis))) tas.push({ v: Number(sis), idx });
    if (dia != null && !Number.isNaN(Number(dia))) tasDia.push({ v: Number(dia), idx });
    const pv = e.somatometria?.peso;
    if (pv != null && !Number.isNaN(Number(pv))) peso.push({ v: Number(pv), idx });
    const imcv = e.somatometria?.indiceMasaCorporal;
    if (imcv != null && !Number.isNaN(Number(imcv))) imc.push({ v: Number(imcv), idx });
    const g = e.laboratorio?.glucosaMgDl;
    if (g != null && !Number.isNaN(Number(g))) glu.push({ v: Number(g), idx });
    const h = e.laboratorio?.hba1cPorcentaje;
    if (h != null && !Number.isNaN(Number(h))) hba.push({ v: Number(h), idx });
  });

  const out: ResumenIndicadoresLongitudinalEsc = {};
  const iS = buildIndicador(tas);
  const iD = buildIndicador(tasDia);
  const iPeso = buildIndicador(peso);
  const iImc = buildIndicador(imc);
  const iGlu = buildIndicador(glu);
  const iHba = buildIndicador(hba);
  if (iS) out.tensionArterialSistolica = iS;
  if (iD) out.tensionArterialDiastolica = iD;
  if (iPeso) out.peso = iPeso;
  if (iImc) out.indiceMasaCorporal = iImc;
  if (iGlu) out.glucosaMgDl = iGlu;
  if (iHba) out.hba1cPorcentaje = iHba;

  return Object.keys(out).length ? out : undefined;
}

function partesCondicionControl(b: CondicionControlResumenInformeLongitudinal): string[] {
  const parts: string[] = [];
  if (b.presente != null) parts.push(`Presente: ${b.presente ? 'Sí' : 'No'}`);
  if (b.estadoActual) parts.push(`Estado: ${b.estadoActual}`);
  if (b.tendencia) parts.push(`Tendencia: ${b.tendencia}`);
  if (b.interpretacionAutomatica) parts.push(b.interpretacionAutomatica);
  if (b.observaciones) parts.push(b.observaciones);
  return parts;
}

function partesObesidadResumen(b: CondicionObesidadResumenInformeLongitudinal): string[] {
  const parts: string[] = [];
  if (b.presente != null) parts.push(`Presente: ${b.presente ? 'Sí' : 'No'}`);
  if (b.gradoActual) parts.push(`Grado: ${b.gradoActual}`);
  if (b.tendencia) parts.push(`Tendencia: ${b.tendencia}`);
  if (b.interpretacionAutomatica) parts.push(b.interpretacionAutomatica);
  if (b.observaciones) parts.push(b.observaciones);
  return parts;
}

/**
 * Una línea legible por condición a partir de `resumenCondiciones` (p. ej. backend o futura derivación).
 * Omite bloques sin información útil.
 */
export function derivarFactoresPersistentesDesdeCondiciones(
  rc: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined,
): string[] {
  if (!rc || typeof rc !== 'object') return [];
  const out: string[] = [];
  const pushLine = (titulo: string, parts: string[]) => {
    if (!parts.length) return;
    out.push(`${titulo}: ${parts.join(' · ')}`);
  };
  if (rc.hipertension) pushLine('Hipertensión arterial', partesCondicionControl(rc.hipertension));
  if (rc.diabetes) pushLine('Diabetes mellitus', partesCondicionControl(rc.diabetes));
  if (rc.dislipidemia) pushLine('Dislipidemia', partesCondicionControl(rc.dislipidemia));
  if (rc.obesidad) pushLine('Obesidad', partesObesidadResumen(rc.obesidad));
  return out;
}

export interface ParamsAlertasAutomaticas {
  numeroEventosIncluidos: number;
  metricas: MetricasDerivadasSeguimiento;
  datosFaltantesRelevantes: string[] | undefined;
  resumenIndicadores: ResumenIndicadoresLongitudinalEsc | undefined;
}

/**
 * Alertas operativas: huecos de datos, baja densidad de mediciones estructuradas y tendencias desfavorables.
 */
export function derivarAlertasRelevantesAutomaticas(p: ParamsAlertasAutomaticas): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    out.push(t);
  };

  for (const d of p.datosFaltantesRelevantes || []) {
    push(`[Datos] ${d}`);
  }

  const nev = typeof p.numeroEventosIncluidos === 'number' ? p.numeroEventosIncluidos : 0;
  const evOk = typeof p.metricas.numeroEventosValidos === 'number' ? p.metricas.numeroEventosValidos : 0;
  if (nev > 0 && evOk === 0) {
    push(
      '[Cobertura] Los eventos incluidos no aportan suficientes mediciones estructuradas (TA completa, IMC o laboratorio mínimo) para tendencias robustas en este informe.',
    );
  }

  const r = p.resumenIndicadores;
  if (r && typeof r === 'object') {
    const pares: [string, ResumenIndicadorLongitudinalEsc | undefined][] = [
      ['TA sistólica', r.tensionArterialSistolica],
      ['TA diastólica', r.tensionArterialDiastolica],
      ['Peso', r.peso],
      ['IMC', r.indiceMasaCorporal],
      ['Glucosa', r.glucosaMgDl],
      ['HbA1c', r.hba1cPorcentaje],
    ];
    for (const [label, o] of pares) {
      if (o?.tendencia === 'Empeoramiento') {
        push(`[Tendencia] ${label}: empeoramiento en el periodo; interpretar en contexto clínico.`);
      }
    }
  }

  return out;
}

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

export interface SugerenciasNarrativa {
  resumenLongitudinalSugerido: string;
  conclusionClinicaSugerida: string;
  recomendacionesSugeridas: string;
  limitacionesSugeridas: string;
}

function lineaFmtPeriodo(pin?: string, pfin?: string): string {
  if (pin && pfin) return `${pin} – ${pfin}`;
  return '[periodo no definido]';
}

/**
 * Textos tipo borrador. No sustituyen criterio clínico; el médico edita los campos “finales”.
 */
export function derivarTextoSugerido(
  form: Pick<
    InformeLongitudinalCardiometabolico,
    | 'periodoInicio'
    | 'periodoFin'
    | 'fechaUltimoEventoConsiderado'
    | 'numeroEventosIncluidos'
    | 'numeroSeguimientosProgramados'
  > &
    Partial<
      Pick<
        InformeLongitudinalCardiometabolico,
        'fechaInformeLongitudinalCardiometabolico' | 'eventosConcentrados'
      >
    >,
  m: MetricasDerivadasSeguimiento,
): SugerenciasNarrativa {
  const periodo = lineaFmtPeriodo(form.periodoInicio, form.periodoFin);
  const nev = typeof form.numeroEventosIncluidos === 'number' ? form.numeroEventosIncluidos : 0;
  const ns = typeof form.numeroSeguimientosProgramados === 'number' ? form.numeroSeguimientosProgramados : 0;
  const as = m.porcentajeAsistencia;

  let resumen = `Seguimiento longitudinal cardiometabólico (${periodo}). `;
  resumen += `Se incluyen ${nev} evento(s) clínico(s) en el expediente seleccionado. `;
  if (ns > 0) {
    resumen += `Cit(s) de agenda consideradas (excl. estado Realizada): ${ns}. Eventos de seguimiento incluidos en el informe: ${m.numeroSeguimientosRealizados}; `;
    resumen += `No asistió: ${m.numeroInasistencias}; Cancelada: ${m.numeroCancelaciones}.`;
    if (m.numeroReprogramaciones > 0) resumen += ` Hay ${m.numeroReprogramaciones} registro(s) con indicación de reprogramación.`;
    if (typeof as === 'number')
      resumen += ` Proporción eventos incluidos / (eventos + inasistencias + cancelaciones en agenda): ~${as} %.`;
    resumen += ' ';
  } else {
    resumen += ' No hay citas de agenda seleccionadas fuera de estado Realizada en este periodo. ';
  }

  const evVal = typeof m.numeroEventosValidos === 'number' ? m.numeroEventosValidos : 0;
  if (nev > 0) resumen += `Eventos con al menos datos de TA, IMC o laboratorio (${evVal} de ${nev}).`;

  let conclusion =
    nev === 0
      ? 'Con la selección actual no hay suficientes eventos para una conclusión clínica estructurada.'
      : 'Interpretación clínica pendiente de revisión médica tras validar valores y línea de tiempo seleccionados.';

  let recom =
    nev === 0
      ? 'Revisar el periodo o las fuentes en el paso 1 antes de cerrar.'
      : 'Validar objetivos individuales (TA, lípidos y glucemia/HbA1c) y próximos controles según guiía clínica aplicable.';
  recom += typeof form.fechaUltimoEventoConsiderado === 'string'
    ? ` Último evento registrado incluido: ${form.fechaUltimoEventoConsiderado}.`
    : '';

  const lim =
    'Estas líneas son sugerencias generadas automáticamente a partir del expediente disponible en el momento; pueden existir errores por datos incompletos o actualizaciones externas.';
  return {
    resumenLongitudinalSugerido: resumen.trim(),
    conclusionClinicaSugerida: conclusion,
    recomendacionesSugeridas: recom,
    limitacionesSugeridas: lim,
  };
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

/** Coincide con backend `GRAFICAS_LONGITUDINAL_DEFAULT` (tres primeras del catálogo local). */
export function graficasIncluidasPorDefecto(): string[] {
  return [GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[0]!, GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[1]!, GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[2]!];
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

/**
 * Aplica métricas, borradores de recomendaciones/limitaciones, resumen de indicadores y datos faltantes.
 * Con `sobrescribirInterpretacionAutomatizada: true` (montaje Step2) también fija riesgo, interpretación del riesgo,
 * consistencia ordinal, factores y alertas, y elimina conclusión/resumen (finales y sugeridos) del modelo.
 */
export function aplicarIteracionDosAlFormulario(
  form: InformeLongitudinalCardiometabolico,
  opts?: {
    aplicarInterpretacionInferidaSiVacio?: boolean;
    prellenarGraficasSiVacio?: boolean;
    /** Sobrescribe `datosFaltantesRelevantes` con lo derivado (evita fusión manual en esta iteración). */
    recalcDatosFaltantes?: boolean;
    /**
     * Si es `true`, asigna siempre riesgo, interpretación del riesgo, consistencia, factores y alertas desde
     * heurísticas y borra `resumenLongitudinal` / `conclusionClinica` y borradores de resumen/conclusión.
     */
    sobrescribirInterpretacionAutomatizada?: boolean;
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

  const textos = derivarTextoSugerido(form, met);
  form.recomendacionesSugeridas = textos.recomendacionesSugeridas;
  form.limitacionesSugeridas = textos.limitacionesSugeridas;
  delete form.resumenLongitudinalSugerido;
  delete form.conclusionClinicaSugerida;

  const ind = derivarResumenIndicadoresMinimo(ev);
  if (ind) form.resumenIndicadores = ind;
  else delete form.resumenIndicadores;

  if (opts?.recalcDatosFaltantes !== false) {
    form.datosFaltantesRelevantes = derivarDatosFaltantesDesdeUltimoEvento(ev);
  }

  const nEv = typeof form.numeroEventosIncluidos === 'number' ? form.numeroEventosIncluidos : 0;

  if (opts?.sobrescribirInterpretacionAutomatizada === true) {
    const cons = inferirConsistenciaSeguimiento(met, nEv);
    form.consistenciaSeguimiento = cons.consistenciaSeguimiento;
    delete form.interpretacionConsistenciaSeguimiento;
    const evValOk = typeof met.numeroEventosValidos === 'number' ? met.numeroEventosValidos : 0;
    const risk = inferirNivelRiesgoLongitudinalDescontrol({
      resumenIndicadores: form.resumenIndicadores,
      resumenCondiciones: form.resumenCondiciones,
      metricas: met,
      nEventosIncluidos: nEv,
      numeroEventosValidos: evValOk,
      datosFaltantesCount: Array.isArray(form.datosFaltantesRelevantes) ? form.datosFaltantesRelevantes.length : 0,
      eventosConcentrados: ev,
    });
    form.nivelRiesgoLongitudinal = risk.nivelRiesgoLongitudinal;
    form.tendenciaLongitudinal = risk.tendenciaLongitudinal;
    form.interpretacionRiesgoLongitudinal = risk.interpretacionRiesgoLongitudinal;
    delete form.resumenLongitudinal;
    delete form.conclusionClinica;
    form.factoresPersistentes = derivarFactoresPersistentesDesdeCondiciones(form.resumenCondiciones);
    form.alertasRelevantes = derivarAlertasRelevantesAutomaticas({
      numeroEventosIncluidos: nEv,
      metricas: met,
      datosFaltantesRelevantes: form.datosFaltantesRelevantes,
      resumenIndicadores: form.resumenIndicadores,
    });
  } else if (opts?.aplicarInterpretacionInferidaSiVacio) {
    const infer = inferirConsistenciaYNivelRiesgo(met, nEv, {
      resumenIndicadores: form.resumenIndicadores,
      resumenCondiciones: form.resumenCondiciones,
      datosFaltantesRelevantes: form.datosFaltantesRelevantes,
      eventosConcentrados: ev,
    });
    if (!form.consistenciaSeguimiento) form.consistenciaSeguimiento = infer.consistenciaSeguimiento;
    if (!form.nivelRiesgoLongitudinal) form.nivelRiesgoLongitudinal = infer.nivelRiesgoLongitudinal;
    if (!form.tendenciaLongitudinal) form.tendenciaLongitudinal = infer.tendenciaLongitudinal;
    if (!form.interpretacionRiesgoLongitudinal) form.interpretacionRiesgoLongitudinal = infer.interpretacionRiesgoLongitudinal;
  }

  if (opts?.prellenarGraficasSiVacio === true && (!form.graficasIncluidas || form.graficasIncluidas.length === 0)) {
    form.graficasIncluidas = graficasIncluidasPorDefecto();
  }

  const ctx = derivarContextoTerapeutico({
    eventosConcentrados: ev,
    resumenIndicadores: form.resumenIndicadores,
    tendenciaLongitudinal: form.tendenciaLongitudinal,
  });
  if (ctx.length) form.contextoTerapeutico = ctx;
  else delete form.contextoTerapeutico;
}
