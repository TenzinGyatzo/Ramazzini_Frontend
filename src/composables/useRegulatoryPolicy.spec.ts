import { describe, it, expect, beforeEach } from 'vitest';
import { useRegulatoryPolicy } from './useRegulatoryPolicy';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

describe('useRegulatoryPolicy', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const createSiresPolicy = () => ({
    regime: 'SIRES_NOM024' as const,
    features: {
      sessionTimeoutEnabled: true,
      sessionTimeoutMs: 900_000,
      enforceDocumentImmutabilityUI: true,
      documentImmutabilityEnabled: true,
      showSiresUI: true,
      giisExportEnabled: true,
      notaAclaratoriaEnabled: true,
      cluesFieldVisible: true,
    },
    validation: {
      curpFirmantes: 'required' as const,
      workerCurp: 'required_strict' as const,
      cie10Principal: 'required' as const,
      geoFields: 'required' as const,
    },
  });

  const createSinRegimenPolicy = () => ({
    regime: 'SIN_REGIMEN' as const,
    features: {
      sessionTimeoutEnabled: true,
      sessionTimeoutMs: 1_800_000,
      enforceDocumentImmutabilityUI: false,
      documentImmutabilityEnabled: false,
      showSiresUI: false,
      giisExportEnabled: false,
      notaAclaratoriaEnabled: false,
      cluesFieldVisible: false,
    },
    validation: {
      curpFirmantes: 'optional' as const,
      workerCurp: 'optional' as const,
      cie10Principal: 'optional' as const,
      geoFields: 'optional' as const,
    },
  });

  it('should return correct values for SIRES_NOM024', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const {
      isSIRES,
      isSinRegimen,
      notaAclaratoriaEnabled,
      giisExportEnabled,
      documentImmutabilityEnabled,
      sessionTimeoutEnabled,
      sessionTimeoutMs,
      cluesFieldVisible,
      cie10PrincipalRequired,
      curpFirmantesRequired,
      workerCurpRequired,
      geoFieldsRequired,
    } = useRegulatoryPolicy();

    expect(isSIRES.value).toBe(true);
    expect(isSinRegimen.value).toBe(false);
    expect(notaAclaratoriaEnabled.value).toBe(true);
    expect(giisExportEnabled.value).toBe(true);
    expect(documentImmutabilityEnabled.value).toBe(true);
    expect(sessionTimeoutEnabled.value).toBe(true);
    expect(sessionTimeoutMs.value).toBe(900_000);
    expect(cluesFieldVisible.value).toBe(true);
    expect(cie10PrincipalRequired.value).toBe(true);
    expect(curpFirmantesRequired.value).toBe(true);
    expect(workerCurpRequired.value).toBe(true);
    expect(geoFieldsRequired.value).toBe(true);
  });

  it('should return correct values for SIN_REGIMEN', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const {
      isSIRES,
      isSinRegimen,
      notaAclaratoriaEnabled,
      giisExportEnabled,
      documentImmutabilityEnabled,
      sessionTimeoutEnabled,
      sessionTimeoutMs,
      cluesFieldVisible,
      cie10PrincipalRequired,
      curpFirmantesRequired,
      workerCurpRequired,
      geoFieldsRequired,
    } = useRegulatoryPolicy();

    expect(isSIRES.value).toBe(false);
    expect(isSinRegimen.value).toBe(true);
    expect(notaAclaratoriaEnabled.value).toBe(false);
    expect(giisExportEnabled.value).toBe(false);
    expect(documentImmutabilityEnabled.value).toBe(false);
    expect(sessionTimeoutEnabled.value).toBe(true);
    expect(sessionTimeoutMs.value).toBe(1_800_000);
    expect(cluesFieldVisible.value).toBe(false);
    expect(cie10PrincipalRequired.value).toBe(false);
    expect(curpFirmantesRequired.value).toBe(false);
    expect(workerCurpRequired.value).toBe(false);
    expect(geoFieldsRequired.value).toBe(false);
  });
});
