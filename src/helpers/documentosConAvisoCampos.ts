/**
 * Documentos que, al guardar, llevan al dato pendiente campo por campo (paso + campo + qué
 * corregir; AvisoAtencionCampos). En ellos «Siguiente» ya no detiene el avance con el modal
 * genérico de «Campos pendientes» (punto 51): como en la captura rápida, se avanza libremente y
 * el aviso al guardar lleva a lo que falte.
 *
 * Punto 52: receta, certificados, nota aclaratoria, previo a espirometría y control prenatal se
 * sumaron con sus propias revisiones; el modal queda solo para documentos sin campos con
 * `required` en sus pasos (en la práctica, ya no aparece).
 */
export const DOCUMENTOS_CON_AVISO_CAMPOS = [
  'notaMedica',
  'historiaClinica',
  'exploracionFisica',
  'examenVista',
  'audiometria',
  'aptitud',
  'notaEnfermeria',
  // Punto 52: migrados (antes solo los detenía el modal genérico al pulsar «Siguiente»)
  'receta',
  'certificado',
  'certificadoExpedito',
  'notaAclaratoria',
  'previoEspirometria',
  'controlPrenatal',
  'historiaOtologica',
] as const;

export function tieneAvisoCampos(tipo: string | null | undefined): boolean {
  return !!tipo && (DOCUMENTOS_CON_AVISO_CAMPOS as readonly string[]).includes(tipo);
}
