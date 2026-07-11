import DocumentosAPI from '@/api/DocumentosAPI';
import { convertirFechaISOaDDMMYYYY } from '@/helpers/dates';
import { escapeHtml } from '@/helpers/escapeHtml';
import { formatNombreCompleto } from '@/helpers/formatNombreCompleto';
import {
  formatCountLabel,
  lineasDocumentosExpediente,
  lineasOtrosVinculados,
  lineasResultadosClinicos,
} from '@/helpers/fusionPreviewDisplay';

export interface ExpedienteConteosResponse {
  conteos: Record<string, number>;
  total: number;
  resultadosClinicosConteos: Record<string, number>;
  totalResultadosClinicos: number;
  vinculadosConteos: Record<string, number>;
  totalVinculados: number;
  fechaUltimaActividad: string | null;
}

export interface ExpedienteSummaryOptions {
  nombreTrabajador?: string;
}

export const EXPEDIENTE_CONTEOS_CACHE_TTL_MS = 3 * 60 * 1000;
/** Hover sostenido antes de iniciar prefetch (evita fetch al atravesar botones). */
export const EXPEDIENTE_PREFETCH_MS = 100;
/** Hover mínimo antes de revelar tooltip (caché o respuesta temprana). */
export const EXPEDIENTE_DISPLAY_CACHED_MS = 350;
/** Máximo de espera antes de mostrar tooltip sin datos (prefetch arranca antes). */
export const EXPEDIENTE_DISPLAY_UNCACHED_MS = 500;

const cache = new Map<string, { data: ExpedienteConteosResponse; fetchedAt: number }>();
const pendingRequests = new Map<string, Promise<ExpedienteConteosResponse>>();

export function formatNombreTrabajador(row: Record<string, unknown>): string {
  return formatNombreCompleto(row);
}

export function getExpedienteResumenBadgeTotal(data: ExpedienteConteosResponse): number {
  return data.total;
}

function renderLine(icon: string, iconClass: string, text: string): string {
  return `
    <div class="expediente-resumen-line">
      <i class="${escapeHtml(icon)} ${escapeHtml(iconClass)}"></i>
      <span>${text}</span>
    </div>
  `;
}

function buildTitle(nombreTrabajador?: string): string {
  const nombre = nombreTrabajador?.trim();
  if (!nombre) return 'Expediente';
  return `Expediente — ${escapeHtml(nombre)}`;
}

function buildUltimaActividadLine(fechaUltimaActividad: string | null | undefined): string {
  if (!fechaUltimaActividad) return '';
  try {
    const fecha = convertirFechaISOaDDMMYYYY(fechaUltimaActividad);
    return `<p class="expediente-resumen-ultima-actividad">Última actividad: ${escapeHtml(fecha)}</p>`;
  } catch {
    return '';
  }
}

function buildResultadosClinicosLines(
  resultadosClinicosConteos: Record<string, number>,
): string {
  return lineasResultadosClinicos(resultadosClinicosConteos)
    .map((item) =>
      renderLine(
        item.icon,
        item.iconClass,
        escapeHtml(formatCountLabel(item.count, item.labelSingular, item.labelPlural)),
      ),
    )
    .join('');
}

function buildVinculadosLines(vinculadosConteos: Record<string, number>): string {
  return lineasOtrosVinculados(vinculadosConteos)
    .map((item) =>
      renderLine(
        item.icon,
        item.iconClass,
        escapeHtml(formatCountLabel(item.count, item.labelSingular, item.labelPlural)),
      ),
    )
    .join('');
}

export function buildLoadingExpedienteSummaryHtml(): string {
  return `
    <div class="expediente-resumen-loading-state">
      <i class="fas fa-spinner fa-spin text-emerald-600"></i>
      <span>Cargando...</span>
    </div>
  `;
}

export function buildFailedExpedienteSummaryHtml(
  options: ExpedienteSummaryOptions = {},
): string {
  return `
    <p class="expediente-resumen-title">${buildTitle(options.nombreTrabajador)}</p>
    <p class="expediente-resumen-error">No se pudo cargar el resumen</p>
  `;
}

