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
import {
  idHistoriaOtologicaIla,
  resolverHistoriaOtologicaElegibleIla,
} from '@/helpers/ilaHoElegible';
import {
  MAX_CHARS_INTERPRETACION_OIDO_ILA,
  MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
  TEXTO_BORRADOR_ILA_SIN_BASAL,
  agregarTrayectoriaIla,
  construirBorradorInterpretacionIla,
  construirBorradorInterpretacionOidoIla,
  esBorradorInterpretacionIlaAplicable,
  etiquetaTrayectoriaFrecuenciaIla,
  interpretarOidoIla,
} from '@/helpers/ilaInterpretacionOido';
import type {
  DetalleInterpretacionOidoIla,
  EstadoRecienteIla,
  TrayectoriaIla,
} from '@/helpers/ilaInterpretacionOido';

export {
  MAX_CHARS_INTERPRETACION_OIDO_ILA,
  MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA,
  TEXTO_BORRADOR_ILA_SIN_BASAL,
  agregarTrayectoriaIla,
  construirBorradorInterpretacionIla,
  construirBorradorInterpretacionOidoIla,
  esBorradorInterpretacionIlaAplicable,
  etiquetaTrayectoriaFrecuenciaIla,
  interpretarOidoIla,
};
export type { DetalleInterpretacionOidoIla, EstadoRecienteIla, TrayectoriaIla };

