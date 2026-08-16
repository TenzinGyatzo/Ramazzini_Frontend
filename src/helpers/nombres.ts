/**
 * Régimen regulatorio usado solo para formato de presentación (no persistencia).
 */
export type RegimenRegulatorioDisplay =
  | 'SIRES_NOM024'
  | 'SIN_REGIMEN'
  | 'NO_SUJETO_SIRES'
  | string
  | null
  | undefined;

/**
 * Formatea el nombre completo de un firmante (médico, enfermera o técnico).
 * Si no hay primerApellido (registro legacy), devuelve solo nombre.
 */
export function formatearNombreFirmante(firmante: {
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}): string {
  const nombre = firmante.nombre?.trim() ?? '';
  const primerApellido = firmante.primerApellido?.trim() ?? '';
  const segundoApellido = firmante.segundoApellido?.trim() ?? '';

  if (!primerApellido) {
    return nombre || 'Sin nombre';
  }

  const partes = [nombre, primerApellido, segundoApellido].filter(
    (parte) => parte !== '',
  );

  return partes.join(' ') || 'Sin nombre';
}

/**
 * Formatea el título profesional para visualización.
 * En SIRES_NOM024 se muestra en mayúsculas; el valor canónico en BD no cambia.
 */
export function formatearTituloProfesional(
  titulo?: string | null,
  regimen?: RegimenRegulatorioDisplay,
): string {
  const trimmed = titulo?.trim() ?? '';
  if (!trimmed) return '';
  if (regimen === 'SIRES_NOM024') {
    return trimmed.toLocaleUpperCase('es-MX');
  }
  return trimmed;
}

/**
 * Formatea título profesional + nombre completo del firmante.
 */
export function formatearTituloYNombreFirmante(
  firmante: {
    tituloProfesional?: string;
    nombre?: string;
    primerApellido?: string;
    segundoApellido?: string;
  },
  regimen?: RegimenRegulatorioDisplay,
): string {
  const titulo = formatearTituloProfesional(
    firmante.tituloProfesional,
    regimen,
  );
  const nombreCompleto = formatearNombreFirmante(firmante);
  return `${titulo} ${nombreCompleto}`.trim();
}
