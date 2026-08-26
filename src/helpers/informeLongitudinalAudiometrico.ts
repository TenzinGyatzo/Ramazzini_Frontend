/**
 * Derivaciones clínicas v1 del informe longitudinal audiométrico.
 * El seguimiento usa umbrales tonales; AMA/LFT se reportan por estudio, sin mezclar escalas.
 */
import type {
  AntecedenteExposicionRuidoLongitudinal,
  Audiometria,
  AudiometriaConcentradaLongitudinal,
  FilaMatrizDeltaAudiometrico,
  InformeLongitudinalAudiometrico,
  ResumenCronologicoAudiometrico,
} from '@/interfaces/documentos.inteface';

export const FRECUENCIAS_MATRIZ_ILA = [500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export const FRECUENCIAS_AUDIOGRAMA_ILA = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export const CRITERIO_COMPARACION_ILA = 'solo_diferencias';
export const VERSION_CRITERIO_ILA = 'v1.0-deltas';
export const PIE_COLOR_MAGNITUD_ILA =
  'El color indica magnitud del Δ en dB, no un criterio NIOSH, OSHA ni NOM-011. La interpretación corresponde al médico.';
export const ADVERTENCIA_SIN_CALIBRACION_ILA =
  'No hay información de equipo ni calibración en las audiometrías incluidas.';

export type OidoIla = 'Derecho' | 'Izquierdo';
export type MagnitudDeltaIla = 'gris' | 'verde' | 'amarillo' | 'rojo' | 'vacio';

export type HistoriaOtologicaExposicionLike = {
  _id?: string;
  fechaHistoriaOtologica?: string | Date;
  trabajoAmbientesRuidosos?: string;
  tiempoExposicionLaboral?: string;
  usoProteccionAuditiva?: string;
};

type AudiometriaFuente = Partial<Audiometria> & {
  _id?: string;
  id?: string;
};

function mongoIdStr(x: unknown): string {
  if (x == null || x === '') return '';
  if (typeof x === 'object' && x !== null && '_id' in x && (x as { _id?: unknown })._id != null) {
    return String((x as { _id: unknown })._id);
  }
  return String(x);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function umbralOido(
  estudio: AudiometriaFuente | AudiometriaConcentradaLongitudinal | null | undefined,
  oido: OidoIla,
  freq: number,
): number | null {
  if (!estudio) return null;
  const campo = `oido${oido}${freq}` as keyof AudiometriaConcentradaLongitudinal;
  return toNumberOrNull((estudio as Record<string, unknown>)[campo as string]);
}

export function frecuenciasFaltantesMatriz(
  estudio: AudiometriaFuente | AudiometriaConcentradaLongitudinal,
): number[] {
  const faltantes: number[] = [];
  for (const freq of FRECUENCIAS_MATRIZ_ILA) {
    const od = umbralOido(estudio, 'Derecho', freq);
    const oi = umbralOido(estudio, 'Izquierdo', freq);
    if (od == null || oi == null) faltantes.push(freq);
  }
  return [...new Set(faltantes)];
}

export function snapshotAudiometriaConcentradaIla(
  fuente: AudiometriaFuente,
  rol: 'basal' | 'subsecuente',
): AudiometriaConcentradaLongitudinal {
  const faltantes = frecuenciasFaltantesMatriz(fuente);
  return {
    idAudiometriaOriginal: mongoIdStr(fuente._id || fuente.id),
    fechaAudiometria: fuente.fechaAudiometria,
    metodoAudiometria: fuente.metodoAudiometria,
    rolEnInforme: rol,
    oidoDerecho125: toNumberOrNull(fuente.oidoDerecho125),
    oidoDerecho250: toNumberOrNull(fuente.oidoDerecho250),
    oidoDerecho500: toNumberOrNull(fuente.oidoDerecho500),
    oidoDerecho1000: toNumberOrNull(fuente.oidoDerecho1000),
    oidoDerecho2000: toNumberOrNull(fuente.oidoDerecho2000),
    oidoDerecho3000: toNumberOrNull(fuente.oidoDerecho3000),
    oidoDerecho4000: toNumberOrNull(fuente.oidoDerecho4000),
    oidoDerecho6000: toNumberOrNull(fuente.oidoDerecho6000),
    oidoDerecho8000: toNumberOrNull(fuente.oidoDerecho8000),
    oidoIzquierdo125: toNumberOrNull(fuente.oidoIzquierdo125),
    oidoIzquierdo250: toNumberOrNull(fuente.oidoIzquierdo250),
    oidoIzquierdo500: toNumberOrNull(fuente.oidoIzquierdo500),
    oidoIzquierdo1000: toNumberOrNull(fuente.oidoIzquierdo1000),
    oidoIzquierdo2000: toNumberOrNull(fuente.oidoIzquierdo2000),
    oidoIzquierdo3000: toNumberOrNull(fuente.oidoIzquierdo3000),
    oidoIzquierdo4000: toNumberOrNull(fuente.oidoIzquierdo4000),
    oidoIzquierdo6000: toNumberOrNull(fuente.oidoIzquierdo6000),
    oidoIzquierdo8000: toNumberOrNull(fuente.oidoIzquierdo8000),
    porcentajePerdidaOD: toNumberOrNull(fuente.porcentajePerdidaOD),
    porcentajePerdidaOI: toNumberOrNull(fuente.porcentajePerdidaOI),
    perdidaMonauralOD_AMA: toNumberOrNull(fuente.perdidaMonauralOD_AMA),
    perdidaMonauralOI_AMA: toNumberOrNull(fuente.perdidaMonauralOI_AMA),
    perdidaAuditivaBilateralAMA: toNumberOrNull(fuente.perdidaAuditivaBilateralAMA),
    hipoacusiaBilateralCombinada: toNumberOrNull(fuente.hipoacusiaBilateralCombinada),
    diagnosticoAudiometria: fuente.diagnosticoAudiometria,
    interpretacionAudiometrica: fuente.interpretacionAudiometrica,
    frecuenciasFaltantes: faltantes,
    estudioIncompleto: faltantes.length > 0,
  };
}

export function calcularDeltaDb(
  umbralSubsecuente: number | null,
  umbralBasal: number | null,
): number | null {
  if (umbralSubsecuente == null || umbralBasal == null) return null;
  return umbralSubsecuente - umbralBasal;
}

export function clasificarMagnitudDeltaIla(deltaDb: number | null | undefined): MagnitudDeltaIla {
  if (deltaDb == null || !Number.isFinite(deltaDb)) return 'vacio';
  if (deltaDb === 0) return 'gris';
  if (deltaDb < 0) return 'verde';
  if (deltaDb >= 15) return 'rojo';
  if (deltaDb >= 5) return 'amarillo';
  return 'gris';
}

export function claseColorMagnitudDeltaIla(deltaDb: number | null | undefined): string {
  const mag = clasificarMagnitudDeltaIla(deltaDb);
  if (mag === 'verde') return 'bg-emerald-100 text-emerald-800';
  if (mag === 'amarillo') return 'bg-amber-100 text-amber-900';
  if (mag === 'rojo') return 'bg-red-100 text-red-800';
  if (mag === 'gris') return 'bg-gray-100 text-gray-700';
  return 'bg-white text-gray-400';
}

export function colorPdfMagnitudDeltaIla(deltaDb: number | null | undefined): {
  fillColor: string;
  color: string;
} {
  const mag = clasificarMagnitudDeltaIla(deltaDb);
  if (mag === 'verde') return { fillColor: '#D1FAE5', color: '#065F46' };
  if (mag === 'amarillo') return { fillColor: '#FEF3C7', color: '#92400E' };
  if (mag === 'rojo') return { fillColor: '#FECACA', color: '#7F1D1D' };
  if (mag === 'gris') return { fillColor: '#F3F4F6', color: '#374151' };
  return { fillColor: '#FFFFFF', color: '#9CA3AF' };
}

export function formatearDeltaConSigno(deltaDb: number | null | undefined): string {
  if (deltaDb == null || !Number.isFinite(deltaDb)) return '—';
  if (deltaDb > 0) return `+${deltaDb}`;
  return String(deltaDb);
}

export function construirMatrizDeltasIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  subsecuentes: AudiometriaConcentradaLongitudinal[],
): FilaMatrizDeltaAudiometrico[] {
  if (!basal) return [];
  const filas: FilaMatrizDeltaAudiometrico[] = [];
  const oidos: OidoIla[] = ['Derecho', 'Izquierdo'];
  const ordenados = [...subsecuentes].sort((a, b) =>
    String(a.fechaAudiometria || '').localeCompare(String(b.fechaAudiometria || '')),
  );
  for (const sub of ordenados) {
    for (const oido of oidos) {
      filas.push({
        idAudiometriaOriginal: sub.idAudiometriaOriginal,
        fechaAudiometria: sub.fechaAudiometria,
        oido,
        deltas: FRECUENCIAS_MATRIZ_ILA.map((freq) => ({
          frecuenciaHz: freq,
          deltaDb: calcularDeltaDb(umbralOido(sub, oido, freq), umbralOido(basal, oido, freq)),
        })),
      });
    }
  }
  return filas;
}

function promedioUmbralesConCaida(estudio: AudiometriaConcentradaLongitudinal, oido: OidoIla): number | null {
  const valores = FRECUENCIAS_AUDIOGRAMA_ILA
    .map((freq) => umbralOido(estudio, oido, freq))
    .filter((v): v is number => v != null);
  if (valores.length < 3) return null;
  const conCaida = valores.filter((v) => v > 20);
  const base = conCaida.length >= 2 ? conCaida : valores;
  return base.reduce((a, b) => a + b, 0) / base.length;
}

export function etiquetaSeveridadUmbralesIla(
  estudio: AudiometriaConcentradaLongitudinal,
  oido: OidoIla,
): string {
  const promedio = promedioUmbralesConCaida(estudio, oido);
  if (promedio == null) return 'Insuficiente';
  if (promedio <= 20) return 'Normal';
  if (promedio <= 40) return 'Leve';
  if (promedio <= 60) return 'Moderada';
  if (promedio <= 80) return 'Grave';
  return 'Profunda';
}

function resultadoMetodoOriginal(
  estudio: AudiometriaConcentradaLongitudinal,
  oido: OidoIla,
): string {
  const metodo = String(estudio.metodoAudiometria || '').toUpperCase();
  const etiqueta = etiquetaSeveridadUmbralesIla(estudio, oido);
  if (metodo === 'AMA') {
    const pct = oido === 'Derecho' ? estudio.perdidaMonauralOD_AMA : estudio.perdidaMonauralOI_AMA;
    const pctTxt = pct == null ? '—' : `${pct} %`;
    return `AMA ${pctTxt} · ${etiqueta}`;
  }
  if (metodo === 'LFT') {
    const pct = oido === 'Derecho' ? estudio.porcentajePerdidaOD : estudio.porcentajePerdidaOI;
    const pctTxt = pct == null ? '—' : `${pct} %`;
    return `LFT ${pctTxt} · ${etiqueta}`;
  }
  return etiqueta;
}

function maxDeltaFila(fila: FilaMatrizDeltaAudiometrico | undefined): {
  delta: number;
  freq: number;
} | null {
  if (!fila) return null;
  let mejor: { delta: number; freq: number } | null = null;
  for (const celda of fila.deltas || []) {
    if (celda.deltaDb == null) continue;
    if (!mejor || Math.abs(celda.deltaDb) > Math.abs(mejor.delta)) {
      mejor = { delta: celda.deltaDb, freq: celda.frecuenciaHz };
    }
  }
  return mejor;
}

function hayVariacionNumerica(fila: FilaMatrizDeltaAudiometrico | undefined): boolean {
  return (fila?.deltas || []).some((c) => c.deltaDb != null && c.deltaDb !== 0);
}

export function textoCambioRespectoBasal(
  basal: AudiometriaConcentradaLongitudinal,
  sub: AudiometriaConcentradaLongitudinal,
  matriz: FilaMatrizDeltaAudiometrico[],
): string {
  if (sub.rolEnInforme === 'basal' || sub.idAudiometriaOriginal === basal.idAudiometriaOriginal) {
    return 'Referencia';
  }
  const filas = matriz.filter((f) => f.idAudiometriaOriginal === sub.idAudiometriaOriginal);
  if (!filas.length || !filas.some(hayVariacionNumerica)) return 'Sin variación numérica';
  let mejor: { delta: number; freq: number; oido: OidoIla } | null = null;
  for (const fila of filas) {
    const m = maxDeltaFila(fila);
    if (!m) continue;
    if (!mejor || Math.abs(m.delta) > Math.abs(mejor.delta)) {
      mejor = { ...m, oido: fila.oido };
    }
  }
  if (!mejor) return 'Sin variación numérica';
  const oidoTxt = mejor.oido === 'Derecho' ? 'OD' : 'OI';
  return `Variación (máx. ${formatearDeltaConSigno(mejor.delta)} dB en ${mejor.freq} Hz ${oidoTxt})`;
}

export function construirResumenCronologicoIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  subsecuentes: AudiometriaConcentradaLongitudinal[],
  matriz: FilaMatrizDeltaAudiometrico[],
): ResumenCronologicoAudiometrico[] {
  if (!basal) return [];
  const todos = [basal, ...subsecuentes].sort((a, b) =>
    String(a.fechaAudiometria || '').localeCompare(String(b.fechaAudiometria || '')),
  );
  return todos.map((est) => ({
    idAudiometriaOriginal: est.idAudiometriaOriginal,
    fechaAudiometria: est.fechaAudiometria,
    tipo: est.rolEnInforme,
    metodoAudiometria: est.metodoAudiometria,
    resultadoOD: resultadoMetodoOriginal(est, 'Derecho'),
    resultadoOI: resultadoMetodoOriginal(est, 'Izquierdo'),
    cambioRespectoBasal: textoCambioRespectoBasal(basal, est, matriz),
  }));
}

