/**
 * Por qué se marcó a un trabajador como posible duplicado. El servidor guarda 'FOLIO' para
 * «mismos datos de identidad» (apellidos, nombre, fecha de nacimiento y sexo): así se llamaba
 * cuando la huella era el folio. El folio de ahora es consecutivo y nunca se repite.
 */
export function etiquetaCriterioDuplicado(
  criterio: string | null | undefined,
  identificadorPersonal = 'CURP',
): string {
  if (criterio === 'CURP') return `misma ${identificadorPersonal}`;
  if (criterio === 'FOLIO') return 'mismos datos de identidad';
  return 'confirmación manual';
}
