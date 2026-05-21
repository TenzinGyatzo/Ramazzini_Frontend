import { formatDateDDMMYYYY } from '@/helpers/dates';

export const MSJ_GRAFICA_PERFIL_LIPIDICO_INSUFICIENTE =
  'No hay suficientes datos del perfil lipídico para generar gráfica.';

export type EventoPerfilLipidicoLike = {
  fechaControl?: Date | string;
  laboratorio?: {
    colesterolTotalMgDl?: number;
    ldlMgDl?: number;
    hdlMgDl?: number;
    trigliceridosMgDl?: number;
  };
};

function fechaOrden(ev: EventoPerfilLipidicoLike): number {
  const d = ev?.fechaControl;
  if (d == null || d === '') return NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  return Number.isFinite(t) ? t : NaN;
}

function parseMgDl(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

/**
 * Orden por fecha; filas con al menos un valor lipídico; labels con desempate por día.
 * Criterio: al menos 2 puntos en **alguna** de las cuatro series.
 */
export function buildEvolucionPerfilLipidicoSeries(
  eventos: EventoPerfilLipidicoLike[] | undefined | null,
): {
  sufficientData: boolean;
  labels: string[];
  colesterolTotal: (number | null)[];
  ldl: (number | null)[];
  hdl: (number | null)[];
  trigliceridos: (number | null)[];
} {
  const list = (eventos || []).filter((e) => e && Number.isFinite(fechaOrden(e)));
  const sorted = [...list].sort((a, b) => fechaOrden(a) - fechaOrden(b));

  const rows = sorted
    .map((ev) => {
      const lab = ev.laboratorio;
      const ct = parseMgDl(lab?.colesterolTotalMgDl);
      const ldl = parseMgDl(lab?.ldlMgDl);
      const hdl = parseMgDl(lab?.hdlMgDl);
      const tg = parseMgDl(lab?.trigliceridosMgDl);
      return { fecha: ev.fechaControl!, ct, ldl, hdl, tg };
    })
    .filter((r) => r.ct != null || r.ldl != null || r.hdl != null || r.tg != null);

  const labels: string[] = [];
  const colesterolTotal: (number | null)[] = [];
  const ldl: (number | null)[] = [];
  const hdl: (number | null)[] = [];
  const trigliceridos: (number | null)[] = [];
  const labelUses = new Map<string, number>();

  for (const r of rows) {
    const base = formatDateDDMMYYYY(r.fecha) || '—';
    const n = (labelUses.get(base) ?? 0) + 1;
    labelUses.set(base, n);
    const label = n > 1 ? `${base} (${n})` : base;
    labels.push(label);
    colesterolTotal.push(r.ct);
    ldl.push(r.ldl);
    hdl.push(r.hdl);
    trigliceridos.push(r.tg);
  }

  const countNonNull = (arr: (number | null)[]) => arr.filter((x) => x != null).length;
  const sufficientData =
    countNonNull(colesterolTotal) >= 2 ||
    countNonNull(ldl) >= 2 ||
    countNonNull(hdl) >= 2 ||
    countNonNull(trigliceridos) >= 2;

  return { sufficientData, labels, colesterolTotal, ldl, hdl, trigliceridos };
}

function numerosValidos(arr: (number | null)[]): number[] {
  return arr.filter((x): x is number => x != null && Number.isFinite(x));
}

/** Eje único mg/dL: rango de todas las series con margen. */
export function boundsEjePerfilLipidicoMgDl(
  colesterolTotal: (number | null)[],
  ldl: (number | null)[],
  hdl: (number | null)[],
  trigliceridos: (number | null)[],
): { min: number; max: number } {
  const nums = [
    ...numerosValidos(colesterolTotal),
    ...numerosValidos(ldl),
    ...numerosValidos(hdl),
    ...numerosValidos(trigliceridos),
  ];
  if (!nums.length) return { min: 40, max: 280 };
  let min = Math.min(...nums);
  let max = Math.max(...nums);
  const span = max - min || 20;
  return {
    min: Math.floor(min - span * 0.06),
    max: Math.ceil(max + span * 0.06),
  };
}
