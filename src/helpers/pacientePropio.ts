/**
 * Parche 1.0.10: quien elabora un documento no puede ser el mismo paciente.
 * El servidor decide (solo aplica con cumplimiento normativo); estos textos son los mismos
 * que devuelve al guardar.
 */
import DocumentosAPI from '@/api/DocumentosAPI';

export const CODIGO_PRESTADOR_ES_PACIENTE = 'PRESTADOR_ES_PACIENTE';

export const MENSAJE_NOTA_MEDICA_PROPIA =
  'No puedes elaborar una nota médica para ti mismo. Pide a otro médico o enfermero que te atienda.';

export const MENSAJE_DOCUMENTO_PROPIO =
  'No puedes elaborar documentos clínicos para ti mismo. Pide a otro profesional con permiso que lo haga.';

export function mensajeDocumentoPropio(tipoDocumento: string): string {
  return tipoDocumento === 'notaMedica' ? MENSAJE_NOTA_MEDICA_PROPIA : MENSAJE_DOCUMENTO_PROPIO;
}

/**
 * Mensaje de bloqueo si el trabajador es el propio usuario; null si puede continuar.
 * Si la consulta falla no se bloquea aquí: el servidor vuelve a revisarlo al guardar.
 */
export async function bloqueoDocumentoPropio(
  idTrabajador: string,
  tipoDocumento: string,
): Promise<string | null> {
  if (!idTrabajador) return null;
  try {
    const { data } = await DocumentosAPI.getPacientePropio(idTrabajador);
    return data?.esPacientePropio ? mensajeDocumentoPropio(tipoDocumento) : null;
  } catch {
    return null;
  }
}
