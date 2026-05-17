/**
 * Riesgo longitudinal (severidad del periodo) vs trayectoria agregada (tendencia del periodo).
 * Umbrales heurísticos documentados en CONFIG_UMBRALES_SEVERIDAD_ILC; validación médica obligatoria.
 */
import type {
  CondicionControlResumenInformeLongitudinal,
  CondicionObesidadResumenInformeLongitudinal,
  EventoConcentradoCardiometabolicoEsc,
  ResumenCondicionesCardiometabolicasInformeLongitudinal,
  ResumenIndicadoresLongitudinalEsc,
  ResumenIndicadorLongitudinalEsc,
} from '@/interfaces/documentos.inteface';
import { NIVEL_RIESGO_LONGITUDINAL, TENDENCIA_LONGITUDINAL_INFORME } from '@/helpers/informeLongitudinalCardiometabolicoOptions';

/** Subconjunto de métricas para residual (evita dependencia circular con `informeLongitudinalOperativo`). */
export interface MetricasInferenciaResidual {
  porcentajeAsistencia?: number;
  numeroSeguimientosProgramados: number;
}

/** Umbrales discretos por eje (mg/dL, %, mmHg, kg/m²). Ajustar aquí sin tocar la lógica de composición. */
export const CONFIG_UMBRALES_SEVERIDAD_ILC = {
  glucosaCritica: 400,
  glucosaAlto: 300,
  glucosaModeradoAlto: 250,
  glucosaModerado: 180,
  glucosaLeve: 126,
  hba1cCritica: 12,
  hba1cAlto: 10,
  hba1cModerado: 8,
  hba1cLeve: 7,
  taSistCritica: 180,
  taSistAlto: 160,
  taSistConDiastCritica: 160,
  taDiastParaSistAlto: 110,
  taSistModerado: 150,
  taSistLeve: 140,
  taDiastAlto: 110,
  taDiastModerado: 100,
  taDiastLeve: 90,
  taAcopladaSistMin: 140,
  taAcopladaDiastMin: 90,
  imcAlto: 40,
  imcModeradoAlto: 35,
  imcModerado: 30,
  imcObesidadGradoSevero: 35,
  datosFaltantesMuchos: 8,
  datosFaltantesModerados: 4,
  /** Mínimo de ejes con `tieneDatosSuficientes` para inferir trayectoria agregada. */
  minEjesConSerieParaTrayectoria: 1,
} as const;

export interface DriversInformeLongitudinal {
  riesgo: string[];
  advertencias: string[];
  datosInsuficientes: boolean;
  motivosDatosInsuficientes?: string[];
}

export interface ParamsInferenciaRiesgoDescontrol {
  resumenIndicadores: ResumenIndicadoresLongitudinalEsc | undefined;
  resumenCondiciones: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined;
  metricas: MetricasInferenciaResidual;
  nEventosIncluidos: number;
  numeroEventosValidos: number;
  datosFaltantesCount: number;
  /** Para pisos por visita (DM2 no controlada en ≥2 eventos). */
  eventosConcentrados?: EventoConcentradoCardiometabolicoEsc[] | undefined;
}

export interface InferenciaRiesgoTendenciaResult {
  nivelRiesgoLongitudinal?: string;
  tendenciaLongitudinal?: string;
  interpretacionRiesgoLongitudinal?: string;
  /** Para pruebas y depuración; no persistido en el modelo principal. */
  drivers?: DriversInformeLongitudinal;
}

