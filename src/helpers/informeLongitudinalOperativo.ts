/**
 * Derivaciones operativas y borradores de texto para Informe longitudinal cardiometabólico (cliente).
 * Las fórmulas están documentadas; validar frente al negocio si hace falta.
 */
import type {
  EventoConcentradoCardiometabolicoEsc,
  InformeLongitudinalCardiometabolico,
  ResumenIndicadoresLongitudinalEsc,
  ResumenIndicadorLongitudinalEsc,
  SeguimientoProgramadoConcentradoCardiometabolicoEsc,
} from '@/interfaces/documentos.inteface';
import {
  CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL,
  GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA,
  NIVEL_RIESGO_LONGITUDINAL,
} from '@/helpers/informeLongitudinalCardiometabolicoOptions';

/** Valores exactos de `EstadoSeguimientoProgramadoCardiometabolico` (backend). */
export const ESTADO_SEGUIMIENTO_PROG = {
  PROGRAMADA: 'Programada',
  REALIZADA: 'Realizada',
  NO_ASISTIO: 'No asistió',
  CANCELADA: 'Cancelada',
} as const;

export interface MetricasDerivadasSeguimiento {
  numeroSeguimientosProgramados: number;
  numeroSeguimientosRealizados: number;
  numeroInasistencias: number;
  numeroCancelaciones: number;
  /** Registros con indicio de reprogramación (`fechaReprogramada` o enlace desde Step1). */
  numeroReprogramaciones: number;
  /**
   * Entre citas ya “cerradas” (Realizada / No asistió / Cancelada): % de Realizada.
   * Se excluyen citas únicamente `Programada` del denominador por ser pendientes/inciertas en el informe actual.
   */
  porcentajeAsistencia: number | undefined;
  numeroEventosValidos?: number;
}

function normEstado(estado?: string): string | undefined {
  if (typeof estado !== 'string') return undefined;
  return estado.trim();
}

/**
 * `% asistencia` = realizadas / (realizadas + inasistencias + cancelaciones) cuando el denominador > 0.
 * Si todas las seleccionadas siguen solo en `Programada`, no hay muestra cerrada ⇒ `undefined`.
 */
export function calcularPorcentajeAsistenciaCerradas(
  nRealizada: number,
  nNoAsistio: number,
  nCancelada: number,
): number | undefined {
  const denom = nRealizada + nNoAsistio + nCancelada;
  if (denom <= 0) return undefined;
  return Math.round((100 * nRealizada) / denom * 10) / 10;
}

/**
 * Métricas a partir de `seguimientosProgramadosConcentrados` (debe estar al día con selección paso 1).
 */