function formatFechaHumana(v?: string | Date | null): string {
  if (v == null || v === '') return 'sin fecha';
  const s = typeof v === 'string' ? v : v.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return 'sin fecha';
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return 'sin fecha';
  }
}

export function construirBorradorInterpretacionIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  matriz: FilaMatrizDeltaAudiometrico[],
): string {
  if (!basal) {
    return 'Seleccione una audiometría basal para generar el borrador objetivo.';
  }
  const fechaBasal = formatFechaHumana(basal.fechaAudiometria);
  const porOido: Record<OidoIla, { freq: number; delta: number }[]> = {
    Derecho: [],
    Izquierdo: [],
  };
  for (const fila of matriz) {
    for (const celda of fila.deltas || []) {
      if (celda.deltaDb == null || celda.deltaDb <= 0) continue;
      porOido[fila.oido].push({ freq: celda.frecuenciaHz, delta: celda.deltaDb });
    }
  }

  const frases: string[] = [
    `En comparación con la audiometría basal del ${fechaBasal}, se describen las variaciones de umbral tonal (Δ = umbral subsecuente − umbral basal).`,
  ];

  for (const oido of ['Izquierdo', 'Derecho'] as OidoIla[]) {
    const cambios = porOido[oido];
    const oidoTxt = oido === 'Derecho' ? 'oído derecho' : 'oído izquierdo';
    if (!cambios.length) {
      frases.push(`En el ${oidoTxt} no se observan incrementos de umbral en las frecuencias comparadas.`);
      continue;
    }
    const freqs = [...new Set(cambios.filter((c) => c.delta >= 5).map((c) => c.freq))].sort((a, b) => a - b);
    const mayor = cambios.reduce((acc, c) => (c.delta > acc.delta ? c : acc), cambios[0]);
    if (freqs.length) {
      frases.push(
        `Se identifica incremento de los umbrales auditivos en las frecuencias de ${freqs.join(', ')} Hz del ${oidoTxt}. El mayor cambio se presenta en ${mayor.freq} Hz, con una diferencia de ${mayor.delta} dB.`,
      );
    } else {
      frases.push(
        `En el ${oidoTxt} hay variaciones menores a 5 dB; el mayor cambio es de ${formatearDeltaConSigno(mayor.delta)} dB en ${mayor.freq} Hz.`,
      );
    }
  }

  frases.push(
    'Esto no atribuye causalidad al ruido laboral. AMA y LFT interpretan cada estudio por separado; el seguimiento longitudinal se basa en los umbrales tonales originales.',
  );
  return frases.join(' ');
}

