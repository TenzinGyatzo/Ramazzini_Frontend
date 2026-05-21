/**
 * Series y estadísticas por eje desde eventosConcentrados (ESC).
 * Modelo enriquecido en memoria para riesgo/trayectoria; proyección slim para persistencia.
 */
import type {
  EventoConcentradoCardiometabolicoEsc,
  ResumenIndicadorLongitudinalEsc,
  ResumenIndicadoresLongitudinalEsc,
} from '@/interfaces/documentos.inteface';

/** Umbrales prácticos de |Δ| para zona Estable; evitan sobreinterpretar ruido de medición. No son criterio diagnóstico. */
export const CONFIG_UMBRALES_TENDENCIA_ILC = {
  tensionArterialSistolica: 5,
  tensionArterialDiastolica: 3,
  peso: 1,
  indiceMasaCorporal: 0.5,
  glucosaMgDl: 10,
  hba1cPorcentaje: 0.3,
  ldlMgDl: 10,
  trigliceridosMgDl: 20,
} as const;

export type EjeUmbralTendenciaIlc = keyof typeof CONFIG_UMBRALES_TENDENCIA_ILC;

export type TendenciaIndicadorIlc = 'Mejoría' | 'Estable' | 'Empeoramiento';

export interface EstadisticaEjeLongitudinal extends ResumenIndicadorLongitudinalEsc {
  peorValor?: number;
  mejorValor?: number;
  numeroMediciones?: number;
  tieneDatosSuficientes?: boolean;
  /** Última categoría clínica ESC en visitas con dato (respaldo interpretativo). */
  ultimaCategoria?: string;
}

export interface ResumenIndicadoresEnriquecido {
  tensionArterialSistolica?: EstadisticaEjeLongitudinal;
  tensionArterialDiastolica?: EstadisticaEjeLongitudinal;
  peso?: EstadisticaEjeLongitudinal;
  indiceMasaCorporal?: EstadisticaEjeLongitudinal;
  glucosaMgDl?: EstadisticaEjeLongitudinal;
  hba1cPorcentaje?: EstadisticaEjeLongitudinal;
  /** Solo riesgo/coherencia; no se proyecta a resumenIndicadores persistido. */
  ldlMgDl?: EstadisticaEjeLongitudinal;
  trigliceridosMgDl?: EstadisticaEjeLongitudinal;
  colesterolTotalMgDl?: EstadisticaEjeLongitudinal;
  hdlMgDl?: EstadisticaEjeLongitudinal;
}

export function parseFechaComparable(f?: string): number {
  if (!f || typeof f !== 'string') return NaN;
  const t = Date.parse(f.includes('T') ? f : `${f}T12:00:00.000Z`);
  return Number.isNaN(t) ? NaN : t;
}

/** Ordena por `fechaControl` ascendente y descarta sin fecha válida. */
export function eventosCronologicos(events: EventoConcentradoCardiometabolicoEsc[]): EventoConcentradoCardiometabolicoEsc[] {
  return [...events]
    .filter((e) => typeof e.fechaControl === 'string' && Number.isFinite(parseFechaComparable(e.fechaControl)))
    .sort((a, b) => parseFechaComparable(a.fechaControl!) - parseFechaComparable(b.fechaControl!));
}

type PuntoSerie = { v: number; categoria?: string };

