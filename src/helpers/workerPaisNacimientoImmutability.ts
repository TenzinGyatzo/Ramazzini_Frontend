import { isGenericCurp } from '@/helpers/isGenericCurp';
import { PAIS_NACIMIENTO_MEXICO } from '@/composables/useEntidadPaisNacimientoCoherence';

const MEXICAN_ENTIDAD_NACIMIENTO_PATTERN = /^(0[1-9]|[12][0-9]|3[0-2])$/;

export const WORKER_IMMUTABLE_PAYLOAD_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export const WORKER_CURP_CONFORMATION_PAYLOAD_FIELDS = [
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
] as const;

export interface StoredWorkerIdentification {
  curp?: string;
  paisNacimiento?: string | number | null;
  entidadNacimiento?: string;
}

export function isMexicanEntidadNacimiento(code: string | undefined): boolean {
  if (!code) return false;
  return MEXICAN_ENTIDAD_NACIMIENTO_PATTERN.test(code.trim().toUpperCase());
}

function hasStoredPaisNacimiento(paisNacimiento: unknown): boolean {
  return paisNacimiento !== null && paisNacimiento !== undefined && paisNacimiento !== '';
}

export function isPaisNacimientoImmutable(storedWorker: StoredWorkerIdentification): boolean {
  if (isGenericCurp(storedWorker.curp)) {
    return false;
  }

  if (!hasStoredPaisNacimiento(storedWorker.paisNacimiento)) {
    return false;
  }

  if (Number(storedWorker.paisNacimiento) !== PAIS_NACIMIENTO_MEXICO) {
    return false;
  }

  return isMexicanEntidadNacimiento(storedWorker.entidadNacimiento);
}

export function getWorkerImmutablePayloadFields(
  storedWorker: StoredWorkerIdentification,
): readonly string[] {
  let fields = [...WORKER_IMMUTABLE_PAYLOAD_FIELDS];

  if (isGenericCurp(storedWorker.curp)) {
    const exempt = new Set<string>([
      'curp',
      ...WORKER_CURP_CONFORMATION_PAYLOAD_FIELDS,
    ]);
    fields = fields.filter((field) => !exempt.has(field));
  }

  if (!isPaisNacimientoImmutable(storedWorker)) {
    fields = fields.filter((field) => field !== 'paisNacimiento');
  }

  return fields;
}

export function isPaisNacimientoReadOnlyForWorker(
  storedWorker: StoredWorkerIdentification | null | undefined,
  isIdentificationImmutableContext: boolean,
): boolean {
  if (!isIdentificationImmutableContext || !storedWorker) {
    return false;
  }

  return isPaisNacimientoImmutable(storedWorker);
}
