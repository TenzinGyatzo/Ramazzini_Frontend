/**
 * Etiqueta de la cédula en el pie de página, igual que el PDF
 * (backend/src/modules/informes/helpers/footer-firmantes.helper.ts).
 */
export type TipoFirmantePie = 'medico' | 'enfermera' | 'tecnico';

export function etiquetaCedulaPiePagina(
  pais: string | null | undefined,
  tipo: TipoFirmantePie,
): string {
  if (pais === 'MX') {
    return tipo === 'medico'
      ? 'Cédula Profesional Médico Cirujano No.'
      : 'Cédula Profesional No.';
  }
  if (pais === 'GT') return 'Colegiado Activo No.';
  return 'Registro Profesional No.';
}
