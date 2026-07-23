/**
 * Tipos para errores regulatorios
 */

/**
 * Códigos de error regulatorios
 */
export enum RegulatoryErrorCode {
  REGIMEN_FEATURE_DISABLED = 'REGIMEN_FEATURE_DISABLED',
  REGIMEN_DOCUMENT_IMMUTABLE = 'REGIMEN_DOCUMENT_IMMUTABLE',
  REGIMEN_FIELD_REQUIRED = 'REGIMEN_FIELD_REQUIRED',
  CONSENT_NOT_ENABLED = 'CONSENT_NOT_ENABLED',
  CONSENT_ALREADY_EXISTS = 'CONSENT_ALREADY_EXISTS',
  CONSENT_REQUIRED = 'CONSENT_REQUIRED',
  CONFIDENTIALITY_AGREEMENT_REQUIRED = 'CONFIDENTIALITY_AGREEMENT_REQUIRED',
  ORG_DELETE_BLOCKED_RESGUARDED_DOCS = 'ORG_DELETE_BLOCKED_RESGUARDED_DOCS',
}

/**
 * Detalles opcionales de errores regulatorios
 */
export interface RegulatoryErrorDetails {
  /**
   * Nombre de la feature que está deshabilitada
   * Ejemplos: 'giisExport', 'notaAclaratoria'
   */
  feature?: string;

  /**
   * Estado del documento cuando es inmutable
   * Ejemplos: 'FINALIZADO', 'ANULADO'
   */
  documentState?: string;

  /**
   * Nombre del campo que es requerido
   * Ejemplos: 'curp', 'cie10Principal', 'entidadNacimiento'
   */
  fieldName?: string;

  /**
   * Tipo de documento afectado (opcional)
   * Ejemplos: 'notaMedica', 'historiaClinica', 'aptitud'
   */
  documentType?: string;

  /** Conteo / IDs para bloqueo de borrado organizacional */
  resguardedDocCount?: number;
  empresaId?: string;
  centroId?: string;
}

/**
 * Respuesta de error regulatorio del backend
 */
export interface RegulatoryErrorResponse {
  statusCode: number;
  message: string;
  errorCode: RegulatoryErrorCode;
  details?: RegulatoryErrorDetails;
}
