import { computed } from 'vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { catalogAdminEnabled } from '@/composables/useCatalogAdminFeature';

/**
 * Composable para manejar la política regulatoria
 * Centraliza todos los helpers de features y validaciones basados en el régimen regulatorio
 * 
 * Uso:
 * ```typescript
 * const { notaAclaratoriaEnabled, curpFirmantesRequired } = useRegulatoryPolicy();
 * 
 * if (notaAclaratoriaEnabled.value) {
 *   // Mostrar opción de nota aclaratoria
 * }
 * ```
 */
export function useRegulatoryPolicy() {
  const proveedorSaludStore = useProveedorSaludStore();

  /**
   * Indica si el régimen es SIRES_NOM024
   */
  const isSIRES = computed<boolean>(() => 
    proveedorSaludStore.regulatoryPolicy?.regime === 'SIRES_NOM024'
  );

  /**
   * Indica si el régimen es SIN_REGIMEN
   */
  const isSinRegimen = computed<boolean>(() => 
    proveedorSaludStore.regulatoryPolicy?.regime === 'SIN_REGIMEN'
  );

  // ========== FEATURES ==========

  /**
   * Indica si las notas aclaratorias están habilitadas
   */
  const notaAclaratoriaEnabled = computed<boolean>(() => 
    proveedorSaludStore.notaAclaratoriaEnabled
  );

  /**
   * Indica si la exportación GIIS está habilitada
   */
  const giisExportEnabled = computed<boolean>(() => 
    proveedorSaludStore.giisExportEnabled
  );

  /**
   * Indica si la inmutabilidad de documentos está habilitada
   */
  const documentImmutabilityEnabled = computed<boolean>(() => 
    proveedorSaludStore.documentImmutabilityEnabled
  );

  /**
   * Indica si el timeout de sesión está habilitado
   */
  const sessionTimeoutEnabled = computed<boolean>(() => 
    proveedorSaludStore.sessionTimeoutEnabled
  );

  /**
   * Indica si el campo CLUES debe ser visible
   */
  const cluesFieldVisible = computed<boolean>(() => 
    proveedorSaludStore.cluesFieldVisible
  );

  /**
   * Indica si la UI SIRES debe mostrarse
   */
  const showSiresUI = computed<boolean>(() => 
    proveedorSaludStore.showSiresUI
  );

  /**
   * Indica si el consentimiento diario está habilitado
   */
  const dailyConsentEnabled = computed<boolean>(() => 
    proveedorSaludStore.dailyConsentEnabled
  );

  /**
   * Indica si el acuerdo de confidencialidad está habilitado
   */
  const confidentialityAgreementEnabled = computed<boolean>(() =>
    proveedorSaludStore.confidentialityAgreementEnabled
  );

  /**
   * Indica si el trail de auditoría NOM-024 está habilitado
   */
  const auditTrailEnabled = computed<boolean>(() =>
    proveedorSaludStore.auditTrailEnabled
  );

  /**
   * Administración de catálogos: env flag AND régimen SIRES
   */
  const canAccessCatalogAdmin = computed<boolean>(() =>
    catalogAdminEnabled && isSIRES.value
  );

  // ========== VALIDATIONS ==========

  /**
   * Indica si CURP es requerido para firmantes
   */
  const curpFirmantesRequired = computed<boolean>(() => 
    proveedorSaludStore.curpFirmantesRequired
  );

  /**
   * Indica si CURP es requerido estrictamente para trabajadores
   */
  const workerCurpRequired = computed<boolean>(() => 
    proveedorSaludStore.workerCurpRequired
  );

  /**
   * Indica si CIE-10 principal es requerido
   */
  const cie10PrincipalRequired = computed<boolean>(() => 
    proveedorSaludStore.cie10PrincipalRequired
  );

  /**
   * Indica si los campos geográficos son requeridos
   */
  const geoFieldsRequired = computed<boolean>(() => 
    proveedorSaludStore.geoFieldsRequired
  );

  return {
    // Régimen
    isSIRES,
    isSinRegimen,
    // Features
    notaAclaratoriaEnabled,
    giisExportEnabled,
    documentImmutabilityEnabled,
    sessionTimeoutEnabled,
    cluesFieldVisible,
    showSiresUI,
    dailyConsentEnabled,
    confidentialityAgreementEnabled,
    auditTrailEnabled,
    canAccessCatalogAdmin,
    // Validations
    curpFirmantesRequired,
    workerCurpRequired,
    cie10PrincipalRequired,
    geoFieldsRequired,
  };
}
