import { computed, type Ref, type ComputedRef } from 'vue';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { isGenericCurp } from '@/helpers/isGenericCurp';
import { convertirFechaISOaYYYYMMDD } from '@/helpers/dates';

export const FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS = [
  'curp',
  'nombre',
  'primerApellido',
  'segundoApellido',
  'fechaNacimiento',
  'sexo',
  'entidadNacimiento',
  'paisNacimiento',
] as const;

export type FirmanteRecord = {
  _id?: string;
  curp?: string;
  nombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  fechaNacimiento?: string | Date;
  sexo?: string;
  entidadNacimiento?: string;
  paisNacimiento?: number | string;
} | null | undefined;

function formatStoredFieldForSubmit(
  field: (typeof FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS)[number],
  storedRecord: Record<string, unknown>,
): unknown {
  const raw = storedRecord[field];
  if (raw === undefined || raw === null) {
    return raw;
  }
  if (field === 'fechaNacimiento') {
    if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }
    return convertirFechaISOaYYYYMMDD(String(raw));
  }
  return raw;
}

/**
 * Bloqueo de edición de campos CURP/demografía en firmantes SIRES (paridad ModalTrabajadores).
 */
export function useFirmanteIdentificationReadOnly(
  firmante: Ref<FirmanteRecord> | ComputedRef<FirmanteRecord>,
) {
  const { workerIdentificationImmutable, isSIRES } = useNom024Fields();

  const isEditingFirmante = computed(() => !!firmante.value?._id);

  const hasGenericCurpStored = computed(() =>
    isGenericCurp(firmante.value?.curp),
  );

  const isFirmanteIdentificationReadOnly = computed(
    () =>
      isSIRES.value &&
      isEditingFirmante.value &&
      workerIdentificationImmutable.value,
  );

  const isCurpFieldReadOnly = computed(
    () => isFirmanteIdentificationReadOnly.value && !hasGenericCurpStored.value,
  );

  const isCurpConformationReadOnly = computed(
    () => isFirmanteIdentificationReadOnly.value && !hasGenericCurpStored.value,
  );

  const identificationSectionNotice = computed(() => {
    if (!isFirmanteIdentificationReadOnly.value) return '';
    if (hasGenericCurpStored.value) {
      return 'Complete la CURP real y los datos de nacimiento; después quedarán bloqueados.';
    }
    return 'Los datos de identificación no pueden modificarse tras el registro.';
  });

  function preserveImmutableIdentificationFields<T extends Record<string, unknown>>(
    payload: T,
    storedRecord?: FirmanteRecord,
  ): T {
    if (!isFirmanteIdentificationReadOnly.value || hasGenericCurpStored.value) {
      return payload;
    }

    const record = (storedRecord ?? firmante.value) as Record<string, unknown> | null | undefined;
    if (!record) {
      return payload;
    }

    const result: Record<string, unknown> = { ...payload };
    for (const field of FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS) {
      result[field] = formatStoredFieldForSubmit(field, record);
    }
    return result as T;
  }

  return {
    isEditingFirmante,
    hasGenericCurpStored,
    isFirmanteIdentificationReadOnly,
    isCurpFieldReadOnly,
    isCurpConformationReadOnly,
    identificationSectionNotice,
    preserveImmutableIdentificationFields,
  };
}