export function derivarMetricasSeguimientoYEventos(
  seguimientos: SeguimientoProgramadoConcentradoCardiometabolicoEsc[] | undefined,
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): MetricasDerivadasSeguimiento {
  const lista = Array.isArray(seguimientos) ? seguimientos : [];
  let nRealizada = 0;
  let nNoAsistio = 0;
  let nCancelada = 0;
  let nProgramada = 0;
  let nReprog = 0;

  for (const s of lista) {
    const e = normEstado(s.estado);
    if (e === ESTADO_SEGUIMIENTO_PROG.REALIZADA) nRealizada += 1;
    else if (e === ESTADO_SEGUIMIENTO_PROG.NO_ASISTIO) nNoAsistio += 1;
    else if (e === ESTADO_SEGUIMIENTO_PROG.CANCELADA) nCancelada += 1;
    else if (e === ESTADO_SEGUIMIENTO_PROG.PROGRAMADA) nProgramada += 1;

    const reprog =
      Boolean(s.esResultadoDeReprogramacion || (s.fechaReprogramada && String(s.fechaReprogramada).trim() !== ''));
    if (reprog) nReprog += 1;
  }

  const evList = Array.isArray(eventosConcentrados) ? eventosConcentrados : [];

  void nProgramada; // citas pendientes incluidas en lista pero fuera del denominador de asistencia

  const numeroSeguimientosProgramados = lista.length;
  return {
    numeroSeguimientosProgramados,
    numeroSeguimientosRealizados: nRealizada,
    numeroInasistencias: nNoAsistio,
    numeroCancelaciones: nCancelada,
    numeroReprogramaciones: nReprog,
    porcentajeAsistencia: calcularPorcentajeAsistenciaCerradas(nRealizada, nNoAsistio, nCancelada),
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
    resumen += `Cit(s) operativa(s) relacionadas: ${ns}. Seguimiento programado cerrado — Realizada: ${m.numeroSeguimientosRealizados}; `;
    resumen += `No asistió: ${m.numeroInasistencias}; Cancelada: ${m.numeroCancelaciones}.`;
    if (m.numeroReprogramaciones > 0) resumen += ` Hay ${m.numeroReprogramaciones} registro(s) con indicación de reprogramación.`;
    if (typeof as === 'number') resumen += ` Asistencia a citas cerradas (Realizada sobre Realizada+Inasistencia+Cancelada): ~${as} %.`;
    resumen += ' ';
  } else {
    resumen += ' No hay seguimientos programados seleccionados en este periodo. ';
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

/**
 * Heurística conservadora para selects; no reemplaza juicio clínico.
 */
export function inferirConsistenciaYNivelRiesgo(
  m: MetricasDerivadasSeguimiento,
  nEventosIncluidos: number,
): { consistenciaSeguimiento?: string; nivelRiesgoLongitudinal?: string; interpretacionRiesgoLongitudinal?: string } {
  const consistente = CONSISTENCIA_SEGUIMIENTO_LONGITUDINAL as readonly string[];
  const riesgo = NIVEL_RIESGO_LONGITUDINAL as readonly string[];
  const noVal = 'No valorable';
  if (nEventosIncluidos <= 0) {
    return {
      consistenciaSeguimiento: noVal,
      nivelRiesgoLongitudinal: noVal,
      interpretacionRiesgoLongitudinal: 'Datos insuficientes: no hay eventos clínicos incluidos en el periodo seleccionado.',
    };
  }
  const pct = m.porcentajeAsistencia;
  let cons: string = consistente[0]!; // Adecuado
  if (typeof pct === 'number' && pct < 50 && m.numeroSeguimientosProgramados > 0)
    cons = consistente[2]!; // Insuficiente
  else if (typeof pct === 'number' && pct < 70 && pct >= 50) cons = consistente[1]!; // Irregular

  let niv: string = riesgo[0]!; // Bajo
  const evValOk = typeof m.numeroEventosValidos === 'number' ? m.numeroEventosValidos : 0;
  if (evValOk === 0) niv = riesgo[3]!; // No valorable
  else {
    if (typeof pct === 'number' && pct < 40) niv = riesgo[2]!; // Alto
    else if (typeof pct === 'number' && pct < 65) niv = riesgo[1]!; // Moderado
  }

  return {
    consistenciaSeguimiento: cons,
    nivelRiesgoLongitudinal: niv,
    interpretacionRiesgoLongitudinal:
      `Valores automáticos preliminares según asistencia a citas cerradas${typeof pct === 'number' ? ` (~${pct} %)` : ''} y número de eventos con datos estructurados (${evValOk}). Requiere validación médica.`,
  };
}

/** Coincide con backend `GRAFICAS_LONGITUDINAL_DEFAULT` (tres primeras del catálogo local). */
export function graficasIncluidasPorDefecto(): string[] {
  return [GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[0]!, GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[1]!, GRAFICAS_LONGITUDINAL_CARDIOMETABOLICA[2]!];
}

/** Aplica métricas, sugeridos, opcional indicadores si `soloSugeridos`; no toca texto final hasta que el médico los edite solo. */
export function aplicarIteracionDosAlFormulario(
  form: InformeLongitudinalCardiometabolico,
  opts?: {
    aplicarInterpretacionInferidaSiVacio?: boolean;
    prellenarGraficasSiVacio?: boolean;
    /** Sobrescribe `datosFaltantesRelevantes` con lo derivado (evita fusión manual en esta iteración). */
    recalcDatosFaltantes?: boolean;
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
  form.resumenLongitudinalSugerido = textos.resumenLongitudinalSugerido;
  form.conclusionClinicaSugerida = textos.conclusionClinicaSugerida;
  form.recomendacionesSugeridas = textos.recomendacionesSugeridas;
  form.limitacionesSugeridas = textos.limitacionesSugeridas;

  const ind = derivarResumenIndicadoresMinimo(ev);
  if (ind) form.resumenIndicadores = ind;

  if (opts?.recalcDatosFaltantes !== false) {
    form.datosFaltantesRelevantes = derivarDatosFaltantesDesdeUltimoEvento(ev);
  }

  if (opts?.aplicarInterpretacionInferidaSiVacio) {
    const nEv = typeof form.numeroEventosIncluidos === 'number' ? form.numeroEventosIncluidos : 0;
    const infer = inferirConsistenciaYNivelRiesgo(met, nEv);
    if (!form.consistenciaSeguimiento) form.consistenciaSeguimiento = infer.consistenciaSeguimiento;
    if (!form.nivelRiesgoLongitudinal) form.nivelRiesgoLongitudinal = infer.nivelRiesgoLongitudinal;
    if (!form.interpretacionRiesgoLongitudinal) form.interpretacionRiesgoLongitudinal = infer.interpretacionRiesgoLongitudinal;
  }

  if (opts?.prellenarGraficasSiVacio === true && (!form.graficasIncluidas || form.graficasIncluidas.length === 0)) {
    form.graficasIncluidas = graficasIncluidasPorDefecto();
  }
}
