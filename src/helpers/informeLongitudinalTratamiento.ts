/**
 * Formateo de tratamiento para Informe longitudinal cardiometabólico (evidencia de soporte).
 */
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import {
  filaTratamientoTieneContenido,
  normalizarFilaTratamiento,
  sanitizarTratamientoActualArray,
  type TratamientoActualFilaEsc,
} from '@/helpers/cardiometabolico/tratamientoActualFacilidades';
import { formatDateYYYYMMDD } from '@/helpers/dates';
import { mongoIdStr } from '@/helpers/mongoId';

const MAX_FILAS_MEDICAMENTO_ILC = 12;

/** Tarjetas por fila en visualizador y PDF cuando hay más de una. */
export const DIAS_POR_FILA_TRATAMIENTO_ILC = 2;

/** Huella de régimen sin medicación documentada (agrupa visitas consecutivas sin tratamiento). */
export const FINGERPRINT_SIN_TRATAMIENTO_ILC = '';

export const TEXTO_SEGMENTO_SIN_TRATAMIENTO_ILC =
  'Sin tratamiento farmacológico registrado en este periodo.';

export interface BloqueTratamientoPorFechaIlc {
  fechaLabel: string;
  lineasMedicamento: string[];
  truncadoMedicamentos: boolean;
}

/** Tarjeta de tratamiento (segmento agrupado o fecha única). */
export interface CeldaTratamientoDiaIlc {
  fechaLabel: string;
  fechaInicio: string;
  fechaFin: string;
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
}

interface SegmentoTratamientoInterno {
  fechaInicio: string;
  fechaFin: string;
  fingerprint: string;
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
}

function parseFechaComparable(f?: string): number {
  if (!f || typeof f !== 'string') return NaN;
  const t = Date.parse(f.includes('T') ? f : `${f}T12:00:00.000Z`);
  return Number.isNaN(t) ? NaN : t;
}

export function eventosConcentradosCronologicos(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): EventoConcentradoCardiometabolicoEsc[] {
  const lista = Array.isArray(eventos) ? eventos : [];
  return [...lista]
    .filter((e) => Number.isFinite(parseFechaComparable(e.fechaControl)))
    .sort((a, b) => parseFechaComparable(a.fechaControl!) - parseFechaComparable(b.fechaControl!));
}

/** dd-MM-yyyy para listados compactos en ILC. */
export function formatearFechaControlIlc(fechaControl?: string): string {
  const raw = String(fechaControl ?? '').trim();
  if (!raw) return '—';
  const iso = raw.includes('T') ? raw.slice(0, 10) : raw;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return raw;
}

export function formatearLineaMedicamentoConcentrado(fila: TratamientoActualFilaEsc): string {
  const med = String(fila.medicamento ?? '').trim();
  const dosis = String(fila.dosis ?? '').trim();
  const freq = String(fila.frecuencia ?? '').trim();
  const motivo = String(fila.motivoUso ?? '').trim();
  const partes = [med, dosis, freq].filter(Boolean);
  const cuerpo = partes.join(' ');
  if (!cuerpo && !motivo) return '';
  return motivo ? `${cuerpo} — ${motivo}` : cuerpo;
}

export function eventoConcentradoTieneTratamiento(ev: EventoConcentradoCardiometabolicoEsc): boolean {
  return (ev.tratamientoActual ?? []).some(filaTratamientoTieneContenido);
}

/** Huella estable del régimen (medicamentos normalizados, ordenados). */
export function fingerprintRegimenTratamiento(ev: EventoConcentradoCardiometabolicoEsc): string {
  const filas = (ev.tratamientoActual ?? [])
    .map(normalizarFilaTratamiento)
    .filter(filaTratamientoTieneContenido);
  const lineas = filas
    .map(formatearLineaMedicamentoConcentrado)
    .filter((l) => l.trim())
    .sort();
  return lineas.join('|');
}

export function esFingerprintSinTratamiento(fingerprint: string): boolean {
  return fingerprint === FINGERPRINT_SIN_TRATAMIENTO_ILC;
}

/** Resumen de tratamiento farmacológico en eventos concentrados del periodo. */
export interface ResumenRegimenTratamientoPeriodo {
  controlesTotales: number;
  controlesConTratamiento: number;
  fingerprintsDistintos: number;
}

export function resumenRegimenTratamientoEnPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): ResumenRegimenTratamientoPeriodo {
  const cron = eventosConcentradosCronologicos(eventos);
  const fingerprints = new Set<string>();
  let controlesConTratamiento = 0;

  for (const ev of cron) {
    const fp = fingerprintRegimenTratamiento(ev);
    fingerprints.add(fp);
    if (eventoConcentradoTieneTratamiento(ev)) controlesConTratamiento += 1;
  }

  return {
    controlesTotales: cron.length,
    controlesConTratamiento,
    fingerprintsDistintos: fingerprints.size,
  };
}

