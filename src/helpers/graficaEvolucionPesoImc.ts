import { formatDateDDMMYYYY } from '@/helpers/dates';

export const MSJ_GRAFICA_PESO_IMC_INSUFICIENTE =
  'No hay suficientes datos de peso o IMC para generar gráfica.';

/** Subconjunto mínimo de evento concentrado para peso / IMC */
export type EventoPesoImcLike = {
  fechaControl?: Date | string;
  somatometria?: { peso?: number; indiceMasaCorporal?: number };
};

function fechaOrden(ev: EventoPesoImcLike): number {
  const d = ev?.fechaControl;
  if (d == null || d === '') return NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/** Máximo 1 decimal; null si no hay valor usable */
function parseUnDecimal(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Number.parseFloat(n.toFixed(1));
}

/**
 * Orden por fecha, filas con al menos peso o IMC, labels con desempate por día.
 * Criterio: ≥2 puntos en peso **o** ≥2 en IMC.
 */
export function buildEvolucionPesoImcSeries(eventos: EventoPesoImcLike[] | undefined | null): {
  sufficientData: boolean;
  labels: string[];
  peso: (number | null)[];
  imc: (number | null)[];
} {
  const list = (eventos || []).filter((e) => e && Number.isFinite(fechaOrden(e)));
  const sorted = [...list].sort((a, b) => fechaOrden(a) - fechaOrden(b));

  const rows = sorted
    .map((ev) => {
      const sm = ev.somatometria;
      const p = parseUnDecimal(sm?.peso);
      const i = parseUnDecimal(sm?.indiceMasaCorporal);
      return { fecha: ev.fechaControl!, p, i };
    })
    .filter((r) => r.p != null || r.i != null);

  const labels: string[] = [];
  const peso: (number | null)[] = [];
  const imc: (number | null)[] = [];
  const labelUses = new Map<string, number>();

  for (const r of rows) {
    const base = formatDateDDMMYYYY(r.fecha) || '—';
    const n = (labelUses.get(base) ?? 0) + 1;
    labelUses.set(base, n);
    const label = n > 1 ? `${base} (${n})` : base;
    labels.push(label);
    peso.push(r.p);
    imc.push(r.i);
  }

  const pPts = peso.filter((x) => x != null).length;
  const iPts = imc.filter((x) => x != null).length;
  const sufficientData = pPts >= 2 || iPts >= 2;

  return { sufficientData, labels, peso, imc };
}

function numerosValidos(arr: (number | null)[]): number[] {
  return arr.filter((x): x is number => x != null && Number.isFinite(x));
}

export function boundsEjePesoKg(peso: (number | null)[]): { min: number; max: number } {
  const nums = numerosValidos(peso);
  if (!nums.length) return { min: 50, max: 100 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const span = max - min || 5;
  return {
    min: Math.round((min - span * 0.08) * 10) / 10,
    max: Math.round((max + span * 0.08) * 10) / 10,
  };
}

/** Umbrales IMC de grado de obesidad (OMS): I, II y III. */
export const REFERENCIAS_IMC_GRADO_OBESIDAD = [30, 35, 40] as const;

export function boundsEjeImc(imc: (number | null)[]): { min: number; max: number } {
  const nums = numerosValidos(imc);
  const refs = [...REFERENCIAS_IMC_GRADO_OBESIDAD];
  const candidatos = nums.length ? [...nums, ...refs] : [20, 25, ...refs];
  let min = Math.min(...candidatos);
  let max = Math.max(...candidatos);
  const span = max - min || 2;
  return {
    min: Math.round((min - span * 0.08) * 10) / 10,
    max: Math.round((max + span * 0.08) * 10) / 10,
  };
}
