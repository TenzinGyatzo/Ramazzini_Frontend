import {
  GIIS_ENTIDAD_NO_APLICA,
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_SE_IGNORA,
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
  RENAPO_ENTIDAD_EXTRANJERO,
  normalizeEntidadResidencia,
} from './giisResidenciaGeo';
import { getMunicipioDisplayCode, type GeoCatalogEntry } from './geoCatalogSort';
import {
  PAIS_NACIMIENTO_MEXICO_CODE,
  PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE,
} from './paisNacimiento';

export type GeoFormContext = 'trabajador' | 'firmante';

/** CATALOG_KEY cat_pais: OTRO */
export const PAIS_OTRO_CODE = '246';

/** CATALOG_KEY cat_pais: SE IGNORA */
export const PAIS_SE_IGNORA_CODE = '247';

export const PAIS_MEXICO = Number(PAIS_NACIMIENTO_MEXICO_CODE);
export const PAIS_NO_ESPECIFICADO = Number(PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE);
export const PAIS_OTRO = Number(PAIS_OTRO_CODE);
export const PAIS_SE_IGNORA = Number(PAIS_SE_IGNORA_CODE);

export const ENTIDAD_SENTINEL_LABELS: Record<string, string> = {
  [RENAPO_ENTIDAD_EXTRANJERO]: 'Extranjero',
  [GIIS_ENTIDAD_NO_ESPECIFICADO]: 'NO ESPECIFICADO',
  [GIIS_ENTIDAD_NO_APLICA]: 'NO APLICA',
  [GIIS_ENTIDAD_SE_IGNORA]: 'SE IGNORA',
};

const MEXICAN_ENTIDAD_CODES = Array.from({ length: 32 }, (_, index) =>
  String(index + 1).padStart(2, '0'),
);

/** País ≠ México (nacimiento): solo NO APLICA, igual que residencia. */
const NON_MEXICO_ENTIDAD_CODES = [GIIS_ENTIDAD_NO_APLICA];

const EXCLUDED_ENTIDAD_CODES_FIRMANTE = [
  GIIS_ENTIDAD_NO_ESPECIFICADO,
  GIIS_ENTIDAD_SE_IGNORA,
];

const EXCLUDED_MUNICIPIO_CODES_FIRMANTE = [
  GIIS_MUNICIPIO_NO_ESPECIFICADO,
  GIIS_MUNICIPIO_SE_IGNORA,
];

const EXCLUDED_LOCALIDAD_CODES_FIRMANTE = [
  GIIS_LOCALIDAD_NO_ESPECIFICADO,
  GIIS_LOCALIDAD_SE_IGNORA,
];

const EXCLUDED_PAIS_CODES_FIRMANTE = [PAIS_SE_IGNORA_CODE, PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE];

function getLocalidadDisplayCode(code: string | number | undefined | null): string {
  const raw = String(code ?? '').trim();
  if (!raw) return '';
  return raw.includes('-') ? (raw.split('-').pop() ?? raw) : raw;
}

export function normalizePaisCode(
  value: string | number | null | undefined,
): number | null {
  if (value === '' || value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(num) ? null : num;
}

export function isMexicoPais(pais: number | null | undefined): boolean {
  return pais === PAIS_MEXICO;
}

export function isNonMexicoPais(pais: number | null | undefined): boolean {
  return pais != null && pais !== PAIS_MEXICO;
}

export function getMexicanEntidadCodes(): string[] {
  return [...MEXICAN_ENTIDAD_CODES];
}

export function getNonMexicoEntidadCodes(_context?: GeoFormContext): string[] {
  return [...NON_MEXICO_ENTIDAD_CODES];
}

export function getExcludedPaisCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_PAIS_CODES_FIRMANTE] : [];
}

export function getExcludedEntidadCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_ENTIDAD_CODES_FIRMANTE] : [];
}

export function getExcludedMunicipioCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_MUNICIPIO_CODES_FIRMANTE] : [];
}