export function construirAdvertenciasIla(opts: {
  basal?: AudiometriaConcentradaLongitudinal | null;
  subsecuentes?: AudiometriaConcentradaLongitudinal[];
  exposicion?: AntecedenteExposicionRuidoLongitudinal | null;
}): string[] {
  const advertencias: string[] = [];
  const basal = opts.basal;
  const subs = opts.subsecuentes || [];
  if (!basal) {
    advertencias.push('No se ha seleccionado una audiometría basal.');
    return advertencias;
  }
  if (!subs.length) {
    advertencias.push('Seleccione al menos una audiometría subsecuente para el seguimiento.');
  }

  const todos = [basal, ...subs];
  for (const est of todos) {
    const fecha = formatFechaHumana(est.fechaAudiometria);
    const rol = est.rolEnInforme === 'basal' ? 'basal' : 'subsecuente';
    if (est.estudioIncompleto || (est.frecuenciasFaltantes || []).length) {
      const freqs = (est.frecuenciasFaltantes || []).join(', ');
      advertencias.push(
        `Estudio ${rol} del ${fecha}: frecuencias de comparación faltantes o sin medición (${freqs || 'varias'} Hz).`,
      );
    }
  }

  const metodos = new Set(
    todos.map((e) => String(e.metodoAudiometria || '').toUpperCase()).filter(Boolean),
  );
  if (metodos.has('AMA') && metodos.has('LFT')) {
    advertencias.push(
      'La serie incluye estudios AMA y LFT. Las clasificaciones de cada método no son directamente comparables; el seguimiento usa umbrales tonales originales.',
    );
  }

  const tBasal = Date.parse(String(basal.fechaAudiometria || ''));
  for (const sub of subs) {
    const tSub = Date.parse(String(sub.fechaAudiometria || ''));
    if (Number.isFinite(tBasal) && Number.isFinite(tSub) && tSub < tBasal) {
      advertencias.push(
        `La audiometría del ${formatFechaHumana(sub.fechaAudiometria)} es anterior a la basal seleccionada.`,
      );
    }
  }

  advertencias.push(ADVERTENCIA_SIN_CALIBRACION_ILA);

  const exp = opts.exposicion;
  const hayHistoria =
    exp?.trabajoAmbientesRuidosos ||
    exp?.tiempoExposicionLaboral ||
    exp?.usoProteccionAuditiva;
  if (!hayHistoria && !exp?.ruidoEnAgentesRiesgoActuales && !String(exp?.textoLibre || '').trim()) {
    advertencias.push('Exposición a ruido no documentada en historia otológica ni en agentes de riesgo actuales.');
  }

  return advertencias;
}

