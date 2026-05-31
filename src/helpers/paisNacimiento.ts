/** CATALOG_KEY cat_pais: México */
export const PAIS_NACIMIENTO_MEXICO_CODE = '142';

/** CATALOG_KEY cat_pais: NO ESPECIFICADO */
export const PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE = '248';

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL = 'NO ESPECIFICADO';

export interface PaisCatalogEntry {
  code: string | number;
  description?: string;
  [key: string]: unknown;
}

/**
 * Orden del selector: México (142), NO ESPECIFICADO (248), resto por CATALOG_KEY numérico.
 */
export function sortPaisesForSelector(
  items: PaisCatalogEntry[],
  options?: { excludeNoEspecificado?: boolean },
): PaisCatalogEntry[] {
  const excludeNoEspecificado = options?.excludeNoEspecificado ?? false;
  const byCode = new Map<string, PaisCatalogEntry>();

  for (const item of items) {
    const code = String(item.code);
    if (!byCode.has(code)) {
      byCode.set(code, item);
    }
  }

  if (!excludeNoEspecificado && !byCode.has(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE)) {
    byCode.set(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE, {
      code: PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
      description: PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL,
    });
  }

  const mexico = byCode.get(PAIS_NACIMIENTO_MEXICO_CODE);
  const noEspecificado = excludeNoEspecificado
    ? undefined
    : byCode.get(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE);

  byCode.delete(PAIS_NACIMIENTO_MEXICO_CODE);
  byCode.delete(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE);

  const rest = Array.from(byCode.values()).sort(
    (a, b) => Number(a.code) - Number(b.code),
  );

  const ordered: PaisCatalogEntry[] = [];
  if (mexico) ordered.push(mexico);
  if (noEspecificado) ordered.push(noEspecificado);
  return [...ordered, ...rest];
}

export function isPaisNacimientoNoEspecificado(
  value: string | number | null | undefined,
): boolean {
  if (value == null || value === '') return false;
  return String(value) === PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE;
}

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_FIRMANTE_MESSAGE =
  'No está permitido registrar NO ESPECIFICADO como país de nacimiento para firmantes';