export function getExcludedLocalidadCodes(context: GeoFormContext): string[] {
  return context === 'firmante' ? [...EXCLUDED_LOCALIDAD_CODES_FIRMANTE] : [];
}

export function getAllowedEntidadCodesForPais(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  return getAllowedEntidadCodesForPaisNacimiento(pais, context);
}

export function getMexicoEntidadResidenciaAllowedCodes(
  context: GeoFormContext,
): string[] {
  if (context === 'firmante') {
    return getMexicanEntidadCodes();
  }
  return [
    GIIS_ENTIDAD_NO_ESPECIFICADO,
    GIIS_ENTIDAD_SE_IGNORA,
    ...getMexicanEntidadCodes(),
  ];
}

/** Reglas Renapo/GIIS nacimiento: México → 00/99/01-32 (trabajador) o 01-32 (firmante); extranjero → solo 88 */
export function getAllowedEntidadCodesForPaisNacimiento(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  if (pais == null) return undefined;
  if (isMexicoPais(pais)) {
    return getMexicoEntidadResidenciaAllowedCodes(context);
  }
  return getNonMexicoEntidadCodes(context);
}

/** Reglas GIIS residencia: México → 00/99/01-32 (trabajador) o 01-32 (firmante); extranjero → solo 88 */
export function getAllowedEntidadCodesForPaisResidencia(
  pais: number | null,
  context: GeoFormContext,
): string[] | undefined {
  if (pais == null) return undefined;
  if (isMexicoPais(pais)) {
    return getMexicoEntidadResidenciaAllowedCodes(context);
  }
  return [GIIS_ENTIDAD_NO_APLICA];
}

export function isEntidadAllowedForPaisNacimiento(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return false;
  if (getExcludedEntidadCodes(context).includes(normalized)) return false;
  const allowed = getAllowedEntidadCodesForPaisNacimiento(pais, context);
  if (!allowed) return true;
  return allowed.includes(normalized);
}

export function isEntidadAllowedForPaisResidencia(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return false;
  if (getExcludedEntidadCodes(context).includes(normalized)) return false;
  const allowed = getAllowedEntidadCodesForPaisResidencia(pais, context);
  if (!allowed) return true;
  return allowed.includes(normalized);
}

export function isEntidadAllowedForPais(
  entidad: string | undefined | null,
  pais: number | null,
  context: GeoFormContext,
): boolean {
  return isEntidadAllowedForPaisNacimiento(entidad, pais, context);
}

export function isEntidadEstatal(code: string | undefined | null): boolean {
  const normalized = normalizeEntidadResidencia(code);
  const num = parseInt(normalized, 10);
  return !Number.isNaN(num) && num >= 1 && num <= 32;
}

export function isEntidadEstatalResidencia(
  entidad: string | undefined | null,
): boolean {
  return isEntidadEstatal(entidad);
}

export function getMunicipioSentinelCodesForSelector(
  context: GeoFormContext,
  entidad: string,
  pais: number | null,
): string[] {
  if (context === 'firmante') return [];
  if (!isMexicoPais(pais) || !isEntidadEstatalResidencia(entidad)) return [];
  return [GIIS_MUNICIPIO_NO_ESPECIFICADO, GIIS_MUNICIPIO_SE_IGNORA];
}

export function getLocalidadSentinelCodesForSelector(
  context: GeoFormContext,
  entidad: string,
  municipio: string,
  pais: number | null,
): string[] {
  if (context === 'firmante') return [];
  if (!isMexicoPais(pais) || !isEntidadEstatalResidencia(entidad)) return [];
  const mun = String(municipio ?? '').trim();
  if (!mun || mun === GIIS_MUNICIPIO_NO_ESPECIFICADO || mun === GIIS_MUNICIPIO_SE_IGNORA) {
    return [];
  }
  return [GIIS_LOCALIDAD_NO_ESPECIFICADO, GIIS_LOCALIDAD_SE_IGNORA];
}

