import { computed, type ComputedRef, type Ref } from 'vue';
import {
  normalizeWorkerPersonName,
  resolveWorkerPersonNameRegime,
} from '@/helpers/normalizeWorkerPersonName';

export type FirmantePersonNameFields = {
  nombre?: string | null;
  primerApellido?: string | null;
  segundoApellido?: string | null;
};

export type PersonNameField = 'nombre' | 'primerApellido' | 'segundoApellido';

export function useFirmantePersonNameNormalization(
  formulario: Ref<FirmantePersonNameFields>,
  isSIRES: ComputedRef<boolean> | Ref<boolean>,
  isSinRegimen: ComputedRef<boolean> | Ref<boolean>,
) {
  const personNameRegime = computed(() =>
    resolveWorkerPersonNameRegime(isSIRES.value, isSinRegimen.value),
  );

  const normalizePersonNameValue = (value: string | null | undefined) =>
    normalizeWorkerPersonName(value, personNameRegime.value);

  const normalizePersonNameField = (field: PersonNameField) => {
    formulario.value[field] = normalizePersonNameValue(formulario.value[field]);
  };

  const normalizePersonNamesFromForm = () => ({
    nombre: normalizePersonNameValue(formulario.value.nombre),
    primerApellido: normalizePersonNameValue(formulario.value.primerApellido),
    segundoApellido: normalizePersonNameValue(formulario.value.segundoApellido),
  });

  const normalizePersonNamesFromRecord = (
    record: FirmantePersonNameFields | null | undefined,
  ): FirmantePersonNameFields => ({
    nombre: normalizePersonNameValue(record?.nombre ?? ''),
    primerApellido: normalizePersonNameValue(record?.primerApellido ?? ''),
    segundoApellido: normalizePersonNameValue(record?.segundoApellido ?? ''),
  });

  return {
    personNameRegime,
    normalizePersonNameField,
    normalizePersonNamesFromForm,
    normalizePersonNamesFromRecord,
  };
}