/** True si en el periodo hay al menos dos regímenes distintos (por fingerprint). */
export function hayVariosRegimenesTratamientoEnPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): boolean {
  return resumenRegimenTratamientoEnPeriodo(eventos).fingerprintsDistintos >= 2;
}

/** Mismo fingerprint en todos los controles que documentan tratamiento. */
export function hayRegimenTerapeuticoEstableEnPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): boolean {
  const r = resumenRegimenTratamientoEnPeriodo(eventos);
  return r.controlesConTratamiento > 0 && r.fingerprintsDistintos === 1;
}

export function labelPeriodoTratamiento(fechaInicio: string, fechaFin: string): string {
  const a = formatearFechaControlIlc(fechaInicio);
  const b = formatearFechaControlIlc(fechaFin);
  return a === b ? a : `${a} – ${b}`;
}

function medicamentosVisiblesDesdeEvento(ev: EventoConcentradoCardiometabolicoEsc): {
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
} {
  const filas = (ev.tratamientoActual ?? []).filter(filaTratamientoTieneContenido);
  const lineas = filas.map(formatearLineaMedicamentoConcentrado).filter((l) => l.trim());
  const truncadoLista = lineas.length > MAX_FILAS_MEDICAMENTO_ILC;
  const visibles = truncadoLista ? lineas.slice(0, MAX_FILAS_MEDICAMENTO_ILC) : lineas;
  return {
    medicamentos: visibles,
    medicamentosOmitidos: Math.max(0, lineas.length - visibles.length),
    truncadoLista,
  };
}

/** Contenido de tarjeta por visita; sin medicación → línea explícita (mismo fingerprint vacío). */
function contenidoMedicamentosSegmento(ev: EventoConcentradoCardiometabolicoEsc): {
  medicamentos: string[];
  medicamentosOmitidos: number;
  truncadoLista: boolean;
} {
  if (!eventoConcentradoTieneTratamiento(ev)) {
    return {
      medicamentos: [TEXTO_SEGMENTO_SIN_TRATAMIENTO_ILC],
      medicamentosOmitidos: 0,
      truncadoLista: false,
    };
  }
  return medicamentosVisiblesDesdeEvento(ev);
}

function segmentoInternoACelda(seg: SegmentoTratamientoInterno): CeldaTratamientoDiaIlc {
  return {
    fechaInicio: seg.fechaInicio,
    fechaFin: seg.fechaFin,
    fechaLabel: labelPeriodoTratamiento(seg.fechaInicio, seg.fechaFin),
    medicamentos: seg.medicamentos,
    medicamentosOmitidos: seg.medicamentosOmitidos,
    truncadoLista: seg.truncadoLista,
  };
}

/**
 * Agrupa **todos** los ESC del periodo por fingerprint de régimen (incluye sin medicación).
 * Nueva tarjeta si cambia el régimen o si deja de haber medicación documentada.
 */
export function buildSegmentosTratamientoPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): CeldaTratamientoDiaIlc[] {
  const cron = eventosConcentradosCronologicos(eventos);
  const segmentos: SegmentoTratamientoInterno[] = [];

  for (const ev of cron) {
    const fecha = String(ev.fechaControl ?? '').trim();
    if (!fecha) continue;

    const fp = fingerprintRegimenTratamiento(ev);
    const meds = contenidoMedicamentosSegmento(ev);
    const ultimo = segmentos[segmentos.length - 1];

    if (ultimo && ultimo.fingerprint === fp) {
      ultimo.fechaFin = fecha;
      continue;
    }

    segmentos.push({
      fechaInicio: fecha,
      fechaFin: fecha,
      fingerprint: fp,
      medicamentos: meds.medicamentos,
      medicamentosOmitidos: meds.medicamentosOmitidos,
      truncadoLista: meds.truncadoLista,
    });
  }

  return segmentos.map(segmentoInternoACelda);
}

/** Bloque de tratamiento visible si hay al menos un control fechado en el periodo. */
export function hayEvidenciaTratamientoPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): boolean {
  return eventosConcentradosCronologicos(eventos).some((ev) =>
    Boolean(String(ev.fechaControl ?? '').trim()),
  );
}

export function hayDatosConcentradoTabular(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): boolean {
  return eventosConcentradosCronologicos(eventos).length > 0;
}

/** Muestra el contenedor «Evidencia clínica de soporte» si hay contexto, tratamiento o tablas concentrado. */
export function hayEvidenciaClinicaSoporteVisible(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
  contextoTerapeutico: string[] | undefined,
): boolean {
  if ((contextoTerapeutico ?? []).some((s) => String(s).trim())) return true;
  if (hayEvidenciaTratamientoPeriodo(eventos)) return true;
  return hayDatosConcentradoTabular(eventos);
}