export function filterPaisCatalogEntries<T extends { code: string | number }>(
  items: T[],
  context: GeoFormContext,
): T[] {
  const excluded = new Set(getExcludedPaisCodes(context));
  return items.filter((item) => !excluded.has(String(item.code)));
}

/** Excluye SE IGNORA / NO ESPECIFICADO en firmantes aunque no haya país seleccionado. */
export function filterEntidadCatalogEntries<T extends { code: string | number }>(
  items: T[],
  context: GeoFormContext,
): T[] {
  const excluded = new Set(getExcludedEntidadCodes(context));
  if (excluded.size === 0) return items;
  return items.filter(
    (item) => !excluded.has(normalizeEntidadResidencia(String(item.code))),
  );
}

export function filterMunicipioCatalogEntries<T extends GeoCatalogEntry>(
  items: T[],
  context: GeoFormContext,
): T[] {
  const excluded = new Set(getExcludedMunicipioCodes(context));
  if (excluded.size === 0) return items;
  return items.filter((item) => !excluded.has(getMunicipioDisplayCode(item)));
}

export function filterLocalidadCatalogEntries<T extends { code: string | number }>(
  items: T[],
  context: GeoFormContext,
): T[] {
  const excluded = new Set(getExcludedLocalidadCodes(context));
  if (excluded.size === 0) return items;
  return items.filter(
    (item) => !excluded.has(getLocalidadDisplayCode(item.code)),
  );
}

export function buildEntidadSentinelOptions(codes: string[]) {
  return codes
    .filter((code) => ENTIDAD_SENTINEL_LABELS[code])
    .map((code) => ({
      code,
      description: ENTIDAD_SENTINEL_LABELS[code],
    }));
}

export function validatePaisEntidadCoherence(
  pais: number,
  entidad: string,
  context: GeoFormContext,
  fieldPrefix: 'nacimiento' | 'residencia',
): string[] {
  const errors: string[] = [];
  const normalized = normalizeEntidadResidencia(entidad);
  if (!normalized) return errors;

  const excludedPais = getExcludedPaisCodes(context);
  if (excludedPais.includes(String(pais))) {
    errors.push(
      `País de ${fieldPrefix} ${pais} no está permitido para ${context === 'firmante' ? 'firmantes' : 'trabajadores'}`,
    );
  }

  const excludedEntidad = getExcludedEntidadCodes(context);
  if (excludedEntidad.includes(normalized)) {
    errors.push(
      `Entidad de ${fieldPrefix} ${normalized} no está permitida para ${context === 'firmante' ? 'firmantes' : 'trabajadores'}`,
    );
    return errors;
  }

  const isAllowed =
    fieldPrefix === 'nacimiento'
      ? isEntidadAllowedForPaisNacimiento(normalized, pais, context)
      : isEntidadAllowedForPaisResidencia(normalized, pais, context);

  if (!isAllowed) {
    if (fieldPrefix === 'nacimiento') {
      if (isMexicoPais(pais)) {
        errors.push(
          context === 'firmante'
            ? 'Con país México (142) la entidad de nacimiento debe ser una entidad federativa (01-32)'
            : 'Con país México (142) la entidad de nacimiento debe ser 00, 99 o una entidad federativa (01-32)',
        );
      } else {
        errors.push(
          'País de nacimiento distinto de México requiere entidad 88 (NO APLICA)',
        );
      }
    } else if (isMexicoPais(pais)) {
      errors.push(
        context === 'firmante'
          ? 'Con país México (142) la entidad de residencia debe ser una entidad federativa (01-32)'
          : 'Con país México (142) la entidad de residencia debe ser 00, 99 o una entidad federativa (01-32)',
      );
    } else {
      errors.push(
        'País de residencia distinto de México requiere entidad 88 (NO APLICA)',
      );
    }
  }

  return errors;
}
