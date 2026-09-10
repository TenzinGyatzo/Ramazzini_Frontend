import type {
  AudiometriaConcentradaLongitudinal,
  FilaMatrizDeltaAudiometrico,
} from '@/interfaces/documentos.inteface';

export const MAX_CHARS_INTERPRETACION_OIDO_ILA = 321;
/** Tope del textarea editable (pasos 2 y 3). Medido con String.length sobre el párrafo de referencia de captura. */
export const MAX_CHARS_TEXTAREA_INTERPRETACION_OIDO_ILA = 585;
export const TEXTO_BORRADOR_ILA_SIN_BASAL =
  'Seleccione una audiometría basal para generar el borrador objetivo.';

const FRECUENCIAS_ILA = [500, 1000, 2000, 3000, 4000, 6000, 8000] as const;
const T = 5;
const PALABRA_N = ['', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete'] as const;

export type OidoInterpretacionIla = 'Derecho' | 'Izquierdo';

export type EstadoRecienteIla =
  | 'incremento'
  | 'disminucion'
  | 'mixto_signo'
  | 'variaciones_menores'
  | 'sin_cambio'
  | 'insuficiente';

export type TrayectoriaIla =
  | 'disminucion_del_cambio'
  | 'fluctuacion'
  | 'estable_vs_anterior'
  | 'progresion'
  | 'no_uniforme'
  | 'omitir';

export type TrayectoriaLocalIla =
  | 'disminucion_del_cambio'
  | 'fluctuacion'
  | 'estable_vs_anterior'
  | 'progresion'
  | 'omitir_local';

export type DetalleInterpretacionOidoIla = {
  texto: string;
  estado: EstadoRecienteIla | '';
  trayectoria: TrayectoriaIla;
  frecuenciasEstado: number[];
  frecuenciasTrayectoria: number[];
};

function signIla(x: number): -1 | 0 | 1 {
  if (x > 0) return 1;
  if (x < 0) return -1;
  return 0;
}

function palabraN(n: number): string {
  if (n >= 1 && n <= 7) return PALABRA_N[n];
  return String(n);
}

export function formatFechaHumanaIla(v?: string | Date | null): string {
  if (v == null || v === '') return 'sin fecha';
  const s = typeof v === 'string' ? v : v.toISOString();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return 'sin fecha';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function claveFechaOrdenIla(v?: string | Date | null): string {
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

function filasPorOido(
  matriz: FilaMatrizDeltaAudiometrico[],
  oido: OidoInterpretacionIla,
): FilaMatrizDeltaAudiometrico[] {
  return [...(matriz || []).filter((f) => f.oido === oido)].sort((a, b) =>
    claveFechaOrdenIla(a.fechaAudiometria).localeCompare(claveFechaOrdenIla(b.fechaAudiometria)),
  );
}

function deltaDe(fila: FilaMatrizDeltaAudiometrico | undefined, freq: number): number | null {
  const v = (fila?.deltas || []).find((d) => d.frecuenciaHz === freq)?.deltaDb;
  if (v == null || !Number.isFinite(v)) return null;
  return v;
}

function seriesIguales(a: FilaMatrizDeltaAudiometrico, b: FilaMatrizDeltaAudiometrico): boolean {
  return FRECUENCIAS_ILA.every((freq) => deltaDe(a, freq) === deltaDe(b, freq));
}

function listarFrecuencias(freqs: number[]): string {
  if (freqs.length === 1) return `la frecuencia de ${freqs[0]} Hz`;
  if (freqs.length === 2) return `las frecuencias de ${freqs[0]} y ${freqs[1]} Hz`;
  const cuerpo = freqs.slice(0, -1).join(', ');
  return `las frecuencias de ${cuerpo} y ${freqs[freqs.length - 1]} Hz`;
}

function fraseEnMayor(freqsMax: number[], forzarVarias: boolean): string {
  if (forzarVarias || freqsMax.length >= 4) return 'en varias frecuencias';
  if (freqsMax.length === 1) return `en ${freqsMax[0]} Hz`;
  if (freqsMax.length === 2) return `en ${freqsMax[0]} y ${freqsMax[1]} Hz`;
  const cuerpo = freqsMax.slice(0, -1).join(', ');
  return `en ${cuerpo} y ${freqsMax[freqsMax.length - 1]} Hz`;
}

function introOido(fechaBasal: string, oidoTxt: string): string {
  return `En comparación con la audiometría basal del ${fechaBasal}, se describen los cambios de umbral tonal del ${oidoTxt}.`;
}

function fraseIncompleto(faltantes: number[]): string {
  if (faltantes.length === 1) {
    return `No fue posible comparar la frecuencia de ${faltantes[0]} Hz.`;
  }
  if (faltantes.length === 2) {
    return `No fue posible comparar las frecuencias de ${faltantes[0]} y ${faltantes[1]} Hz.`;
  }
  return `No fue posible comparar ${palabraN(faltantes.length)} frecuencias.`;
}

function fraseTrayectoria(patron: TrayectoriaIla): string {
  if (patron === 'progresion') return 'La serie muestra progresión del cambio.';
  if (patron === 'estable_vs_anterior') {
    return 'El umbral se mantiene respecto de la evaluación previa.';
  }
  if (patron === 'disminucion_del_cambio') {
    return 'El cambio previo disminuye en la audiometría más reciente.';
  }
  if (patron === 'fluctuacion') return 'La serie muestra fluctuación de los umbrales.';
  if (patron === 'no_uniforme') {
    return 'La serie no muestra un patrón uniforme entre frecuencias.';
  }
  return '';
}

export function etiquetaTrayectoriaFrecuenciaIla(ds: number[]): TrayectoriaLocalIla {
  const n = ds.length;
  if (n < 2) return 'omitir_local';
  const prev = ds[n - 2];
  const rec = ds[n - 1];
  const hLast = rec - prev;
  const hops: number[] = [ds[0]];
  for (let k = 1; k < n; k++) hops.push(ds[k] - ds[k - 1]);

  const cruceRelevante =
    signIla(prev) !== signIla(rec) && rec !== 0 && Math.abs(rec) >= T;

  if (
    Math.abs(prev) - Math.abs(rec) >= T &&
    (rec === 0 || signIla(prev) === signIla(rec)) &&
    Math.abs(rec) < Math.abs(prev) &&
    !cruceRelevante
  ) {
    return 'disminucion_del_cambio';
  }

  if (signIla(prev) !== signIla(rec) && Math.abs(rec) >= T) {
    return 'fluctuacion';
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(ds[i]) - Math.abs(ds[i + 1]) < T) continue;
    for (let j = i + 1; j < n; j++) {
      const h = ds[j] - ds[j - 1];
      if (
        Math.abs(h) >= T &&
        signIla(ds[j]) === signIla(ds[i]) &&
        signIla(ds[i]) !== 0
      ) {
        return 'fluctuacion';
      }
    }
  }

  const hopsRel = hops.filter((h) => Math.abs(h) >= T);
  const hayPos = hopsRel.some((h) => h > 0);
  const hayNeg = hopsRel.some((h) => h < 0);
  if (hayPos && hayNeg) return 'fluctuacion';

  if (Math.abs(rec) >= T && Math.abs(hLast) < T) return 'estable_vs_anterior';

  const S = signIla(rec);
  const nonzero = ds.filter((d) => d !== 0);
  if (
    S !== 0 &&
    nonzero.every((d) => signIla(d) === S) &&
    hopsRel.every((h) => signIla(h) === S) &&
    !hopsRel.some((h) => signIla(h) === -S) &&
    Math.abs(rec) >= Math.abs(prev) &&
    hopsRel.some((h) => signIla(h) === S)
  ) {
    return 'progresion';
  }
  return 'omitir_local';
}

export function agregarTrayectoriaIla(etiquetas: TrayectoriaLocalIla[]): TrayectoriaIla {
  const utiles = etiquetas.filter(
    (e): e is Exclude<TrayectoriaLocalIla, 'omitir_local'> => e !== 'omitir_local',
  );
  if (!utiles.length) return 'omitir';
  const unica = utiles[0];
  if (utiles.every((e) => e === unica)) return unica;
  return 'no_uniforme';
}

function clasificarEstado(dRec: Array<number | null>): {
  estado: EstadoRecienteIla;
  inc: number[];
  dim: number[];
  variaciones: number[];
  freqsMax: number[];
  maxAbs: number;
  nComp: number;
  faltantes: number[];
  frecuenciasEstado: number[];
} {
  const faltantes: number[] = [];
  const comparable: { freq: number; d: number }[] = [];
  FRECUENCIAS_ILA.forEach((freq, i) => {
    const d = dRec[i];
    if (d == null) faltantes.push(freq);
    else comparable.push({ freq, d });
  });
  const nComp = comparable.length;
  if (!nComp) {
    return {
      estado: 'insuficiente',
      inc: [],
      dim: [],
      variaciones: [],
      freqsMax: [],
      maxAbs: 0,
      nComp: 0,
      faltantes,
      frecuenciasEstado: [],
    };
  }
  const inc = comparable.filter((c) => c.d >= T).map((c) => c.freq);
  const dim = comparable.filter((c) => c.d <= -T).map((c) => c.freq);
  const variaciones = comparable.filter((c) => c.d !== 0 && Math.abs(c.d) < T).map((c) => c.freq);
  let maxAbs = 0;
  for (const c of comparable) {
    if (Math.abs(c.d) > maxAbs) maxAbs = Math.abs(c.d);
  }
  const freqsMax = comparable.filter((c) => Math.abs(c.d) === maxAbs).map((c) => c.freq);
  let estado: EstadoRecienteIla;
  if (inc.length && dim.length) estado = 'mixto_signo';
  else if (inc.length) estado = 'incremento';
  else if (dim.length) estado = 'disminucion';
  else if (comparable.some((c) => c.d !== 0)) estado = 'variaciones_menores';
  else estado = 'sin_cambio';

  let frecuenciasEstado: number[] = [];
  if (estado === 'incremento') frecuenciasEstado = inc;
  else if (estado === 'disminucion') frecuenciasEstado = dim;
  else if (estado === 'mixto_signo') frecuenciasEstado = [...inc, ...dim];
  else if (estado === 'variaciones_menores') frecuenciasEstado = variaciones;

  return { estado, inc, dim, variaciones, freqsMax, maxAbs, nComp, faltantes, frecuenciasEstado };
}

function fraseEstado(opts: {
  estado: EstadoRecienteIla;
  inc: number[];
  dim: number[];
  variaciones: number[];
  freqsMax: number[];
  maxAbs: number;
  nComp: number;
  nFalt: number;
}): string {
  const { estado, inc, dim, variaciones, freqsMax, maxAbs, nComp, nFalt } = opts;
  if (estado === 'insuficiente') {
    return 'No hay frecuencias comparables en la audiometría reciente respecto de la basal; no se describe cambio de umbral.';
  }
  if (estado === 'sin_cambio') {
    return 'En la audiometría reciente no se observan cambios de umbral respecto de la basal en las frecuencias comparadas.';
  }

  const mixto = estado === 'mixto_signo';
  const usarConteoMixto =
    mixto &&
    ((inc.length >= 2 && dim.length >= 2) ||
      inc.length + dim.length >= 5 ||
      nFalt > 0 ||
      freqsMax.length >= 2);
  const forzarVarias = freqsMax.length >= 4 || (usarConteoMixto && freqsMax.length >= 2);
  const enMayor = fraseEnMayor(freqsMax, forzarVarias);
  const nTxt = String(maxAbs);

  if (usarConteoMixto) {
    return `De ${palabraN(nComp)} frecuencias comparables, ${palabraN(inc.length)} presentan incremento y ${palabraN(dim.length)} disminución aparente; el mayor cambio es de ${nTxt} dB ${enMayor}.`;
  }

  if (mixto && inc.length === 1 && dim.length === 1) {
    return `Se observa incremento de umbral en ${inc[0]} Hz y disminución (mejoría aparente) en ${dim[0]} Hz; el mayor cambio es de ${nTxt} dB ${enMayor}.`;
  }

  const freqs =
    estado === 'disminucion' ? dim : estado === 'variaciones_menores' ? variaciones : inc;
  const nLista = freqs.length;
  const usarConteoUnaPolaridad = nLista >= 5;
  let lista: string;
  if (usarConteoUnaPolaridad) {
    lista =
      nLista === nComp
        ? `las ${palabraN(nComp)} frecuencias comparables`
        : `${palabraN(nLista)} de las ${palabraN(nComp)} frecuencias comparables`;
  } else if (nLista >= 4 && forzarVarias) {
    lista = `${palabraN(nLista)} frecuencias`;
  } else {
    lista = listarFrecuencias(freqs);
  }

  if (maxAbs < 10) {
    return `Se observan variaciones de umbral en ${lista}; la de mayor magnitud es de ${nTxt} dB ${enMayor}.`;
  }
  if (estado === 'disminucion') {
    return `Se observa disminución de umbral (mejoría aparente) en ${lista}; la de mayor magnitud es de ${nTxt} dB ${enMayor}.`;
  }
  return `Se observa incremento de umbral en ${lista}; el mayor cambio es de ${nTxt} dB ${enMayor}.`;
}

export function esBorradorInterpretacionIlaAplicable(texto?: string | null): boolean {
  const s = String(texto || '').trim();
  return Boolean(s) && s !== TEXTO_BORRADOR_ILA_SIN_BASAL;
}

export function interpretarOidoIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  matriz: FilaMatrizDeltaAudiometrico[],
  oido: OidoInterpretacionIla,
): DetalleInterpretacionOidoIla {
  const vacio: DetalleInterpretacionOidoIla = {
    texto: TEXTO_BORRADOR_ILA_SIN_BASAL,
    estado: '',
    trayectoria: 'omitir',
    frecuenciasEstado: [],
    frecuenciasTrayectoria: [],
  };
  if (!basal) return vacio;

  const oidoTxt = oido === 'Derecho' ? 'oído derecho' : 'oído izquierdo';
  const fechaBasal = formatFechaHumanaIla(basal.fechaAudiometria);
  const intro = introOido(fechaBasal, oidoTxt);
  const filas = filasPorOido(matriz, oido);

  if (!filas.length) {
    return {
      texto: `${intro} En la audiometría reciente no se observan cambios de umbral respecto de la basal en las frecuencias comparadas.`,
      estado: 'sin_cambio',
      trayectoria: 'omitir',
      frecuenciasEstado: [],
      frecuenciasTrayectoria: [],
    };
  }

  let maxFecha = '';
  for (const f of filas) {
    const k = claveFechaOrdenIla(f.fechaAudiometria);
    if (k > maxFecha) maxFecha = k;
  }
  const empatadas = filas.filter((f) => claveFechaOrdenIla(f.fechaAudiometria) === maxFecha);
  let omitirTrayectoriaPorFecha = false;
  let reciente = empatadas[empatadas.length - 1];
  if (empatadas.length > 1) {
    const coinciden = empatadas.every((f) => seriesIguales(f, empatadas[0]));
    if (!coinciden) {
      return {
        texto: `${intro} Hay más de una audiometría con la misma fecha; no se describe cuál es la más reciente.`,
        estado: '',
        trayectoria: 'omitir',
        frecuenciasEstado: [],
        frecuenciasTrayectoria: [],
      };
    }
    reciente = empatadas[0];
    omitirTrayectoriaPorFecha = true;
  }

  const anteriores = filas.filter((f) => claveFechaOrdenIla(f.fechaAudiometria) < maxFecha);
  const serieFilas = [...anteriores, reciente];
  const dRec = FRECUENCIAS_ILA.map((freq) => deltaDe(reciente, freq));
  const clas = clasificarEstado(dRec);
  if (clas.estado === 'insuficiente') {
    return {
      texto: `${intro} ${fraseEstado({ ...clas, nFalt: clas.faltantes.length })}`,
      estado: 'insuficiente',
      trayectoria: 'omitir',
      frecuenciasEstado: [],
      frecuenciasTrayectoria: [],
    };
  }

  const estadoTxt = fraseEstado({ ...clas, nFalt: clas.faltantes.length });
  let texto = `${intro} ${estadoTxt}`;
  if (clas.faltantes.length) {
    texto = `${texto} ${fraseIncompleto(clas.faltantes)}`;
  }

  let trayectoria: TrayectoriaIla = 'omitir';
  const frecuenciasTrayectoria: number[] = [];
  if (!omitirTrayectoriaPorFecha && serieFilas.length >= 2) {
    const etiquetas: TrayectoriaLocalIla[] = [];
    for (const freq of FRECUENCIAS_ILA) {
      const ds = serieFilas.map((f) => deltaDe(f, freq));
      if (ds.some((d) => d == null)) continue;
      const nums = ds as number[];
      const hops: number[] = [nums[0]];
      for (let k = 1; k < nums.length; k++) hops.push(nums[k] - nums[k - 1]);
      const informativa =
        nums.some((d) => Math.abs(d) >= T) || hops.some((h) => Math.abs(h) >= T);
      if (!informativa) continue;
      frecuenciasTrayectoria.push(freq);
      etiquetas.push(etiquetaTrayectoriaFrecuenciaIla(nums));
    }
    trayectoria = agregarTrayectoriaIla(etiquetas);
    const frase = fraseTrayectoria(trayectoria);
    if (frase) {
      const candidato = `${texto} ${frase}`;
      if (candidato.length <= MAX_CHARS_INTERPRETACION_OIDO_ILA) {
        texto = candidato;
      } else {
        trayectoria = 'omitir';
      }
    }
  }

  return {
    texto,
    estado: clas.estado,
    trayectoria,
    frecuenciasEstado: clas.frecuenciasEstado,
    frecuenciasTrayectoria,
  };
}

export function construirBorradorInterpretacionOidoIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  matriz: FilaMatrizDeltaAudiometrico[],
  oido: OidoInterpretacionIla,
): string {
  return interpretarOidoIla(basal, matriz, oido).texto;
}

export function construirBorradorInterpretacionIla(
  basal: AudiometriaConcentradaLongitudinal | null | undefined,
  matriz: FilaMatrizDeltaAudiometrico[],
): string {
  if (!basal) return TEXTO_BORRADOR_ILA_SIN_BASAL;
  return [
    construirBorradorInterpretacionOidoIla(basal, matriz, 'Derecho'),
    construirBorradorInterpretacionOidoIla(basal, matriz, 'Izquierdo'),
  ].join(' ');
}
