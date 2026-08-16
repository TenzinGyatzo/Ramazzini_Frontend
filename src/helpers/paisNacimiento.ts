/** CATALOG_KEY cat_pais: México */
export const PAIS_NACIMIENTO_MEXICO_CODE = '142';

/** CATALOG_KEY cat_pais: NO ESPECIFICADO */
export const PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE = '248';

/** CATALOG_KEY cat_pais: SE IGNORA */
export const PAIS_NACIMIENTO_SE_IGNORA_CODE = '247';

/** CATALOG_KEY cat_pais: OTRO */
export const PAIS_NACIMIENTO_OTRO_CODE = '246';

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL = 'NO ESPECIFICADO';

export const PAIS_NACIMIENTO_SE_IGNORA_LABEL = 'SE IGNORA';

export interface PaisCatalogEntry {
  code: string | number;
  description?: string;
  [key: string]: unknown;
}

/**
 * Orden del selector por contexto:
 * - trabajador: 142, 246, 247, 248, resto por CATALOG_KEY numérico
 * - firmante: 142, 246, resto por CATALOG_KEY numérico
 */
export function sortPaisesForSelector(
  items: PaisCatalogEntry[],
  options?: {
    geoContext?: 'trabajador' | 'firmante';
    excludeNoEspecificado?: boolean;
    excludeSeIgnora?: boolean;
    excludeCodes?: string[];
    /**
     * When true (default), inject SE IGNORA / NO ESPECIFICADO if missing.
     * Set false during typed search so they only appear when they match the query.
     */
    injectMissingSentinels?: boolean;
  },
): PaisCatalogEntry[] {
  const geoContext = options?.geoContext ?? 'trabajador';
  const excludeNoEspecificado = options?.excludeNoEspecificado ?? false;
  const excludeSeIgnora = options?.excludeSeIgnora ?? false;
  const injectMissingSentinels = options?.injectMissingSentinels ?? true;
  const excludeCodes = new Set(options?.excludeCodes ?? []);
  const byCode = new Map<string, PaisCatalogEntry>();

  for (const item of items) {
    const code = String(item.code);
    if (!byCode.has(code)) {
      byCode.set(code, item);
    }
  }

  if (
    injectMissingSentinels &&
    geoContext === 'trabajador' &&
    !excludeNoEspecificado &&
    !excludeCodes.has(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE) &&
    !byCode.has(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE)
  ) {
    byCode.set(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE, {
      code: PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
      description: PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL,
    });
  }

  if (
    injectMissingSentinels &&
    geoContext === 'trabajador' &&
    !excludeSeIgnora &&
    !excludeCodes.has(PAIS_NACIMIENTO_SE_IGNORA_CODE) &&
    !byCode.has(PAIS_NACIMIENTO_SE_IGNORA_CODE)
  ) {
    byCode.set(PAIS_NACIMIENTO_SE_IGNORA_CODE, {
      code: PAIS_NACIMIENTO_SE_IGNORA_CODE,
      description: PAIS_NACIMIENTO_SE_IGNORA_LABEL,
    });
  }

  for (const code of excludeCodes) {
    byCode.delete(code);
  }

  const priorityCodes =
    geoContext === 'firmante'
      ? [PAIS_NACIMIENTO_MEXICO_CODE, PAIS_NACIMIENTO_OTRO_CODE]
      : [
          PAIS_NACIMIENTO_MEXICO_CODE,
          PAIS_NACIMIENTO_OTRO_CODE,
          PAIS_NACIMIENTO_SE_IGNORA_CODE,
          PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
        ];

  const ordered: PaisCatalogEntry[] = [];
  for (const code of priorityCodes) {
    const entry = byCode.get(code);
    if (entry) {
      ordered.push(entry);
      byCode.delete(code);
    }
  }

  const rest = Array.from(byCode.values()).sort(
    (a, b) => Number(a.code) - Number(b.code),
  );

  return [...ordered, ...rest];
}

export function isPaisNacimientoNoEspecificado(
  value: string | number | null | undefined,
): boolean {
  if (value == null || value === '') return false;
  return String(value) === PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE;
}

export function isPaisNacimientoSeIgnora(
  value: string | number | null | undefined,
): boolean {
  if (value == null || value === '') return false;
  return String(value) === PAIS_NACIMIENTO_SE_IGNORA_CODE;
}

export function isPaisProhibidoFirmante(
  value: string | number | null | undefined,
): boolean {
  return isPaisNacimientoNoEspecificado(value) || isPaisNacimientoSeIgnora(value);
}

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_FIRMANTE_MESSAGE =
  'No está permitido registrar NO ESPECIFICADO como país de nacimiento para firmantes';

export const PAIS_PROHIBIDO_FIRMANTE_MESSAGE =
  'No está permitido registrar SE IGNORA ni NO ESPECIFICADO como país para firmantes';