export function buildExactExpedienteSummaryHtml(
  data: ExpedienteConteosResponse,
  options: ExpedienteSummaryOptions = {},
): string {
  const {
    conteos,
    total,
    resultadosClinicosConteos = {},
    totalResultadosClinicos = 0,
    vinculadosConteos = {},
    totalVinculados = 0,
    fechaUltimaActividad = null,
  } = data;

  const lineasDocumentos = lineasDocumentosExpediente(conteos);
  const lineasRc = buildResultadosClinicosLines(resultadosClinicosConteos);
  const lineasVinculados = buildVinculadosLines(vinculadosConteos);

  const isEmpty =
    lineasDocumentos.length === 0 &&
    totalResultadosClinicos === 0 &&
    totalVinculados === 0;

  if (isEmpty) {
    return `
      <p class="expediente-resumen-title">${buildTitle(options.nombreTrabajador)}</p>
      <p class="expediente-resumen-empty">Sin documentos ni resultados clínicos registrados</p>
    `;
  }

  const documentosHtml = lineasDocumentos.length
    ? `
      <p class="expediente-resumen-subtitle">Documentos (${total})</p>
      <div class="expediente-resumen-grid">
        ${lineasDocumentos
          .map((item) =>
            renderLine(
              item.icon,
              item.iconClass,
              escapeHtml(formatCountLabel(item.count, item.labelSingular, item.labelPlural)),
            ),
          )
          .join('')}
      </div>
    `
    : '';

  const rcHtml = totalResultadosClinicos > 0
    ? `
      <p class="expediente-resumen-subtitle mt-2">Resultados clínicos (${totalResultadosClinicos})</p>
      <div class="expediente-resumen-grid">${lineasRc}</div>
    `
    : '';

  const vinculadosHtml = totalVinculados > 0
    ? `
      <p class="expediente-resumen-subtitle mt-2">Otros registros vinculados (${totalVinculados})</p>
      <div class="expediente-resumen-grid">${lineasVinculados}</div>
    `
    : '';

  return `
    <p class="expediente-resumen-title">${buildTitle(options.nombreTrabajador)}</p>
    ${buildUltimaActividadLine(fechaUltimaActividad)}
    ${documentosHtml}
    ${rcHtml}
    ${vinculadosHtml}
  `;
}

export function peekExpedienteConteosCache(
  trabajadorId: string,
): ExpedienteConteosResponse | null {
  const cached = cache.get(trabajadorId);
  if (!cached) return null;
  if (Date.now() - cached.fetchedAt >= EXPEDIENTE_CONTEOS_CACHE_TTL_MS) {
    cache.delete(trabajadorId);
    return null;
  }
  return cached.data;
}

export function invalidateExpedienteConteosCache(trabajadorId: string): void {
  cache.delete(trabajadorId);
  pendingRequests.delete(trabajadorId);
}

function normalizeConteosResponse(
  raw: Partial<ExpedienteConteosResponse>,
): ExpedienteConteosResponse {
  return {
    conteos: raw.conteos ?? {},
    total: raw.total ?? 0,
    resultadosClinicosConteos: raw.resultadosClinicosConteos ?? {},
    totalResultadosClinicos: raw.totalResultadosClinicos ?? 0,
    vinculadosConteos: raw.vinculadosConteos ?? {},
    totalVinculados: raw.totalVinculados ?? 0,
    fechaUltimaActividad: raw.fechaUltimaActividad ?? null,
  };
}

export async function fetchExpedienteConteosCached(
  trabajadorId: string,
): Promise<ExpedienteConteosResponse> {
  const cached = peekExpedienteConteosCache(trabajadorId);
  if (cached) {
    return cached;
  }

  const pending = pendingRequests.get(trabajadorId);
  if (pending) {
    return pending;
  }

  const promise = DocumentosAPI.getDocumentosConteos(trabajadorId)
    .then((response) => {
      const data = normalizeConteosResponse(response.data as Partial<ExpedienteConteosResponse>);
      cache.set(trabajadorId, { data, fetchedAt: Date.now() });
      pendingRequests.delete(trabajadorId);
      return data;
    })
    .catch((error) => {
      pendingRequests.delete(trabajadorId);
      throw error;
    });

  pendingRequests.set(trabajadorId, promise);
  return promise;
}

export function clearExpedienteConteosCacheForTests(): void {
  cache.clear();
  pendingRequests.clear();
}
