/**
 * Documentos que, al guardar, llevan al dato pendiente campo por campo (paso + campo + qué
 * corregir; AvisoAtencionCampos). En ellos «Siguiente» ya no detiene el avance con el modal
 * genérico de «Campos pendientes» (punto 51): como en la captura rápida, se avanza libremente y
 * el aviso al guardar lleva a lo que falte.
 *
 * Los demás documentos conservan ese modal mientras su revisión al guardar no cubra todos sus
 * campos (previo a espirometría, receta, control prenatal, certificados, nota aclaratoria).
 */
export const DOCUMENTOS_CON_AVISO_CAMPOS = [
  'notaMedica',
  'historiaClinica',
  'exploracionFisica',
  'examenVista',
  'audiometria',
  'aptitud',
  'notaEnfermeria',
] as const;

export function tieneAvisoCampos(tipo: string | null | undefined): boolean {
  return !!tipo && (DOCUMENTOS_CON_AVISO_CAMPOS as readonly string[]).includes(tipo);
}
