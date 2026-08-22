import { isGenericCurp } from '@/helpers/isGenericCurp';

export const WORKER_IMMUTABLE_PAYLOAD_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export const WORKER_CURP_CONFORMATION_PAYLOAD_FIELDS = [
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexoCURP',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export interface StoredWorkerIdentification {
  curp?: string;
  paisNacimiento?: string | number | null;
  entidadNacimiento?: string;
  tieneDocumentoClinicoFinalizado?: boolean;
}

export interface WorkerImmutablePayloadOptions {
  hasFinalizedClinicalDocument?: boolean;
}

export function getWorkerImmutablePayloadFields(
  storedWorker: StoredWorkerIdentification,
  options?: WorkerImmutablePayloadOptions,
): readonly string[] {
  const hasAttention =
    options?.hasFinalizedClinicalDocument === true ||
    storedWorker.tieneDocumentoClinicoFinalizado === true;

  if (hasAttention) {
    return [...WORKER_IMMUTABLE_PAYLOAD_FIELDS, 'sexo'];
  }

  if (isGenericCurp(storedWorker.curp)) {
    return [];
  }

  return [...WORKER_IMMUTABLE_PAYLOAD_FIELDS];
}