function num(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Clasifica tendencia inicial→final con umbral de zona estable.
 * Por defecto menor valor = mejoría (TA, peso, IMC, glucosa, HbA1c, LDL, TG).
 */
export function clasificarTendenciaPorUmbral(
  valorInicial: number,
  valorFinal: number,
  umbralEstable: number,
  opts?: { menorEsMejoria?: boolean },
): TendenciaIndicadorIlc {
  const menorEsMejoria = opts?.menorEsMejoria !== false;
  const delta = valorFinal - valorInicial;
  const absDelta = Math.abs(delta);
  if (absDelta <= umbralEstable) return 'Estable';
  if (menorEsMejoria) {
    return delta < 0 ? 'Mejoría' : 'Empeoramiento';
  }
  return delta > 0 ? 'Mejoría' : 'Empeoramiento';
}

/**
 * Cambio numérico para UI/PDF: (+ 2), (- 0.2) o (0). Magnitud siempre positiva con signo explícito.
 */
export function formatearCambioIndicadorConSigno(
  cambio: number | null | undefined,
  fmtMagnitud?: (abs: number) => string | null,
): string {
  if (cambio == null) return '';
  const n = Number(cambio);
  if (!Number.isFinite(n)) return '';
  const fmt =
    fmtMagnitud ?? ((abs: number) => String(Number.parseFloat(abs.toFixed(2))));
  if (n === 0) {
    const z = fmt(0);
    return z != null ? ` (${z})` : ' (0)';
  }
  const mag = fmt(Math.abs(n));
  if (mag == null) return '';
  return n > 0 ? ` (+${mag})` : ` (-${mag})`;
}

/** Eje donde mayor valor = peor desenlace (glucosa, TA, IMC, LDL, TG). */
export function calcularEstadisticaEje(
  puntos: PuntoSerie[],
  opts?: { peorEsMaximo?: boolean; eje?: EjeUmbralTendenciaIlc },
): EstadisticaEjeLongitudinal | undefined {
  const peorEsMaximo = opts?.peorEsMaximo !== false;
  const nums = puntos
    .map((p) => p.v)
    .filter((v) => !Number.isNaN(v));
  if (nums.length === 0) return undefined;

  const inicial = nums[0]!;
  const final = nums[nums.length - 1]!;
  const cambioAbsoluto = final - inicial;
  const peorValor = peorEsMaximo ? Math.max(...nums) : Math.min(...nums);
  const mejorValor = peorEsMaximo ? Math.min(...nums) : Math.max(...nums);

  const ultimaCat = [...puntos].reverse().find((p) => p.categoria && String(p.categoria).trim())?.categoria;

  let tendencia: TendenciaIndicadorIlc | undefined;
  if (nums.length >= 2 && opts?.eje) {
    const umbral = CONFIG_UMBRALES_TENDENCIA_ILC[opts.eje];
    tendencia = clasificarTendenciaPorUmbral(inicial, final, umbral, { menorEsMejoria: peorEsMaximo });
  }

  return {
    valorInicial: inicial,
    valorFinal: final,
    cambioAbsoluto,
    tendencia,
    peorValor,
    mejorValor,
    numeroMediciones: nums.length,
    tieneDatosSuficientes: nums.length >= 2,
    ultimaCategoria: ultimaCat,
  };
}

function serieDesdeEventos(
  cron: EventoConcentradoCardiometabolicoEsc[],
  pick: (e: EventoConcentradoCardiometabolicoEsc) => { v?: unknown; cat?: string } | undefined,
  opts?: { peorEsMaximo?: boolean; eje?: EjeUmbralTendenciaIlc },
): EstadisticaEjeLongitudinal | undefined {
  const puntos: PuntoSerie[] = [];
  for (const e of cron) {
    const x = pick(e);
    const v = num(x?.v);
    if (v != null) puntos.push({ v, categoria: x?.cat });
  }
  return calcularEstadisticaEje(puntos, {
    peorEsMaximo: opts?.peorEsMaximo !== false,
    eje: opts?.eje,
  });
}

/**
 * Estadísticas completas: 6 ejes UI + lípidos internos (LDL, TG, CT, HDL).
 */
export function derivarResumenIndicadoresCompleto(
  eventosConcentrados: EventoConcentradoCardiometabolicoEsc[] | undefined,
): ResumenIndicadoresEnriquecido | undefined {
  const cron = eventosCronologicos(Array.isArray(eventosConcentrados) ? eventosConcentrados : []);
  if (cron.length === 0) return undefined;

  const out: ResumenIndicadoresEnriquecido = {};

  const iS = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.signosVitales?.tensionArterialSistolica,
      cat: e.signosVitales?.categoriaTensionArterial,
    }),
    { eje: 'tensionArterialSistolica' },
  );
  const iD = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.signosVitales?.tensionArterialDiastolica,
      cat: e.signosVitales?.categoriaTensionArterial,
    }),
    { eje: 'tensionArterialDiastolica' },
  );
  const iPeso = serieDesdeEventos(cron, (e) => ({ v: e.somatometria?.peso }), { eje: 'peso' });
  const iImc = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.somatometria?.indiceMasaCorporal,
      cat: e.somatometria?.categoriaIMC,
    }),
    { eje: 'indiceMasaCorporal' },
  );
  const iGlu = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.laboratorio?.glucosaMgDl,
      cat: e.laboratorio?.categoriaGlucosa,
    }),
    { eje: 'glucosaMgDl' },
  );
  const iHba = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.laboratorio?.hba1cPorcentaje,
      cat: e.laboratorio?.categoriaHbA1c,
    }),
    { eje: 'hba1cPorcentaje' },
  );
  const iLdl = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.laboratorio?.ldlMgDl,
      cat: e.laboratorio?.categoriaLDL,
    }),
    { eje: 'ldlMgDl' },
  );
  const iTg = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.laboratorio?.trigliceridosMgDl,
      cat: e.laboratorio?.categoriaTrigliceridos,
    }),
    { eje: 'trigliceridosMgDl' },
  );
  const iCt = serieDesdeEventos(cron, (e) => ({
    v: e.laboratorio?.colesterolTotalMgDl,
    cat: e.laboratorio?.categoriaColesterolTotal,
  }));
  const iHdl = serieDesdeEventos(
    cron,
    (e) => ({
      v: e.laboratorio?.hdlMgDl,
      cat: e.laboratorio?.categoriaHDL,
    }),
    { peorEsMaximo: false },
  );

  if (iS) out.tensionArterialSistolica = iS;
  if (iD) out.tensionArterialDiastolica = iD;
  if (iPeso) out.peso = iPeso;
  if (iImc) out.indiceMasaCorporal = iImc;
  if (iGlu) out.glucosaMgDl = iGlu;
  if (iHba) out.hba1cPorcentaje = iHba;
  if (iLdl) out.ldlMgDl = iLdl;
  if (iTg) out.trigliceridosMgDl = iTg;
  if (iCt) out.colesterolTotalMgDl = iCt;
  if (iHdl) out.hdlMgDl = iHdl;

  return Object.keys(out).length ? out : undefined;
}

