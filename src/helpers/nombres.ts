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
 * Formatea título profesional + nombre completo del firmante.
 */
export function formatearTituloYNombreFirmante(firmante: {
  tituloProfesional?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
}): string {
  const titulo = firmante.tituloProfesional?.trim() ?? '';
  const nombreCompleto = formatearNombreFirmante(firmante);
  return `${titulo} ${nombreCompleto}`.trim();
}
