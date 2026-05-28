/** CATALOG_KEY cat_pais: NO ESPECIFICADO */
export const PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE = '248';

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_LABEL = 'NO ESPECIFICADO';

export function isPaisNacimientoNoEspecificado(
  value: string | number | null | undefined,
): boolean {
  if (value == null || value === '') return false;
  return String(value) === PAIS_NACIMIENTO_NO_ESPECIFICADO_CODE;
}

export const PAIS_NACIMIENTO_NO_ESPECIFICADO_FIRMANTE_MESSAGE =
  'No está permitido registrar NO ESPECIFICADO como país de nacimiento para firmantes';