export const FRECUENCIAS_MATRIZ_ILA = [500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
export const CRITERIO_COMPARACION_ILA = 'solo_diferencias';
export const VERSION_CRITERIO_ILA = 'v1.1-reciente-trayectoria';
export const MAX_AUDIOMETRIAS_SUBSECUENTES_ILA = 3;
export const PIE_COLOR_MAGNITUD_ILA =
  'El color indica qué tan grande es el cambio en dB, no un criterio NIOSH, OSHA ni NOM-011. La interpretación corresponde al médico.';

export type OidoIla = 'Derecho' | 'Izquierdo';
export type MagnitudDeltaIla = 'gris' | 'verde' | 'amarillo' | 'rojo' | 'vacio';
export const UMBRAL_INCREMENTO_SIGNIFICATIVO_ILA = 5;
export const CAMBIO_UMBRAL_ILA = {
  MEJORIA_APARENTE: 'Mejoría aparente',
  ESTABLE: 'Estable',
  EMPEORAMIENTO: 'Empeoramiento',
} as const;
export type CambioUmbralOidoIla = (typeof CAMBIO_UMBRAL_ILA)[keyof typeof CAMBIO_UMBRAL_ILA];

export type HistoriaOtologicaExposicionLike = {
  _id?: string;
  fechaHistoriaOtologica?: string | Date;
  estado?: string;
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

export function esAudiometriaAnulada(estudio: { estado?: unknown } | null | undefined): boolean {
  return String(estudio?.estado || '').toLowerCase() === 'anulado';
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
  if (mag === 'amarillo') return 'bg-amber-100 text-amber-800';
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

export function clasificarCambioUmbralOidoIla(
  matriz: FilaMatrizDeltaAudiometrico[] | null | undefined,
  oido: OidoIla,
): CambioUmbralOidoIla | '' {
  const filas = (matriz || []).filter((f) => f.oido === oido);
  let hayDato = false;
  let maxPositivo = 0;
  let hayNegativo = false;
  for (const fila of filas) {
    for (const celda of fila.deltas || []) {
      if (celda.deltaDb == null || !Number.isFinite(celda.deltaDb)) continue;
      hayDato = true;
      if (celda.deltaDb > maxPositivo) maxPositivo = celda.deltaDb;
      if (celda.deltaDb < 0) hayNegativo = true;
    }
  }
  if (!hayDato) return '';
  if (maxPositivo >= UMBRAL_INCREMENTO_SIGNIFICATIVO_ILA) return CAMBIO_UMBRAL_ILA.EMPEORAMIENTO;
  if (hayNegativo) return CAMBIO_UMBRAL_ILA.MEJORIA_APARENTE;
  return CAMBIO_UMBRAL_ILA.ESTABLE;
}

export function formatearDeltaConSigno(deltaDb: number | null | undefined): string {
  if (deltaDb == null || !Number.isFinite(deltaDb)) return '—';
  if (deltaDb > 0) return `+${deltaDb}`;
  return String(deltaDb);
}

export function claveFechaOrdenIla(v?: string | Date | null): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function fechaAudiometriaIla(v?: string | Date | null): string {
  return claveFechaOrdenIla(v);
}

export function fechaMaximaAudiometriasIla(
  items: Array<{ fechaAudiometria?: string | Date | null }> | null | undefined,
): string {
  let max = '';
  for (const item of items || []) {
    const f = claveFechaOrdenIla(item?.fechaAudiometria);
    if (f && f > max) max = f;
  }
  return max;
}

export function esFechaMaximaDelRango(
  fecha: string | Date | null | undefined,
  items: Array<{ fechaAudiometria?: string | Date | null }> | null | undefined,
): boolean {
  const f = claveFechaOrdenIla(fecha);
  const max = fechaMaximaAudiometriasIla(items);
  return Boolean(f && max && f === max);
}

export function esPosteriorABasal(
  fecha: string | Date | null | undefined,
  fechaBasal: string | Date | null | undefined,
): boolean {
  const f = claveFechaOrdenIla(fecha);
  const b = claveFechaOrdenIla(fechaBasal);
  return Boolean(f && b && f > b);
}

function idEstudioIla(item: { _id?: unknown } | null | undefined): string {
  const raw = item?._id;
  if (raw == null || raw === '') return '';
  if (typeof raw === 'object' && raw !== null && '_id' in raw && (raw as { _id?: unknown })._id != null) {
    return String((raw as { _id: unknown })._id);
  }
  return String(raw);
}

/** Más reciente del rango con fecha estrictamente posterior a la basal. Empate de fecha: un solo id, el mayor. */
export function idAudiometriaMasRecientePosteriorABasal(
  items: Array<{ _id?: unknown; fechaAudiometria?: string | Date | null }> | null | undefined,
  fechaBasal: string | Date | null | undefined,
  idBasal?: unknown,
): string {
  const basalId = idBasal == null || idBasal === '' ? '' : String(idBasal);
  let bestId = '';
  let bestFecha = '';
  for (const item of items || []) {
    const id = idEstudioIla(item);
    if (!id || (basalId && id === basalId)) continue;
    if (!esPosteriorABasal(item?.fechaAudiometria, fechaBasal)) continue;
    const f = claveFechaOrdenIla(item?.fechaAudiometria);
    if (f > bestFecha || (f === bestFecha && id > bestId)) {
      bestFecha = f;
      bestId = id;
    }
  }
  return bestId;
}

export function ordenarPorFechaAscIla<T extends { fechaAudiometria?: string | Date | null }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) =>
    claveFechaOrdenIla(a.fechaAudiometria).localeCompare(claveFechaOrdenIla(b.fechaAudiometria)),
  );
}

export function filasMatrizPorOidoIla(
  matriz: FilaMatrizDeltaAudiometrico[] | null | undefined,
  oido: OidoIla,
): FilaMatrizDeltaAudiometrico[] {
  return ordenarPorFechaAscIla((matriz || []).filter((f) => f.oido === oido));
}