const EJES_SLIM: (keyof ResumenIndicadoresLongitudinalEsc)[] = [
  'tensionArterialSistolica',
  'tensionArterialDiastolica',
  'peso',
  'indiceMasaCorporal',
  'glucosaMgDl',
  'hba1cPorcentaje',
];

function proyectarIndicadorSlim(e?: EstadisticaEjeLongitudinal): ResumenIndicadorLongitudinalEsc | undefined {
  if (!e) return undefined;
  return {
    valorInicial: e.valorInicial,
    valorFinal: e.valorFinal,
    cambioAbsoluto: e.cambioAbsoluto,
    tendencia: e.tendencia,
  };
}

/** Solo 6 ejes visibles × 4 campos (sin peorValor ni tieneDatosSuficientes). */
export function proyectarResumenIndicadoresParaPersistencia(
  enriquecido: ResumenIndicadoresEnriquecido | undefined,
): ResumenIndicadoresLongitudinalEsc | undefined {
  if (!enriquecido) return undefined;
  const out: ResumenIndicadoresLongitudinalEsc = {};
  for (const k of EJES_SLIM) {
    const slim = proyectarIndicadorSlim(enriquecido[k]);
    if (slim) out[k] = slim;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Ejes principales usados en trayectoria agregada (excluye lípidos). */
export function ejesPrincipalesParaTrayectoria(
  ind: ResumenIndicadoresEnriquecido | ResumenIndicadoresLongitudinalEsc | undefined,
): ResumenIndicadorLongitudinalEsc[] {
  if (!ind) return [];
  const pares: ResumenIndicadorLongitudinalEsc[] = [];
  if (ind.tensionArterialSistolica) pares.push(ind.tensionArterialSistolica);
  if (ind.tensionArterialDiastolica) pares.push(ind.tensionArterialDiastolica);
  if (ind.indiceMasaCorporal) pares.push(ind.indiceMasaCorporal);
  if (ind.glucosaMgDl) pares.push(ind.glucosaMgDl);
  if (ind.hba1cPorcentaje) pares.push(ind.hba1cPorcentaje);
  if (ind.peso) pares.push(ind.peso);
  return pares;
}

export function ejeConSerieParaTrayectoria(o: ResumenIndicadorLongitudinalEsc | undefined): boolean {
  return o?.tendencia != null && o.tendencia !== '';
}
