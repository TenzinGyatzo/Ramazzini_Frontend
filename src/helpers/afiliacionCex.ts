/**
 * Reglas CEX de derechohabiencia/afiliación (GIIS-B015).
 * Exclusividad por etiqueta semántica (no por CATALOG_KEY).
 */

export const AFILIACION_ETIQUETAS_EXCLUSIVAS = [
  'NO ESPECIFICADO',
  'NINGUNA',
  'SE IGNORA',
] as const;

export const AFILIACION_MAX = 9;

export type AfiliacionOption = {
  value: string;
  label: string;
  exclusive?: boolean;
  legacy?: boolean;
  vigente?: boolean;
};

const EXCLUSIVAS_SET = new Set<string>(AFILIACION_ETIQUETAS_EXCLUSIVAS);

/** Normaliza etiqueta para comparación (mayúsculas, sin diacríticos, espacios colapsados). */
export function normalizarEtiquetaAfiliacion(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function esExclusivoPorEtiqueta(description: string | null | undefined): boolean {
  return EXCLUSIVAS_SET.has(normalizarEtiquetaAfiliacion(description));
}

/**
 * Aplica el cambio de checkbox de derechohabiencia.
 * - Exclusiva marcada → solo ese valor.
 * - No exclusiva → quita exclusivas de la selección y limita a AFILIACION_MAX.
 */
export function aplicarCambioDerechohabiencia(params: {
  selected: string[];
  clickedCode: string;
  optionsByCode: Map<string, { label: string; exclusive?: boolean }>;
}): string[] {
  const { selected, clickedCode, optionsByCode } = params;
  const clicked = optionsByCode.get(clickedCode);
  const isExclusive =
    clicked?.exclusive === true || esExclusivoPorEtiqueta(clicked?.label);

  if (isExclusive) {
    if (selected.includes(clickedCode)) {
      return [clickedCode];
    }
    return selected;
  }

  let next = selected.filter((code) => {
    const opt = optionsByCode.get(code);
    return !(opt?.exclusive === true || esExclusivoPorEtiqueta(opt?.label));
  });

  if (next.length > AFILIACION_MAX) {
    next = next.slice(0, AFILIACION_MAX);
  }
  return next;
}

export function formatDerechohabienciaLabels(
  valor: string | null | undefined,
  labelByCode: Record<string, string>,
): string {
  if (!valor) return '';
  return valor
    .split('&')
    .filter(Boolean)
    .map((code) => labelByCode[code] || code)
    .join(', ');
}
