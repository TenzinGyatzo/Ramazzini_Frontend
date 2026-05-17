import { formatDateDDMMYYYY } from '@/helpers/dates';

/** Paridad: misma lógica que `backend/src/modules/informes/utils/timeline-seguimiento-informe-longitudinal.ts` (PDF). */

export type TimelineSeguimientoTipo =
  | 'control_realizado'
  | 'no_asistio'
  | 'cancelada'
  | 'reprogramada';

export type TimelineSeguimientoItem = {
  tipo: TimelineSeguimientoTipo;
  /** Timestamp UTC ms para ordenar */
  fechaOrden: number;
  /** Texto corto para UI (etiqueta del hito) */
  etiqueta: string;
  /** Fecha mostrada dd-mm-aaaa */
  fechaTexto: string;
  /** Detalle opcional (p. ej. nueva fecha de reprogramación) */
  detalle?: string;
};

export type EventoConcentradoTimelineLike = {
  fechaControl?: Date | string;
};

export type SeguimientoConcentradoTimelineLike = {
  fechaProgramada?: Date | string;
  fechaReprogramada?: Date | string;
  esResultadoDeReprogramacion?: boolean;
  estado?: string;
};

const ESTADO_REALIZADA = 'Realizada';
const ESTADO_NO_ASISTIO = 'No asistió';
const ESTADO_CANCELADA = 'Cancelada';

function parseFechaMs(d: Date | string | undefined | null): number {
  if (d == null || d === '') return NaN;
  const t = d instanceof Date ? d.getTime() : new Date(d as string).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Reprogramación: el enum no tiene `REPROGRAMADA`.
 * 1) `esResultadoDeReprogramacion === true`
 * 2) O `fechaReprogramada` definida y `estado` no es Cancelada/Realizada (Realizada ya se filtra antes).
 */
function esSeguimientoReprogramacion(row: SeguimientoConcentradoTimelineLike): boolean {
  if (row.esResultadoDeReprogramacion === true) return true;
  if (row.fechaReprogramada == null || row.fechaReprogramada === '') return false;
  const e = row.estado?.trim();
  if (e === ESTADO_CANCELADA || e === ESTADO_REALIZADA) return false;
  return true;
}

export function buildTimelineSeguimientoItems(
  eventosConcentrados: EventoConcentradoTimelineLike[] | undefined | null,
  seguimientosProgramadosConcentrados: SeguimientoConcentradoTimelineLike[] | undefined | null,
): TimelineSeguimientoItem[] {
  const items: TimelineSeguimientoItem[] = [];

  for (const ev of eventosConcentrados || []) {
    const ms = parseFechaMs(ev?.fechaControl);
    if (!Number.isFinite(ms)) continue;
    const fechaTexto = formatDateDDMMYYYY(ev.fechaControl) || '—';
    items.push({
      tipo: 'control_realizado',
      fechaOrden: ms,
      etiqueta: 'Control realizado',
      fechaTexto,
    });
  }

  for (const row of seguimientosProgramadosConcentrados || []) {
    const estado = row.estado?.trim();
    if (estado === ESTADO_REALIZADA) continue;

    const msProg = parseFechaMs(row.fechaProgramada);
    if (!Number.isFinite(msProg)) continue;

    if (estado === ESTADO_NO_ASISTIO) {
      items.push({
        tipo: 'no_asistio',
        fechaOrden: msProg,
        etiqueta: 'No asistió',
        fechaTexto: formatDateDDMMYYYY(row.fechaProgramada) || '—',
      });
      continue;
    }
    if (estado === ESTADO_CANCELADA) {
      items.push({
        tipo: 'cancelada',
        fechaOrden: msProg,
        etiqueta: 'Cancelada',
        fechaTexto: formatDateDDMMYYYY(row.fechaProgramada) || '—',
      });
      continue;
    }
    if (esSeguimientoReprogramacion(row)) {
      const fr = row.fechaReprogramada != null ? formatDateDDMMYYYY(row.fechaReprogramada) : '';
      items.push({
        tipo: 'reprogramada',
        fechaOrden: msProg,
        etiqueta: 'Reprogramada',
        fechaTexto: formatDateDDMMYYYY(row.fechaProgramada) || '—',
        detalle: fr ? `Nueva fecha: ${fr}` : undefined,
      });
      continue;
    }
    // `Programada` u otros sin señal de reprogramación: omitir (v1)
  }

  items.sort((a, b) => {
    if (a.fechaOrden !== b.fechaOrden) return a.fechaOrden - b.fechaOrden;
    const orderTipo = (t: TimelineSeguimientoTipo) =>
      t === 'control_realizado' ? 0 : t === 'reprogramada' ? 1 : t === 'no_asistio' ? 2 : 3;
    return orderTipo(a.tipo) - orderTipo(b.tipo);
  });

  return items;
}

export function timelineSeguimientoTieneItems(items: TimelineSeguimientoItem[]): boolean {
  return items.length > 0;
}

export const MSJ_TIMELINE_SEGUIMIENTO_VACIA =
  'No hay hitos de seguimiento registrados en el periodo para mostrar en la línea de tiempo.';