export function snapshotExposicionRuidoIla(opts: {
  historias?: HistoriaOtologicaExposicionLike[];
  agentesRiesgoActuales?: string[];
  textoLibre?: string;
}): AntecedenteExposicionRuidoLongitudinal {
  const historias = [...(opts.historias || [])].sort((a, b) =>
    String(b.fechaHistoriaOtologica || '').localeCompare(String(a.fechaHistoriaOtologica || '')),
  );
  const ultima = historias[0];
  const agentes = opts.agentesRiesgoActuales || [];
  const ruidoEnAgentes = agentes.some((a) => String(a).toLowerCase().includes('ruido'));
  return {
    fuente: ultima ? 'historiaOtologica' : ruidoEnAgentes ? 'agentesRiesgo' : 'manual',
    idHistoriaOtologica: ultima?._id ? String(ultima._id) : undefined,
    trabajoAmbientesRuidosos: ultima?.trabajoAmbientesRuidosos,
    tiempoExposicionLaboral: ultima?.tiempoExposicionLaboral,
    usoProteccionAuditiva: ultima?.usoProteccionAuditiva,
    ruidoEnAgentesRiesgoActuales: ruidoEnAgentes,
    textoLibre: opts.textoLibre,
  };
}

export function derivarCamposInformeLongitudinalAudiometrico(opts: {
  basalFuente?: AudiometriaFuente | null;
  subsecuentesFuente?: AudiometriaFuente[];
  exposicion?: AntecedenteExposicionRuidoLongitudinal | null;
}): Pick<
  InformeLongitudinalAudiometrico,
  | 'audiometriaBasalConcentrada'
  | 'audiometriasSubsecuentesConcentradas'
  | 'matrizDeltas'
  | 'resumenCronologico'
  | 'advertencias'
  | 'borradorInterpretacionObjetiva'
  | 'numeroAudiometriasIncluidas'
  | 'criterioComparacion'
  | 'versionCriterio'
