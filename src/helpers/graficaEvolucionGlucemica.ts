import { formatDateDDMMYYYY } from '@/helpers/dates';

export const MSJ_GRAFICA_GLUCEMIA_INSUFICIENTE =
  'No hay suficientes datos de glucosa o HbA1c para generar gráfica.';

/** Subconjunto mínimo de evento concentrado para la gráfica glucémica */
export type EventoGlucemicoLike = {
  fechaControl?: Date | string;
  laboratorio?: { glucosaMgDl?: number; hba1cPorcentaje?: number };
};

function fechaOrden(ev: EventoGlucemicoLike): number {
  const d = ev?.fechaControl;
  if (d == null || d === '') return NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function parseGlucosa(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function parseHbA1c(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number.parseFloat(n.toFixed(1));
}

/**
 * Ordena por fecha, filtra eventos con al menos glucosa o HbA1c, arma labels y series.
 * Criterio mínimo: al menos 2 puntos no nulos en glucosa **o** al menos 2 en HbA1c.
 */
export function buildEvolucionGlucemicaSeries(eventos: EventoGlucemicoLike[] | undefined | null): {
  sufficientData: boolean;
  labels: string[];
  glucosa: (number | null)[];
  hba1c: (number | null)[];
} {
  const list = (eventos || []).filter((e) => e && Number.isFinite(fechaOrden(e)));
  const sorted = [...list].sort((a, b) => fechaOrden(a) - fechaOrden(b));

  const rows = sorted
    .map((ev) => {
      const g = parseGlucosa(ev.laboratorio?.glucosaMgDl);
      const h = parseHbA1c(ev.laboratorio?.hba1cPorcentaje);
      return { fecha: ev.fechaControl!, g, h };
    })
    .filter((r) => r.g != null || r.h != null);

  const labels: string[] = [];
  const glucosa: (number | null)[] = [];
  const hba1c: (number | null)[] = [];

  const labelUses = new Map<string, number>();

  for (const r of rows) {
    const base = formatDateDDMMYYYY(r.fecha) || '—';
    const n = (labelUses.get(base) ?? 0) + 1;
    labelUses.set(base, n);
    const label = n > 1 ? `${base} (${n})` : base;
    labels.push(label);
    glucosa.push(r.g);
    hba1c.push(r.h);
  }

  const gPts = glucosa.filter((x) => x != null).length;
  const hPts = hba1c.filter((x) => x != null).length;
  const sufficientData = gPts >= 2 || hPts >= 2;

  return { sufficientData, labels, glucosa, hba1c };
}

function numerosValidos(arr: (number | null)[]): number[] {
  return arr.filter((x): x is number => x != null && Number.isFinite(x));
}

/** Límites eje glucosa (incluye referencias 100 y 126 mg/dL). */
export function boundsEjeGlucosa(glucosa: (number | null)[]): { min: number; max: number } {
  const nums = numerosValidos(glucosa);
  const candidatos = nums.length ? [...nums, 100, 126] : [70, 100, 126, 180];
  let min = Math.min(...candidatos);
  let max = Math.max(...candidatos);
  const span = max - min || 40;
  return { min: Math.floor(min - span * 0.06), max: Math.ceil(max + span * 0.06) };
}

/** Límites eje HbA1c (incluye referencias 5.7 y 6.5 %). */
export function boundsEjeHbA1c(hba1c: (number | null)[]): { min: number; max: number } {
  const nums = numerosValidos(hba1c);
  const candidatos = nums.length ? [...nums, 5.7, 6.5] : [4.5, 5.7, 6.5, 8];
  let min = Math.min(...candidatos);
  let max = Math.max(...candidatos);
  const span = max - min || 2;
  return {
    min: Math.round((min - span * 0.08) * 10) / 10,
    max: Math.round((max + span * 0.08) * 10) / 10,
  };
}
