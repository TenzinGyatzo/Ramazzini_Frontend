/**
 * Normaliza respuestas de API de firmantes.
 * Create/update devuelven { message, data: documento }; GET por id devuelve el documento directo.
 */
export function unwrapFirmanteRecord<T extends { _id?: string }>(
  payload: unknown,
): T | null {
  if (payload == null || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;

  if (typeof record._id === 'string' && record._id.length > 0) {
    return payload as T;
  }

  const nested = record.data;
  if (
    nested != null &&
    typeof nested === 'object' &&
    typeof (nested as { _id?: string })._id === 'string' &&
    (nested as { _id: string })._id.length > 0
  ) {
    return nested as T;
  }

  return null;
}