export function agruparCeldasTratamientoEnFilas(
  celdas: CeldaTratamientoDiaIlc[],
  porFila: number = DIAS_POR_FILA_TRATAMIENTO_ILC,
): CeldaTratamientoDiaIlc[][] {
  const n = Math.max(1, porFila);
  const filas: CeldaTratamientoDiaIlc[][] = [];
  for (let i = 0; i < celdas.length; i += n) {
    filas.push(celdas.slice(i, i + n));
  }
  return filas;
}

export function buildCeldasTratamientoPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): CeldaTratamientoDiaIlc[] {
  return buildSegmentosTratamientoPeriodo(eventos);
}

export function buildBloquesTratamientoPeriodo(
  eventos: EventoConcentradoCardiometabolicoEsc[] | undefined,
): BloqueTratamientoPorFechaIlc[] {
  return buildSegmentosTratamientoPeriodo(eventos).map((celda) => ({
    fechaLabel: celda.fechaLabel,
    lineasMedicamento: celda.medicamentos,
    truncadoMedicamentos: celda.truncadoLista,
  }));
}

function toYyyyMmDdIlc(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim();
  const s = formatDateYYYYMMDD(v as string | Date);
  return s || null;
}

/** Evento ESC en expediente (fuente viva para re-snapshot del concentrado). */
export type EventoEscFuenteIlc = {
  _id?: unknown;
  idTrabajador?: unknown;
  fechaEventoSeguimientoCardiometabolico?: string | Date;
  diagnosticosActivos?: string[];
  signosVitales?: EventoConcentradoCardiometabolicoEsc['signosVitales'];
  somatometria?: EventoConcentradoCardiometabolicoEsc['somatometria'];
  laboratorio?: EventoConcentradoCardiometabolicoEsc['laboratorio'];
  estadoCondiciones?: EventoConcentradoCardiometabolicoEsc['estadoCondiciones'];
  tratamientoActual?: TratamientoActualFilaEsc[];
};

export function idsArrayFromMongoRefs(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(mongoIdStr).filter(Boolean))];
}

/** Snapshot de un ESC para `eventosConcentrados` del ILC (datos actuales del expediente). */
export function snapshotEventoConcentradoIlc(ev: EventoEscFuenteIlc): EventoConcentradoCardiometabolicoEsc {
  const tratamiento = sanitizarTratamientoActualArray(ev.tratamientoActual);
  const dx = Array.isArray(ev.diagnosticosActivos)
    ? [...new Set(ev.diagnosticosActivos.map((c) => String(c).trim()).filter(Boolean))]
    : undefined;
  return {
    idEventoOriginal: mongoIdStr(ev._id) || undefined,
    fechaControl: toYyyyMmDdIlc(ev.fechaEventoSeguimientoCardiometabolico) || undefined,
    diagnosticosActivos: dx?.length ? dx : undefined,
    signosVitales: ev.signosVitales,
    somatometria: ev.somatometria,
    laboratorio: ev.laboratorio,
    estadoCondiciones: ev.estadoCondiciones,
    tratamientoActual: tratamiento,
  };
}

export function eventosCmDesdeDocumentsByYear(
  documentsByYear: Record<string, Record<string, unknown>> | null | undefined,
  trabajadorId?: string | null,
): EventoEscFuenteIlc[] {
  const out: EventoEscFuenteIlc[] = [];
  const byYear = documentsByYear || {};
  const tid = trabajadorId ? mongoIdStr(trabajadorId) : '';
  for (const yearData of Object.values(byYear)) {
    const arr = yearData?.eventoSeguimientoCardiometabolico;
    if (!Array.isArray(arr)) continue;
    for (const e of arr) {
      if (!e || typeof e !== 'object') continue;
      const ev = e as EventoEscFuenteIlc;
      if (tid && ev.idTrabajador && mongoIdStr(ev.idTrabajador) !== tid) continue;
      out.push(ev);
    }
  }
  return out;
}

/**
 * Reemplaza `eventosConcentrados` con datos vivos del expediente (tratamiento actual).
 * Evita mostrar snapshots obsoletos guardados en el ILC.
 */
export function refrescarEventosConcentradosEnInforme(
  form: {
    eventosIncluidos?: unknown;
    eventosConcentrados?: EventoConcentradoCardiometabolicoEsc[];
  },
  eventosExpediente: EventoEscFuenteIlc[],
): boolean {
  const ids = new Set(idsArrayFromMongoRefs(form.eventosIncluidos));
  if (!ids.size) return false;
  const sel = eventosExpediente.filter((e) => ids.has(mongoIdStr(e._id)));
  if (!sel.length) return false;
  form.eventosConcentrados = sel.map(snapshotEventoConcentradoIlc);
  return true;
}
