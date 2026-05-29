import { computed, type Ref, type ComputedRef } from 'vue';
import { useNom024Fields } from '@/composables/useNom024Fields';
import { isGenericCurp } from '@/helpers/isGenericCurp';

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
} | null | undefined;

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

  function omitImmutableIdentificationFields<T extends Record<string, unknown>>(
    payload: T,
  ): T {
    if (!isFirmanteIdentificationReadOnly.value) {
      return payload;
    }

    const omitSet = new Set<string>(
      hasGenericCurpStored.value
        ? []
        : [...FIRMANTE_IMMUTABLE_PAYLOAD_FIELDS],
    );

    const result = { ...payload };
    for (const field of omitSet) {
      delete result[field];
    }
    return result;
  }

  return {
    isEditingFirmante,
    hasGenericCurpStored,
    isFirmanteIdentificationReadOnly,
    isCurpFieldReadOnly,
    isCurpConformationReadOnly,
    identificationSectionNotice,
    omitImmutableIdentificationFields,
  };
}
