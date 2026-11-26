/**
 * Parche 1.0.10, punto (8): la nota médica no se inicia si la CLUES del establecimiento no
 * está «1 – EN OPERACIÓN» en el catálogo. El servidor decide (solo aplica con cumplimiento
 * normativo) y manda el mensaje; al crear el borrador lo vuelve a revisar.
 */
import DocumentosAPI from '@/api/DocumentosAPI';

export const CODIGO_CLUES_NO_EN_OPERACION = 'CLUES_NO_EN_OPERACION';

/**
 * Mensaje de bloqueo si la CLUES no está en operación; null si se puede iniciar.
 * Si la consulta falla no se bloquea aquí: el servidor lo revisa al crear el borrador.
 */
export async function bloqueoCluesNotaMedica(
  idTrabajador: string,
  tipoDocumento: string,
): Promise<string | null> {
  if (!idTrabajador || tipoDocumento !== 'notaMedica') return null;
  try {
    const { data } = await DocumentosAPI.getCluesNotaMedica(idTrabajador);
    if (data?.permitido === false) {
      return data.mensaje || 'No se puede iniciar la nota médica: el establecimiento no está en operación.';
    }
    return null;
  } catch {
    return null;
  }
}
