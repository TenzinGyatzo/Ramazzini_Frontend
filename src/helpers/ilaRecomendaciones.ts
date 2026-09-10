import { CONFIRMACION_HALLAZGOS_ILA } from '@/helpers/ilaConclusionDecisiones';
import { fichaMarcaRuidoActual } from '@/helpers/ilaConclusionContexto';

export const MAX_RECOMENDACIONES_ILA = 5;
export const MAX_CHARS_RECOMENDACION_ILA = 4000;

export const RECOMENDACION_ILA_VIGILANCIA =
  'Mantener vigilancia audiométrica periódica.';
export const RECOMENDACION_ILA_PCA =
  'Incorporar o mantener al trabajador en el Programa de Conservación de la Audición.';
export const RECOMENDACION_ILA_EPP =
  'Verificar la selección, ajuste y uso correcto del equipo de protección auditiva.';
export const RECOMENDACION_ILA_REPETIR =
  'Repetir la audiometría para confirmar los hallazgos observados.';
export const RECOMENDACION_ILA_COMPLEMENTARIOS =
  'Realizar valoración audiológica complementaria.';

export type RecomendacionesIlaRaw = string | string[] | null | undefined;

export type ContextoSugerenciasRecomendacionesIla = {
  ruidoEnPuestoActual?: boolean;
  confirmacion?: string | null;
};

export function claveRecomendacionIla(texto: string): string {
  return String(texto || '').trim().toLowerCase();
}

export function exposicionRuidoPuestoActualIla(opts: {
  ruidoEnAgentesRiesgoActuales?: boolean | null;
  agentesRiesgoActuales?: string[] | null;
}): boolean {
  if (opts.ruidoEnAgentesRiesgoActuales === true) return true;
  return fichaMarcaRuidoActual(opts.agentesRiesgoActuales);
}

export function construirSugerenciasRecomendacionesIla(
  opts: ContextoSugerenciasRecomendacionesIla = {},
): string[] {
  const out: string[] = [RECOMENDACION_ILA_VIGILANCIA];
  if (opts.ruidoEnPuestoActual === true) {
    out.push(RECOMENDACION_ILA_PCA, RECOMENDACION_ILA_EPP);
  }
  if (opts.confirmacion === CONFIRMACION_HALLAZGOS_ILA.REQUIERE_REPETICION) {
    out.push(RECOMENDACION_ILA_REPETIR);
  } else if (
    opts.confirmacion === CONFIRMACION_HALLAZGOS_ILA.REQUIERE_COMPLEMENTARIOS
  ) {
    out.push(RECOMENDACION_ILA_COMPLEMENTARIOS);
  }
  return out;
}

export function recomendacionesIlaEstanInicializadas(
  raw: RecomendacionesIlaRaw,
  flag?: boolean | null,
): boolean {
  if (flag === true) return true;
  if (raw === undefined || raw === null) return false;
  if (typeof raw === 'string') return true;
  if (Array.isArray(raw)) return true;
  return false;
}

export function leerRecomendacionesIla(raw: RecomendacionesIlaRaw): string[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw === 'string') return raw.length ? [raw] : [];
  if (Array.isArray(raw)) return raw.map((item) => String(item ?? ''));
  return [];
}

export function normalizarRecomendacionesIla(raw: RecomendacionesIlaRaw): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of leerRecomendacionesIla(raw)) {
    const trimmed = String(item).trim();
    if (!trimmed) continue;
    const clave = claveRecomendacionIla(trimmed);
    if (seen.has(clave)) continue;
    seen.add(clave);
    out.push(trimmed);
  }
  return out;
}

export function recomendacionesIlaSonValidas(raw: unknown): boolean {
  if (raw === undefined || raw === null) return true;
  if (typeof raw === 'string') return raw.length <= MAX_CHARS_RECOMENDACION_ILA;
  if (!Array.isArray(raw)) return false;
  if (raw.length > MAX_RECOMENDACIONES_ILA) return false;
  if (!raw.every((item) => typeof item === 'string')) return false;
  if (raw.some((item) => item.length > MAX_CHARS_RECOMENDACION_ILA)) return false;
  return normalizarRecomendacionesIla(raw).length <= MAX_RECOMENDACIONES_ILA;
}

export function listasRecomendacionesIlaEquivalentes(
  a: RecomendacionesIlaRaw,
  b: RecomendacionesIlaRaw,
): boolean {
  const na = normalizarRecomendacionesIla(a);
  const nb = normalizarRecomendacionesIla(b);
  if (na.length !== nb.length) return false;
  return na.every((item, i) => item === nb[i]);
}

export function aplicarSugerenciasSiNoInicializadas(
  raw: RecomendacionesIlaRaw,
  flag: boolean | null | undefined,
  sugeridas: string[],
): { items: string[]; inicializadas: boolean; aplico: boolean } {
  if (recomendacionesIlaEstanInicializadas(raw, flag)) {
    return {
      items: leerRecomendacionesIla(raw),
      inicializadas: true,
      aplico: false,
    };
  }
  return {
    items: [...sugeridas],
    inicializadas: true,
    aplico: true,
  };
}

export function etiquetaLetraRecomendacionIla(index: number): string {
  return String.fromCharCode(97 + index);
}

export function persistirRecomendacionesIlaEnPayload<T extends Record<string, unknown>>(
  dto: T,
): T {
  const raw = dto.recomendacionesSeguimientoAudiometrico as RecomendacionesIlaRaw;
  const flag = dto.recomendacionesIlaInicializadas as boolean | undefined;
  if (!recomendacionesIlaEstanInicializadas(raw, flag)) {
    return dto;
  }
  (dto as Record<string, unknown>).recomendacionesSeguimientoAudiometrico =
    normalizarRecomendacionesIla(raw);
  (dto as Record<string, unknown>).recomendacionesIlaInicializadas = true;
  return dto;
}
