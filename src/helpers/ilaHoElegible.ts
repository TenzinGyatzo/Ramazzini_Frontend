export type HistoriaOtologicaElegibleLike = {
  _id?: unknown;
  fechaHistoriaOtologica?: string | Date;
  estado?: unknown;
  trabajoAmbientesRuidosos?: string;
  tiempoExposicionLaboral?: string;
  usoProteccionAuditiva?: string;
};

export type EstadoOrigenHoIla = 'finalizado' | 'borrador';

export type ResultadoHoElegibleIla =
  | {
      tipo: 'seleccionada';
      historia: HistoriaOtologicaElegibleLike;
      estadoOrigen: EstadoOrigenHoIla;
      fecha: string;
    }
  | {
      tipo: 'empate';
      fecha: string;
      estadoOrigen: EstadoOrigenHoIla;
      cantidad: number;
    }
  | { tipo: 'ninguna' };

export function claveFechaClinicaIla(v?: string | Date | null): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  const d = v instanceof Date ? v : new Date(v as string);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function idHistoriaOtologicaIla(h: { _id?: unknown } | null | undefined): string {
  if (h?._id == null || h._id === '') return '';
  if (typeof h._id === 'object' && h._id !== null && '_id' in h._id) {
    return String((h._id as { _id?: unknown })._id ?? '');
  }
  return String(h._id);
}

function normalizarEstadoHo(estado: unknown): 'anulado' | EstadoOrigenHoIla {
  const s = String(estado || '').toLowerCase();
  if (s === 'anulado') return 'anulado';
  if (s === 'finalizado') return 'finalizado';
  return 'borrador';
}

function elegirPorFechaMax(
  items: HistoriaOtologicaElegibleLike[],
  estadoOrigen: EstadoOrigenHoIla,
): ResultadoHoElegibleIla {
  let max = '';
  for (const it of items) {
    const f = claveFechaClinicaIla(it.fechaHistoriaOtologica);
    if (f && f > max) max = f;
  }
  if (!max) return { tipo: 'ninguna' };
  const enMax = items.filter((it) => claveFechaClinicaIla(it.fechaHistoriaOtologica) === max);
  if (enMax.length === 1) {
    return {
      tipo: 'seleccionada',
      historia: enMax[0],
      estadoOrigen,
      fecha: max,
    };
  }
  return { tipo: 'empate', fecha: max, estadoOrigen, cantidad: enMax.length };
}

export function resolverHistoriaOtologicaElegibleIla(
  historias: HistoriaOtologicaElegibleLike[] | null | undefined,
  fechaInforme?: string | Date | null,
): ResultadoHoElegibleIla {
  const tope = claveFechaClinicaIla(fechaInforme);
  const candidatos: HistoriaOtologicaElegibleLike[] = [];
  for (const h of historias || []) {
    if (!h) continue;
    const fecha = claveFechaClinicaIla(h.fechaHistoriaOtologica);
    if (!fecha) continue;
    if (tope && fecha > tope) continue;
    if (normalizarEstadoHo(h.estado) === 'anulado') continue;
    candidatos.push(h);
  }

  const finalizadas = candidatos.filter((h) => normalizarEstadoHo(h.estado) === 'finalizado');
  if (finalizadas.length) return elegirPorFechaMax(finalizadas, 'finalizado');

  const borradores = candidatos.filter((h) => normalizarEstadoHo(h.estado) === 'borrador');
  if (borradores.length) return elegirPorFechaMax(borradores, 'borrador');

  return { tipo: 'ninguna' };
}