> {
  const basal = opts.basalFuente
    ? snapshotAudiometriaConcentradaIla(opts.basalFuente, 'basal')
    : null;
  const subsecuentes = (opts.subsecuentesFuente || []).map((s) =>
    snapshotAudiometriaConcentradaIla(s, 'subsecuente'),
  );
  const matrizDeltas = construirMatrizDeltasIla(basal, subsecuentes);
  const resumenCronologico = construirResumenCronologicoIla(basal, subsecuentes, matrizDeltas);
  const advertencias = construirAdvertenciasIla({
    basal,
    subsecuentes,
    exposicion: opts.exposicion,
  });
  return {
    audiometriaBasalConcentrada: basal || undefined,
    audiometriasSubsecuentesConcentradas: subsecuentes,
    matrizDeltas,
    resumenCronologico,
    advertencias,
    borradorInterpretacionObjetiva: construirBorradorInterpretacionIla(basal, matrizDeltas),
    numeroAudiometriasIncluidas: (basal ? 1 : 0) + subsecuentes.length,
    criterioComparacion: CRITERIO_COMPARACION_ILA,
    versionCriterio: VERSION_CRITERIO_ILA,
  };
}

export function audiometriasDesdeDocumentsByYear(
  documentsByYear: Record<string, Record<string, unknown>> | null | undefined,
  trabajadorId?: string | null,
): AudiometriaFuente[] {
  const out: AudiometriaFuente[] = [];
  const byYear = documentsByYear || {};
  const tid = trabajadorId ? mongoIdStr(trabajadorId) : '';
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.audiometrias;
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      if (!e || typeof e !== 'object') continue;
      const a = e as AudiometriaFuente;
      if (tid && a.idTrabajador && mongoIdStr(a.idTrabajador) !== tid) continue;
      out.push(a);
    }
  }
  return out;
}

