import { formatDateDDMMYYYY } from '@/helpers/dates';

export const MSJ_GRAFICA_PRESION_ARTERIAL_INSUFICIENTE =
  'No hay suficientes datos de presión arterial para generar gráfica.';

/** Subconjunto mínimo de evento concentrado para la gráfica de TA */
export type EventoPresionArterialLike = {
  fechaControl?: Date | string;
  signosVitales?: {
    tensionArterialSistolica?: number;
    tensionArterialDiastolica?: number;
  };
};

function fechaOrden(ev: EventoPresionArterialLike): number {
  const d = ev?.fechaControl;
  if (d == null || d === '') return NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function parseMmHg(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Ordena por fecha, filtra eventos con al menos sistólica o diastólica, arma labels y series.
 * Criterio mínimo: al menos 2 puntos no nulos en sistólica **o** al menos 2 en diastólica.
 */
export function buildEvolucionPresionArterialSeries(
  eventos: EventoPresionArterialLike[] | undefined | null,
): {
  sufficientData: boolean;
  labels: string[];
  sistolica: (number | null)[];
  diastolica: (number | null)[];
} {
  const list = (eventos || []).filter((e) => e && Number.isFinite(fechaOrden(e)));
  const sorted = [...list].sort((a, b) => fechaOrden(a) - fechaOrden(b));

  const rows = sorted
    .map((ev) => {
      const sv = ev.signosVitales;
      const s = parseMmHg(sv?.tensionArterialSistolica);
      const d = parseMmHg(sv?.tensionArterialDiastolica);
      return { fecha: ev.fechaControl!, s, d };
    })
    .filter((r) => r.s != null || r.d != null);

  const labels: string[] = [];
  const sistolica: (number | null)[] = [];
  const diastolica: (number | null)[] = [];

  const labelUses = new Map<string, number>();

  for (const r of rows) {
    const base = formatDateDDMMYYYY(r.fecha) || '—';
    const n = (labelUses.get(base) ?? 0) + 1;
    labelUses.set(base, n);
    const label = n > 1 ? `${base} (${n})` : base;
    labels.push(label);
    sistolica.push(r.s);
    diastolica.push(r.d);
  }

  const sPts = sistolica.filter((x) => x != null).length;
  const dPts = diastolica.filter((x) => x != null).length;
  const sufficientData = sPts >= 2 || dPts >= 2;

  return { sufficientData, labels, sistolica, diastolica };
}

function numerosValidos(arr: (number | null)[]): number[] {
  return arr.filter((x): x is number => x != null && Number.isFinite(x));
}

/** Límites eje mmHg (incluye referencias 140 y 90 cuando aplica). */
export function boundsEjePresionArterialMmHg(
  sistolica: (number | null)[],
  diastolica: (number | null)[],
): { min: number; max: number } {
  const nums = [...numerosValidos(sistolica), ...numerosValidos(diastolica)];
  const candidatos = nums.length ? [...nums, 90, 140] : [60, 90, 120, 140, 180];
  let min = Math.min(...candidatos);
  let max = Math.max(...candidatos);
  const span = max - min || 40;
  return { min: Math.floor(min - span * 0.06), max: Math.ceil(max + span * 0.06) };
}
