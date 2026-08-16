import { computed } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

/**
 * Composable para manejar la política de CURP y campos NOM-024 en firmantes
 * Basado en el régimen regulatorio del proveedor
 */
export function useCurpPolicy() {
  const proveedorSaludStore = useProveedorSaludStore();

  const policy = computed(() => proveedorSaludStore.regulatoryPolicy);

  const isMX = computed<boolean>(
    () => proveedorSaludStore.proveedorSalud?.pais === 'MX',
  );

  const curpRequired = computed<boolean>(() => {
    return (
      isMX.value &&
      policy.value?.validation?.curpFirmantes === 'required'
    );
  });

  const paisNacimientoRequired = computed<boolean>(() => true);

  const entidadNacimientoRequired = computed<boolean>(() => {
    return (
      policy.value?.regime === 'SIRES_NOM024' &&
      policy.value?.validation?.geoFields === 'required'
    );
  });

  const showEntidadNacimiento = computed<boolean>(() => {
    return policy.value?.regime === 'SIRES_NOM024';
  });

  const showCurpField = computed<boolean>(() => {
    if (!isMX.value) return false;
    const regime = policy.value?.regime;
    return regime === 'SIRES_NOM024' || regime === 'SIN_REGIMEN';
  });

  const curpValidationRules = computed<string>(() => {
    return curpRequired.value ? 'required' : '';
  });

  const isSIRES = computed<boolean>(() => {
    return policy.value?.regime === 'SIRES_NOM024';
  });

  const isSinRegimen = computed<boolean>(() => {
    return policy.value?.regime === 'SIN_REGIMEN';
  });

  /** SIN_REGIMEN: sexo opcional en formulario (alertas de perfil aparte). */
  const sexoRequired = computed<boolean>(() => false);

  const sexoCurpRequired = computed<boolean>(() => isSIRES.value);

  return {
    curpRequired,
    paisNacimientoRequired,
    entidadNacimientoRequired,
    showEntidadNacimiento,
    showCurpField,
    curpValidationRules,
    isSIRES,
    isSinRegimen,
    isMX,
    sexoRequired,
    sexoCurpRequired,
  };
}
