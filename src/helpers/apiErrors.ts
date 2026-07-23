/**
 * Extrae un mensaje legible desde errores de Axios / NestJS.
 * Soporta message string, array, objeto anidado (VALIDATION_ERROR A1) y errors[] NOM-024.
 */

interface CurpA1ErrorPayload {
  code?: string;
  ruleId?: string;
  summary?: string;
  userMessages?: string[];
  message?: string;
}

function isCurpA1Payload(value: unknown): value is CurpA1ErrorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as CurpA1ErrorPayload;
  return payload.ruleId === 'A1' || payload.code === 'VALIDATION_ERROR';
}

function extractCurpA1Message(payload: CurpA1ErrorPayload): string | null {
  if (typeof payload.message === 'string' && payload.message.trim() !== '') {
    return payload.message.trim();
  }

  if (Array.isArray(payload.userMessages) && payload.userMessages.length > 0) {
    const summary =
      typeof payload.summary === 'string' && payload.summary.trim() !== ''
        ? payload.summary.trim()
        : 'La CURP no coincide con los datos capturados.';

    if (payload.userMessages.length <= 3) {
      return `${summary} ${payload.userMessages.join(' ')}`.trim();
    }

    return `${summary} Revise los datos señalados.`.trim();
  }

  if (typeof payload.summary === 'string' && payload.summary.trim() !== '') {
    return payload.summary.trim();
  }

  return null;
}

function extractRegulatoryErrorMessage(data: Record<string, unknown>): string | null {
  const errorCode = data.errorCode;
  if (errorCode === 'REGIMEN_WORKER_IDENTIFICATION_IMMUTABLE') {
    if (typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message.trim();
    }
    return 'Los datos de identificación del trabajador no pueden modificarse una vez concluido el registro.';
  }
  if (errorCode === 'ORG_DELETE_BLOCKED_RESGUARDED_DOCS') {
    if (typeof data.message === 'string' && data.message.trim() !== '') {
      return data.message.trim();
    }
    const details = data.details as
      | { centroId?: string; empresaId?: string }
      | undefined;
    if (details?.centroId) {
      return 'No se puede eliminar este centro de trabajo porque contiene documentos finalizados o anulados.';
    }
    if (details?.empresaId) {
      return 'No se puede eliminar esta empresa porque contiene documentos finalizados o anulados.';
    }
    return 'No se puede eliminar porque contiene documentos finalizados o anulados.';
  }
  return null;
}

function extractMessageFromData(data: Record<string, unknown>): string | null {
  const regulatoryMessage = extractRegulatoryErrorMessage(data);
  if (regulatoryMessage) {
    return regulatoryMessage;
  }

  if (isCurpA1Payload(data)) {
    const a1Message = extractCurpA1Message(data);
    if (a1Message) {
      return a1Message;
    }
  }

  const message = data.message;

  if (typeof message === 'string' && message.trim() !== '') {
    return message;
  }

  if (Array.isArray(message)) {
    return message.filter(Boolean).join('. ');
  }

  if (message && typeof message === 'object') {
    const nested = message as CurpA1ErrorPayload;

    if (isCurpA1Payload(nested)) {
      const a1Message = extractCurpA1Message(nested);
      if (a1Message) {
        return a1Message;
      }
    }

    if (typeof nested.message === 'string' && nested.message.trim() !== '') {
      return nested.message;
    }
  }

  return null;
}

export function extractApiErrorMessage(
  error: unknown,
  fallback = 'Ocurrió un error. Por favor intente nuevamente.',
): string {
  const axiosError = error as {
    response?: { data?: Record<string, unknown> };
    message?: string;
  };

  const data = axiosError.response?.data;
  if (!data) {
    return axiosError.message || fallback;
  }

  const errors = data.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        const item = entry as { field?: string; reason?: string; message?: string };
        if (item.field && item.reason) return `${item.field}: ${item.reason}`;
        if (item.message) return item.message;
        return JSON.stringify(entry);
      })
      .join('. ');
  }

  const extractedMessage = extractMessageFromData(data);
  if (extractedMessage) {
    return extractedMessage;
  }

  if (typeof data.error === 'string' && data.error.trim() !== '') {
    return data.error;
  }

  return fallback;
}
