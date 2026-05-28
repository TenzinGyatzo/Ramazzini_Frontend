import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useCurpPolicy } from '@/composables/useCurpPolicy';

describe('MedicoFirmanteView - CURP Required Marker', () => {
  let pinia: any;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const createSiresPolicy = () => ({
    regime: 'SIRES_NOM024' as const,
    features: {
      sessionTimeoutEnabled: true,
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
      sessionTimeoutEnabled: false,
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

  it('should show asterisk (*) for CURP field in SIRES_NOM024', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const { curpRequired } = useCurpPolicy();
    expect(curpRequired.value).toBe(true);
  });

  it('should NOT show asterisk (*) for CURP field in SIN_REGIMEN', () => {
    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const { curpRequired } = useCurpPolicy();
    expect(curpRequired.value).toBe(false);
  });
});