function esEstadoNoControlado(estado?: string): boolean {
  if (!estado || typeof estado !== 'string') return false;
  const u = estado.toUpperCase();
  return u.includes('NO_CONTROL') || u.includes('NO CONTROL');
}

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function maxPair(peor?: number, final?: number): number | undefined {
  const a = num(peor);
  const b = num(final);
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

/** Ordinal 0=Muy Bajo … 4=Crítico (solo severidad absoluta del eje). */
function ordinalGlucosa(v: number): number {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (v >= c.glucosaCritica) return 4;
  if (v >= c.glucosaAlto) return 3;
  if (v >= c.glucosaModeradoAlto) return 3;
  if (v >= c.glucosaModerado) return 2;
  if (v >= c.glucosaLeve) return 1;
  return 0;
}

function ordinalHbA1c(v: number): number {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (v >= c.hba1cCritica) return 4;
  if (v >= c.hba1cAlto) return 3;
  if (v >= c.hba1cModerado) return 2;
  if (v >= c.hba1cLeve) return 1;
  return 0;
}

/** Usa el peor par sist/diast del periodo (máximo entre peorValor y valorFinal por componente). */
function ordinalTension(sistMax: number, diastMax: number): number {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  let o = 0;
  if (sistMax >= c.taSistCritica) o = 4;
  else if (sistMax >= c.taSistAlto && diastMax >= c.taDiastParaSistAlto) o = 4;
  else if (sistMax >= c.taSistAlto) o = 3;
  else if (sistMax >= c.taSistModerado) o = 2;
  else if (sistMax >= c.taSistLeve) o = 1;

  let od = 0;
  if (diastMax >= c.taDiastAlto) od = 3;
  else if (diastMax >= c.taDiastModerado) od = 2;
  else if (diastMax >= c.taDiastLeve) od = 1;

  let pair = Math.max(o, od);
  if (sistMax >= c.taAcopladaSistMin && diastMax >= c.taAcopladaDiastMin) pair = Math.max(pair, 2);
  return pair;
}

function ordinalImc(v: number): number {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (v >= c.imcAlto) return 3;
  if (v >= c.imcModeradoAlto) return 3;
  if (v >= c.imcModerado) return 2;
  return 0;
}

function indicadorValores(o: ResumenIndicadorLongitudinalEsc | undefined): {
  peor?: number;
  final?: number;
  nMed?: number;
} {
  if (!o) return {};
  return {
    peor: num(o.peorValor),
    final: num(o.valorFinal),
    nMed: typeof o.numeroMediciones === 'number' ? o.numeroMediciones : undefined,
  };
}

function evaluarSeveridadPorEjes(ind: ResumenIndicadoresLongitudinalEsc | undefined): {
  ordinalEjes: number;
  glucPeor?: number;
  hbaPeor?: number;
  sistPeor?: number;
  diastPeor?: number;
  nMedGluc?: number;
  nMedHba?: number;
} {
  if (!ind) return { ordinalEjes: 0 };
  const g = indicadorValores(ind.glucosaMgDl);
  const h = indicadorValores(ind.hba1cPorcentaje);
  const s = indicadorValores(ind.tensionArterialSistolica);
  const d = indicadorValores(ind.tensionArterialDiastolica);
  const im = indicadorValores(ind.indiceMasaCorporal);

  const glucMax = maxPair(g.peor, g.final);
  const hbaMax = maxPair(h.peor, h.final);
  const sistMax = maxPair(s.peor, s.final);
  const diastMax = maxPair(d.peor, d.final);
  const imcMax = maxPair(im.peor, im.final);

  let maxOrd = 0;
  if (glucMax != null) maxOrd = Math.max(maxOrd, ordinalGlucosa(glucMax));
  if (hbaMax != null) maxOrd = Math.max(maxOrd, ordinalHbA1c(hbaMax));
  if (sistMax != null && diastMax != null) maxOrd = Math.max(maxOrd, ordinalTension(sistMax, diastMax));
  else if (sistMax != null) maxOrd = Math.max(maxOrd, ordinalTension(sistMax, diastMax ?? 0));
  else if (diastMax != null) maxOrd = Math.max(maxOrd, ordinalTension(sistMax ?? 0, diastMax));
  if (imcMax != null) maxOrd = Math.max(maxOrd, ordinalImc(imcMax));

  return {
    ordinalEjes: maxOrd,
    glucPeor: glucMax ?? undefined,
    hbaPeor: hbaMax ?? undefined,
    sistPeor: sistMax ?? undefined,
    diastPeor: diastMax ?? undefined,
    nMedGluc: g.nMed,
    nMedHba: h.nMed,
  };
}

function obesidadSeveraResumen(ob: CondicionObesidadResumenInformeLongitudinal | undefined): boolean {
  if (!ob?.presente) return false;
  const g = ob.gradoActual;
  if (g === 'OBESIDAD_II' || g === 'OBESIDAD_III') return true;
  if (g === 'II' || g === 'III') return true;
  const gs = String(g || '');
  return gs.includes('OBESIDAD_II') || gs.includes('OBESIDAD_III') || gs.includes('II') || gs.includes('III');
}

function contarCondicionesNoControladas(
  rc: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined,
  imcMax?: number,
): number {
  if (!rc) return 0;
  let n = 0;
  const tri: (CondicionControlResumenInformeLongitudinal | undefined)[] = [rc.hipertension, rc.diabetes, rc.dislipidemia];
  for (const b of tri) {
    if (b?.presente === true && esEstadoNoControlado(b.estadoActual)) n += 1;
  }
  const ob = rc.obesidad;
  if (ob?.presente === true) {
    const obSev = obesidadSeveraResumen(ob);
    const imcOk =
      imcMax != null &&
      imcMax >= CONFIG_UMBRALES_SEVERIDAD_ILC.imcObesidadGradoSevero;
    if (obSev || imcOk) n += 1;
  }
  return n;
}

function ordinalPorConteoCondiciones(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

function evaluarPisosClinicos(
  rc: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined,
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
  imcMax?: number,
): number {
  let p = 0;
  const imc = imcMax ?? 0;
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (imc >= c.imcAlto) p = Math.max(p, 3);
  else if (imc >= c.imcModeradoAlto) p = Math.max(p, 2);

  const evs = Array.isArray(eventos) ? eventos : [];
  let dmNoCtrl = 0;
  for (const e of evs) {
    const st = e.estadoCondiciones as Record<string, unknown> | undefined;
    if (!st || typeof st !== 'object') continue;
    const dm = (st.diabetesMellitusTipo2 ?? st.diabetes) as { control?: string } | string | undefined;
    const ctrl = typeof dm === 'object' && dm != null && 'control' in dm ? (dm as { control?: string }).control : undefined;
    if (typeof ctrl === 'string' && esEstadoNoControlado(ctrl)) dmNoCtrl += 1;
  }
  if (dmNoCtrl >= 2) p = Math.max(p, 2);
  void rc;
  return p;
}

function controlDm2EnEvento(e: EventoConcentradoCardiometabolicoEsc): boolean {
  const st = e.estadoCondiciones as Record<string, unknown> | undefined;
  if (!st || typeof st !== 'object') return false;
  const dm = (st.diabetesMellitusTipo2 ?? st.diabetes) as { control?: string } | undefined;
  const ctrl = dm && typeof dm === 'object' ? dm.control : undefined;
  return typeof ctrl === 'string' && esEstadoNoControlado(ctrl);
}

function eventosConDm2NoControlada(eventos: EventoConcentradoCardiometabolicoEsc[] | undefined): number {
  if (!Array.isArray(eventos)) return 0;
  return eventos.filter(controlDm2EnEvento).length;
}

function evaluarResidualAcotado(
  metricas: MetricasInferenciaResidual,
  datosFaltantesCount: number,
  numeroSeguimientosProgramados: number,
): number {
  let r = 0;
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (datosFaltantesCount >= c.datosFaltantesMuchos) r += 2;
  else if (datosFaltantesCount >= c.datosFaltantesModerados) r += 1;
  r = Math.min(2, r);

  let a = 0;
  const pct = metricas.porcentajeAsistencia;
  if (typeof pct === 'number' && numeroSeguimientosProgramados > 0) {
    if (pct < 50) a = 2;
    else if (pct < 70) a = 1;
  }
  return Math.min(2, Math.max(r, a));
}

function ejesEnBandaAltaOPeorPeor(ind: ResumenIndicadoresLongitudinalEsc | undefined): number {
  if (!ind) return 0;
  const { glucPeor, hbaPeor, sistPeor, diastPeor } = evaluarSeveridadPorEjes(ind);
  let n = 0;
  if (glucPeor != null && glucPeor >= CONFIG_UMBRALES_SEVERIDAD_ILC.glucosaAlto) n += 1;
  if (hbaPeor != null && hbaPeor >= CONFIG_UMBRALES_SEVERIDAD_ILC.hba1cAlto) n += 1;
  const sp = sistPeor ?? 0;
  const dp = diastPeor ?? 0;
  if (sp >= CONFIG_UMBRALES_SEVERIDAD_ILC.taSistAlto || dp >= CONFIG_UMBRALES_SEVERIDAD_ILC.taDiastAlto) n += 1;
  return n;
}

function aplicaPromocionCritico(p: {
  ind: ResumenIndicadoresLongitudinalEsc | undefined;
  axesAlto: number;
  condNoCtrl: number;
  glucPeor?: number;
  hbaPeor?: number;
  nMedGluc?: number;
  nMedHba?: number;
  eventosDmNoCtrl: number;
  advertencias: string[];
}): boolean {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  const g = p.glucPeor;
  const h = p.hbaPeor;
  const isolatedGluc = g != null && g >= c.glucosaCritica && (p.nMedGluc ?? 0) <= 1;
  const isolatedHba = h != null && h >= c.hba1cCritica && (p.nMedHba ?? 0) <= 1;
  const mega =
    (g != null && g >= c.glucosaCritica && !isolatedGluc) || (h != null && h >= c.hba1cCritica && !isolatedHba);
  if (isolatedGluc && g != null && g >= c.glucosaCritica) {
    p.advertencias.push('Pico glucémico extremo con una sola medición en el eje; interpretar con cautela.');
  }
  if (isolatedHba && h != null && h >= c.hba1cCritica) {
    p.advertencias.push('HbA1c extrema con una sola medición en el eje; interpretar con cautela.');
  }
  if (mega) return true;
  if (p.axesAlto >= 2) return true;
  if (p.condNoCtrl >= 3 && ((g != null && g >= c.glucosaAlto) || (h != null && h >= c.hba1cAlto))) return true;
  if (
    p.eventosDmNoCtrl >= 2 &&
    ((h != null && h >= c.hba1cAlto) || (g != null && g >= c.glucosaAlto))
  ) {
    return true;
  }
  return false;
}

function ordinalANivel(o: number): string {
  const riesgo = NIVEL_RIESGO_LONGITUDINAL as readonly string[];
  const clamped = Math.max(0, Math.min(4, Math.round(o)));
  return riesgo[clamped] ?? riesgo[2]!;
}

export function inferirTendenciaLongitudinalAgregada(
  ind: ResumenIndicadoresLongitudinalEsc | undefined,
  rc: ResumenCondicionesCardiometabolicasInformeLongitudinal | undefined,
  p: {
    nEventosIncluidos: number;
    numeroEventosValidos: number;
    motivos: string[];
  },
): string {
  const ins = TENDENCIA_LONGITUDINAL_INFORME[4]!;
  if (p.nEventosIncluidos <= 0) {
    p.motivos.push('Sin eventos incluidos en el periodo.');
    return ins;
  }
  if (p.numeroEventosValidos <= 0) {
    p.motivos.push('Sin eventos con mediciones estructuradas suficientes.');
    return ins;
  }

  const minK = CONFIG_UMBRALES_SEVERIDAD_ILC.minEjesConSerieParaTrayectoria;
  const pares: ResumenIndicadorLongitudinalEsc[] = [];
  if (ind?.tensionArterialSistolica) pares.push(ind.tensionArterialSistolica);
  if (ind?.tensionArterialDiastolica) pares.push(ind.tensionArterialDiastolica);
  if (ind?.indiceMasaCorporal) pares.push(ind.indiceMasaCorporal);
  if (ind?.glucosaMgDl) pares.push(ind.glucosaMgDl);
  if (ind?.hba1cPorcentaje) pares.push(ind.hba1cPorcentaje);
  if (ind?.peso) pares.push(ind.peso);

  const conSerie = pares.filter((x) => x.tieneDatosSuficientes === true).length;
  if (conSerie < minK) {
    p.motivos.push(`Menos de ${minK} eje(s) con serie suficiente para tendencia agregada.`);
    return ins;
  }

  let mej = 0;
  let emp = 0;
  let est = 0;
  let varia = 0;
  for (const o of pares) {
    if (!o.tieneDatosSuficientes || !o.tendencia) continue;
    if (o.tendencia === 'Mejoría') mej += 1;
    else if (o.tendencia === 'Empeoramiento') emp += 1;
    else if (o.tendencia === 'Estable') est += 1;
    else if (o.tendencia === 'Variable') varia += 1;
  }

  const condTend = (b: CondicionControlResumenInformeLongitudinal | CondicionObesidadResumenInformeLongitudinal | undefined) =>
    b?.tendencia;
  const ct: string[] = [];
  if (rc?.hipertension) ct.push(condTend(rc.hipertension) || '');
  if (rc?.diabetes) ct.push(condTend(rc.diabetes) || '');
  if (rc?.dislipidemia) ct.push(condTend(rc.dislipidemia) || '');
  if (rc?.obesidad) ct.push(condTend(rc.obesidad) || '');
  for (const t of ct) {
    if (t === 'Mejoría') mej += 1;
    else if (t === 'Empeoramiento') emp += 1;
    else if (t === 'Estable') est += 1;
    else if (t === 'Variable') varia += 1;
  }

  const T = TENDENCIA_LONGITUDINAL_INFORME;
  if (varia > 0 && (mej > 0 || emp > 0)) return T[3]!;
  if (mej > emp) return T[0]!;
  if (emp > mej) return T[2]!;
  if (mej > 0 && emp > 0) return T[3]!;
  if (est >= mej && est >= emp && (mej > 0 || emp > 0)) return T[1]!;
  if (varia > 0) return T[3]!;
  return T[1]!;
}

function bucketRiesgoParaMatriz(nivel: string): 'crit' | 'alto' | 'mod' | 'bajo' | 'noval' {
  if (nivel === 'Crítico') return 'crit';
  if (nivel === 'Alto') return 'alto';
  if (nivel === 'Moderado') return 'mod';
  if (nivel === 'No valorable') return 'noval';
  return 'bajo';
}

function construirInterpretacion(params: {
  nivel: string;
  tendencia: string;
  drivers: DriversInformeLongitudinal;
}): string {
  const { nivel, tendencia, drivers: d } = params;
  const b = bucketRiesgoParaMatriz(nivel);
  const T = TENDENCIA_LONGITUDINAL_INFORME;
  let nucleo = '';
  if (tendencia === T[4]) {
    nucleo =
      'Limitación importante de datos para valorar con solidez la trayectoria y/o la severidad del periodo; no forzar conclusiones finas.';
  } else if (b === 'crit' && tendencia === T[0]) {
    nucleo =
      'Riesgo crítico pese a mejoría: antecedente de descontrol severo en el periodo; la trayectoria favorable es alentadora pero insuficiente para reclasificar como bajo riesgo.';
  } else if (b === 'alto' && tendencia === T[0]) {
    nucleo =
      'Riesgo alto por carga del periodo (picos, persistencia o multimorbilidad); la mejoría en varios ejes no elimina el riesgo acumulado ni sustituye juicio clínico.';
  } else if (b === 'mod' && tendencia === T[2]) {
    nucleo =
      'Riesgo moderado con trayectoria desfavorable: priorizar revisión de adherencia, tratamiento y seguimiento.';
  } else if (b === 'bajo' && (tendencia === T[1] || tendencia === T[0])) {
    nucleo =
      'Control relativamente estable y baja carga de riesgo en el periodo según criterios automáticos, con trayectoria favorable o estable en los ejes valorados.';
  } else if ((b === 'mod' || b === 'alto') && tendencia === T[3]) {
    nucleo =
      'Variabilidad entre ejes (mejoría y empeoramiento); mayor incertidumbre clínica y conviene integrar contexto individual.';
  } else if (b === 'noval') {
    nucleo = 'Clasificación de riesgo no valorable con la información disponible.';
  } else {
    nucleo = `Combinación automática riesgo «${nivel}» y trayectoria «${tendencia}»; integrar con historia clínica.`;
  }

  const rD = [...new Set(d.riesgo)].slice(0, 3);
  let s = nucleo;
  if (rD.length) s += ` Señales de severidad/carga: ${rD.join('; ')}.`;
  const adv = [...new Set(d.advertencias)];
  if (adv.length) s += ` Advertencias: ${adv.join('; ')}.`;
  return s.trim();
}

function llenarDriversRiesgo(
  d: DriversInformeLongitudinal,
  ind: ResumenIndicadoresLongitudinalEsc | undefined,
  sev: ReturnType<typeof evaluarSeveridadPorEjes>,
  condCount: number,
  ordinalBase: number,
) {
  const c = CONFIG_UMBRALES_SEVERIDAD_ILC;
  if (sev.glucPeor != null && sev.glucPeor >= c.glucosaCritica) {
    d.riesgo.push(`Pico glucémico muy alto (${sev.glucPeor} mg/dL) en el periodo`);
  } else if (sev.glucPeor != null && sev.glucPeor >= c.glucosaAlto) {
    d.riesgo.push(`Glucosa en rango de alto riesgo (${sev.glucPeor} mg/dL)`);
  }
  if (sev.hbaPeor != null && sev.hbaPeor >= c.hba1cCritica) {
    d.riesgo.push(`HbA1c en rango crítico (${sev.hbaPeor} %)`);
  } else if (sev.hbaPeor != null && sev.hbaPeor >= c.hba1cAlto) {
    d.riesgo.push(`HbA1c en rango de alto riesgo (${sev.hbaPeor} %)`);
  }
  if (sev.sistPeor != null && sev.sistPeor >= c.taSistAlto) {
    d.riesgo.push(`TA sistólica elevada (${sev.sistPeor} mmHg)`);
  }
  if (condCount >= 3) d.riesgo.push('Múltiples condiciones cardiometabólicas no controladas en el resumen');
  else if (condCount === 2) d.riesgo.push('Dos condiciones no controladas en el resumen');
  else if (condCount === 1) d.riesgo.push('Una condición no controlada en el resumen');

  const im = ind?.indiceMasaCorporal;
  const imcMax = maxPair(im?.peorValor, im?.valorFinal);
  if (imcMax != null && imcMax >= c.imcAlto) d.riesgo.push('IMC en obesidad III (piso de severidad)');
  else if (imcMax != null && imcMax >= c.imcModeradoAlto) d.riesgo.push('IMC en obesidad clase II');

  if (ordinalBase >= 3) d.riesgo.push('Carga de riesgo del periodo en tramo alto o crítico por umbrales combinados');
}

export function inferirNivelRiesgoLongitudinalDescontrol(p: ParamsInferenciaRiesgoDescontrol): InferenciaRiesgoTendenciaResult {
  const riesgo = NIVEL_RIESGO_LONGITUDINAL as readonly string[];
  const noVal = riesgo[5]!;
  const T = TENDENCIA_LONGITUDINAL_INFORME;
  const drivers: DriversInformeLongitudinal = {
    riesgo: [],
    advertencias: [],
    datosInsuficientes: false,
    motivosDatosInsuficientes: [],
  };

  const motivosT: string[] = [];
  const tendenciaLongitudinal = inferirTendenciaLongitudinalAgregada(p.resumenIndicadores, p.resumenCondiciones, {
    nEventosIncluidos: p.nEventosIncluidos,
    numeroEventosValidos: p.numeroEventosValidos,
    motivos: motivosT,
  });

  if (p.nEventosIncluidos <= 0) {
    drivers.datosInsuficientes = true;
    drivers.motivosDatosInsuficientes = ['Sin eventos incluidos.'];
    return {
      nivelRiesgoLongitudinal: noVal,
      tendenciaLongitudinal: T[4],
      interpretacionRiesgoLongitudinal: construirInterpretacion({
        nivel: noVal,
        tendencia: T[4],
        drivers: { ...drivers, advertencias: [...drivers.advertencias, ...motivosT] },
      }),
      drivers: { ...drivers, advertencias: [...drivers.advertencias, ...motivosT] },
    };
  }
  if (p.numeroEventosValidos <= 0) {
    drivers.datosInsuficientes = true;
    drivers.motivosDatosInsuficientes = ['Sin eventos válidos con TA, IMC o laboratorio mínimo.'];
    return {
      nivelRiesgoLongitudinal: noVal,
      tendenciaLongitudinal: T[4],
      interpretacionRiesgoLongitudinal: construirInterpretacion({
        nivel: noVal,
        tendencia: T[4],
        drivers: { ...drivers, advertencias: [...drivers.advertencias, ...motivosT] },
      }),
      drivers: { ...drivers, advertencias: [...drivers.advertencias, ...motivosT] },
    };
  }

  const ind = p.resumenIndicadores;
  const sev = evaluarSeveridadPorEjes(ind);
  const im = ind?.indiceMasaCorporal;
  const imcMax = maxPair(im?.peorValor, im?.valorFinal);
  const condCount = contarCondicionesNoControladas(p.resumenCondiciones, imcMax);
  const ordinalCond = ordinalPorConteoCondiciones(condCount);
  const ordinalPiso = evaluarPisosClinicos(p.resumenCondiciones, p.eventosConcentrados, imcMax);
  const ordinalRes = evaluarResidualAcotado(
    p.metricas,
    p.datosFaltantesCount,
    p.metricas.numeroSeguimientosProgramados ?? 0,
  );

  let ordinalBase = Math.max(sev.ordinalEjes, ordinalCond, ordinalPiso, ordinalRes);
  const axesAlto = ejesEnBandaAltaOPeorPeor(ind);
  const evDm = eventosConDm2NoControlada(p.eventosConcentrados);
  const evs = Array.isArray(p.eventosConcentrados) ? p.eventosConcentrados : [];
  const ningunSnapshotEstado =
    evs.length > 0 && evs.every((e) => !e.estadoCondiciones || Object.keys(e.estadoCondiciones as object).length === 0);
  if (
    ningunSnapshotEstado &&
    p.resumenCondiciones?.diabetes?.presente === true &&
    esEstadoNoControlado(p.resumenCondiciones.diabetes.estadoActual)
  ) {
    drivers.advertencias.push(
      'Los eventos concentrados no incluyen `estadoCondiciones` por visita; el conteo de DM2 no controlada en múltiples eventos usa solo el resumen.',
    );
  }

  const promoCrit = aplicaPromocionCritico({
    ind,
    axesAlto,
    condNoCtrl: condCount,
    glucPeor: sev.glucPeor,
    hbaPeor: sev.hbaPeor,
    nMedGluc: sev.nMedGluc,
    nMedHba: sev.nMedHba,
    eventosDmNoCtrl: evDm,
    advertencias: drivers.advertencias,
  });

  if (promoCrit) ordinalBase = Math.max(ordinalBase, 4);

  const isolatedCritGluc =
    sev.glucPeor != null &&
    sev.glucPeor >= CONFIG_UMBRALES_SEVERIDAD_ILC.glucosaCritica &&
    (sev.nMedGluc ?? 0) <= 1;
  const isolatedCritHba =
    sev.hbaPeor != null &&
    sev.hbaPeor >= CONFIG_UMBRALES_SEVERIDAD_ILC.hba1cCritica &&
    (sev.nMedHba ?? 0) <= 1;

  /** Pico glucémico o HbA1c extrema aislada (una medición en el eje) sin segundo eje en banda Alta+ ni carga multimórbida (CP3). */
  const onlyIsolatedMega =
    !promoCrit &&
    ordinalBase >= 4 &&
    axesAlto < 2 &&
    condCount < 3 &&
    (isolatedCritGluc || isolatedCritHba);
  if (onlyIsolatedMega) {
    ordinalBase = 3;
  }

  const nivel = ordinalANivel(ordinalBase);

  llenarDriversRiesgo(drivers, ind, sev, condCount, ordinalBase);
  if (motivosT.length) drivers.advertencias.push(...motivosT);

  const interpretacionRiesgoLongitudinal = construirInterpretacion({
    nivel,
    tendencia: tendenciaLongitudinal,
    drivers,
  });

  return {
    nivelRiesgoLongitudinal: nivel,
    tendenciaLongitudinal,
    interpretacionRiesgoLongitudinal,
    drivers,
  };
}
