import { computed } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

/**
 * Composable para acceder a flags de policy relacionados con campos NOM-024
 * Centraliza el acceso a las validaciones y features basadas en régimen regulatorio
 */
export function useNom024Fields() {
  const proveedorSaludStore = useProveedorSaludStore();

  const policy = computed(() => proveedorSaludStore.regulatoryPolicy);

  const cie10Required = computed(() => 
    policy.value?.validation?.cie10Principal === 'required'
  );

  const geoFieldsRequired = computed(() => 
    policy.value?.validation?.geoFields === 'required'
  );

  const workerCurpRequired = computed(() => 
    policy.value?.validation?.workerCurp === 'required_strict'
  );

  const cluesFieldVisible = computed(() => 
    policy.value?.features?.cluesFieldVisible ?? false
  );

  const workerIdentificationImmutable = computed(() =>
    policy.value?.features?.workerIdentificationImmutable ?? false
  );

  const isMxProveedor = computed(() => proveedorSaludStore.isMX);

  /** Campo con etiqueta CURP (solo proveedores en México) */
  const showWorkerCurpField = computed(() => isMxProveedor.value);

  /**
   * Reglas FormKit para identificador personal del trabajador:
   * - No-MX: sin validación (opcional)
   * - MX + SIRES: CURP requerida (RENAPO)
   * - MX + SIN_REGIMEN: CURP opcional (RENAPO si se captura)
   */
  const workerCurpValidationRules = computed(() => {
    if (!isMxProveedor.value) {
      return '';
    }
    if (workerCurpRequired.value) {
      return 'required|curpRenapoValidation';
    }
    return 'optional|curpRenapoValidation';
  });

  return {
    cie10Required,
    geoFieldsRequired,
    workerCurpRequired,
    cluesFieldVisible,
    workerIdentificationImmutable,
    isMxProveedor,
    showWorkerCurpField,
    workerCurpValidationRules,
    isSIRES: computed(() => policy.value?.regime === 'SIRES_NOM024'),
    isSinRegimen: computed(() => policy.value?.regime === 'SIN_REGIMEN'),
  };
}