export function construirMatrizDeltasIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  subsecuentes: AudiometriaConcentradaLongitudinal[],
): FilaMatrizDeltaAudiometrico[] {
  if (!basal) return [];
  const filas: FilaMatrizDeltaAudiometrico[] = [];
  const oidos: OidoIla[] = ['Derecho', 'Izquierdo'];
  const ordenados = ordenarPorFechaAscIla(subsecuentes);
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

function resultadoMetodoOriginal(
  estudio: AudiometriaConcentradaLongitudinal,
  oido: OidoIla,
): string {
  const metodo = String(estudio.metodoAudiometria || '').toUpperCase();
  if (metodo === 'AMA') {
    const pct = oido === 'Derecho' ? estudio.perdidaMonauralOD_AMA : estudio.perdidaMonauralOI_AMA;
    const pctTxt = pct == null ? '—' : `${pct} %`;
    return `PA ${pctTxt}`;
  }
  if (metodo === 'LFT') {
    const pct = oido === 'Derecho' ? estudio.porcentajePerdidaOD : estudio.porcentajePerdidaOI;
    const pctTxt = pct == null ? '—' : `${pct} %`;
    return `HBC ${pctTxt}`;
  }
  return metodo || '—';
}

export function etiquetaResultadoResumenIla(
  texto?: string | null,
  metodo?: string | null,
): string {
  const s = String(texto || '').trim();
  if (!s) return '—';
  const m = String(metodo || '').toUpperCase();
  const etiqueta = m === 'LFT' ? 'HBC' : m === 'AMA' ? 'PA' : '';
  if (etiqueta) {
    const resto = s.replace(/^(AMA|LFT|HBC|PA)\b\s*/i, '');
    return resto ? `${etiqueta} ${resto}` : etiqueta;
  }
  if (/^AMA\b/i.test(s)) return s.replace(/^AMA\b/i, 'PA');
  if (/^LFT\b/i.test(s)) return s.replace(/^LFT\b/i, 'HBC');
  return s;
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
  const todos = ordenarPorFechaAscIla([basal, ...subsecuentes]);
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

export function aplicarBorradorEnInterpretacionSiNoEditada(
  interpretacionActual?: string | null,
  borradorAnterior?: string | null,
  borradorNuevo?: string | null,
): string {
  const actual = interpretacionActual ?? '';
  const actualTrim = String(actual).trim();
  const anterior = String(borradorAnterior || '').trim();
  const nuevoAplicable = esBorradorInterpretacionIlaAplicable(borradorNuevo);
  const anteriorAplicable = esBorradorInterpretacionIlaAplicable(borradorAnterior);

  if (!actualTrim) {
    if (anteriorAplicable) return '';
    return nuevoAplicable ? String(borradorNuevo) : '';
  }
  if (anteriorAplicable && actualTrim === anterior) {
    return nuevoAplicable ? String(borradorNuevo) : '';
  }
  return actual;
}

export function aplicarBorradoresInterpretacionPorOidoIla(
  form: {
    interpretacionOidoDerecho?: string;
    interpretacionOidoIzquierdo?: string;
    borradorInterpretacionOidoDerecho?: string;
    borradorInterpretacionOidoIzquierdo?: string;
  },
  borradoresAnteriores: { derecho?: string; izquierdo?: string },
  interpretacionesAnteriores: { derecho?: string; izquierdo?: string },
): void {
  form.interpretacionOidoDerecho = aplicarBorradorEnInterpretacionSiNoEditada(
    interpretacionesAnteriores.derecho,
    borradoresAnteriores.derecho,
    form.borradorInterpretacionOidoDerecho,
  );
  form.interpretacionOidoIzquierdo = aplicarBorradorEnInterpretacionSiNoEditada(
    interpretacionesAnteriores.izquierdo,
    borradoresAnteriores.izquierdo,
    form.borradorInterpretacionOidoIzquierdo,
  );
}

export function otraSubsecuenteComparteFechaIla(
  fechaCandidata: string | Date | null | undefined,
  idCandidata: unknown,
  seleccionadas: Array<{ _id?: unknown; id?: unknown; fechaAudiometria?: string | Date | null }>,
): boolean {
  const fecha = claveFechaOrdenIla(fechaCandidata);
  if (!fecha) return false;
  const cid = mongoIdStr(idCandidata);
  return seleccionadas.some((s) => {
    const sid = mongoIdStr(s._id || s.id);
    if (!sid || (cid && sid === cid)) return false;
    return claveFechaOrdenIla(s.fechaAudiometria) === fecha;
  });
}

export function textoInterpretacionOidoIla(
  form: Pick<
    InformeLongitudinalAudiometrico,
    'interpretacionOidoDerecho' | 'interpretacionOidoIzquierdo' | 'interpretacionLongitudinal'
  > | null | undefined,
  oido: OidoIla,
): string {
  const nuevo =
    oido === 'Derecho' ? form?.interpretacionOidoDerecho : form?.interpretacionOidoIzquierdo;
  if (nuevo && String(nuevo).trim()) return String(nuevo).trim();
  return '';
}

export function textoInterpretacionLegadoIla(
  form: Pick<
    InformeLongitudinalAudiometrico,
    'interpretacionOidoDerecho' | 'interpretacionOidoIzquierdo' | 'interpretacionLongitudinal'
  > | null | undefined,
): string {
  if (textoInterpretacionOidoIla(form, 'Derecho') || textoInterpretacionOidoIla(form, 'Izquierdo')) {
    return '';
  }
  return String(form?.interpretacionLongitudinal || '').trim();
}

export function sincronizarInterpretacionLongitudinalIla(form: {
  interpretacionOidoDerecho?: string;
  interpretacionOidoIzquierdo?: string;
  interpretacionLongitudinal?: string;
}): void {
  const od = String(form.interpretacionOidoDerecho || '').trim();
  const oi = String(form.interpretacionOidoIzquierdo || '').trim();
  if (!od && !oi) return;
  form.interpretacionLongitudinal = [
    od ? `Oído derecho:\n${od}` : '',
    oi ? `Oído izquierdo:\n${oi}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');
}

export function snapshotExposicionRuidoIla(opts: {
  historias?: HistoriaOtologicaExposicionLike[];
  agentesRiesgoActuales?: string[];
  textoLibre?: string;
  fechaInforme?: string | Date | null;
}): AntecedenteExposicionRuidoLongitudinal {
  const agentes = opts.agentesRiesgoActuales || [];
  const ruidoEnAgentes = agentes.some((a) => String(a).toLowerCase().includes('ruido'));
  const ho = resolverHistoriaOtologicaElegibleIla(opts.historias || [], opts.fechaInforme);
  if (ho.tipo === 'seleccionada') {
    const id = idHistoriaOtologicaIla(ho.historia);
    return {
      fuente: 'historiaOtologica',
      idHistoriaOtologica: id || undefined,
      trabajoAmbientesRuidosos: ho.historia.trabajoAmbientesRuidosos,
      tiempoExposicionLaboral: ho.historia.tiempoExposicionLaboral,
      usoProteccionAuditiva: ho.historia.usoProteccionAuditiva,
      ruidoEnAgentesRiesgoActuales: ruidoEnAgentes,
      textoLibre: opts.textoLibre,
    };
  }
  return {
    fuente: ruidoEnAgentes ? 'agentesRiesgo' : 'manual',
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
  | 'borradorInterpretacionOidoDerecho'
  | 'borradorInterpretacionOidoIzquierdo'
  | 'numeroAudiometriasIncluidas'
  | 'cambioUmbralOidoDerecho'
  | 'cambioUmbralOidoIzquierdo'
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
  return {
    audiometriaBasalConcentrada: basal || undefined,
    audiometriasSubsecuentesConcentradas: subsecuentes,
    matrizDeltas,
    resumenCronologico,
    advertencias: [],
    borradorInterpretacionOidoDerecho: construirBorradorInterpretacionOidoIla(basal, matrizDeltas, 'Derecho'),
    borradorInterpretacionOidoIzquierdo: construirBorradorInterpretacionOidoIla(
      basal,
      matrizDeltas,
      'Izquierdo',
    ),
    borradorInterpretacionObjetiva: construirBorradorInterpretacionIla(basal, matrizDeltas),
    numeroAudiometriasIncluidas: (basal ? 1 : 0) + subsecuentes.length,
    cambioUmbralOidoDerecho: clasificarCambioUmbralOidoIla(matrizDeltas, 'Derecho') || undefined,
    cambioUmbralOidoIzquierdo: clasificarCambioUmbralOidoIla(matrizDeltas, 'Izquierdo') || undefined,
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
      if (esAudiometriaAnulada(a)) continue;
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
    borradorInterpretacionOidoDerecho?: string;
    borradorInterpretacionOidoIzquierdo?: string;
    numeroAudiometriasIncluidas?: number;
    cambioUmbralOidoDerecho?: string;
    cambioUmbralOidoIzquierdo?: string;
    criterioComparacion?: string;
    versionCriterio?: string;
    fechaInformeLongitudinalAudiometrico?: string | Date;
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
    fechaInforme: form.fechaInformeLongitudinalAudiometrico,
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