export function historiasOtologicasDesdeDocumentsByYear(
  documentsByYear: Record<string, Record<string, unknown>> | null | undefined,
): HistoriaOtologicaExposicionLike[] {
  const out: HistoriaOtologicaExposicionLike[] = [];
  const byYear = documentsByYear || {};
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.historiaOtologica;
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      if (!e || typeof e !== 'object') continue;
      out.push(e as HistoriaOtologicaExposicionLike);
    }
  }
  return out;
}

/**
 * Reemplaza concentrados/Δ/resumen con umbrales vivos del expediente (borrador).
 * Al finalizar, el PDF usa los concentrados persistidos.
 */
export function refrescarAudiometriasConcentradasEnInforme(
  form: {
    idAudiometriaBasal?: unknown;
    audiometriasSubsecuentesIncluidas?: unknown;
    antecedenteExposicionRuido?: AntecedenteExposicionRuidoLongitudinal | null;
    audiometriaBasalConcentrada?: AudiometriaConcentradaLongitudinal;
    audiometriasSubsecuentesConcentradas?: AudiometriaConcentradaLongitudinal[];
    matrizDeltas?: InformeLongitudinalAudiometrico['matrizDeltas'];
    resumenCronologico?: InformeLongitudinalAudiometrico['resumenCronologico'];
    advertencias?: string[];
    borradorInterpretacionObjetiva?: string;
    numeroAudiometriasIncluidas?: number;
    criterioComparacion?: string;
    versionCriterio?: string;
  },
  audiometrias: AudiometriaFuente[],
  historias?: HistoriaOtologicaExposicionLike[],
  agentesRiesgo?: string[],
): boolean {
  const basalId = mongoIdStr(form.idAudiometriaBasal);
  const subIds = new Set(
    (Array.isArray(form.audiometriasSubsecuentesIncluidas)
      ? form.audiometriasSubsecuentesIncluidas
      : []
    )
      .map(mongoIdStr)
      .filter((id) => id && id !== basalId),
  );
  const basalFuente = audiometrias.find((a) => mongoIdStr(a._id || a.id) === basalId) || null;
  const subFuentes = audiometrias.filter((a) => subIds.has(mongoIdStr(a._id || a.id)));
  if (!basalFuente && !subFuentes.length) return false;
  const exposicion = snapshotExposicionRuidoIla({
    historias: historias || [],
    agentesRiesgoActuales: agentesRiesgo || [],
    textoLibre: form.antecedenteExposicionRuido?.textoLibre,
  });
  Object.assign(
    form,
    derivarCamposInformeLongitudinalAudiometrico({
      basalFuente,
      subsecuentesFuente: subFuentes,
      exposicion,
    }),
  );
  form.antecedenteExposicionRuido = exposicion;
  return true;
}
