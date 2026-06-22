import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useNom024Fields } from './useNom024Fields';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

describe('useNom024Fields', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const baseProveedor = {
    _id: 'test-id',
    pais: 'MX',
    regulatoryPolicy: {
      regime: 'SIN_REGIMEN' as const,
      features: {
        cluesFieldVisible: false,
        workerIdentificationImmutable: false,
      },
      validation: {
        workerCurp: 'optional' as const,
        geoFields: 'optional' as const,
        cie10Principal: 'optional' as const,
        curpFirmantes: 'optional' as const,
      },
    },
  };

  it('returns optional RENAPO rules for MX + SIN_REGIMEN', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = { ...baseProveedor } as any;

    const { workerCurpValidationRules, showWorkerCurpField, workerCurpRequired } =
      useNom024Fields();

    expect(showWorkerCurpField.value).toBe(true);
    expect(workerCurpRequired.value).toBe(false);
    expect(workerCurpValidationRules.value).toBe('optional|curpRenapoValidation');
  });

  it('returns required RENAPO rules for MX + SIRES', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      ...baseProveedor,
      regulatoryPolicy: {
        ...baseProveedor.regulatoryPolicy,
        regime: 'SIRES_NOM024',
        validation: {
          ...baseProveedor.regulatoryPolicy.validation,
          workerCurp: 'required_strict',
          geoFields: 'required',
        },
      },
    } as any;

    const { workerCurpValidationRules, workerCurpRequired } = useNom024Fields();

    expect(workerCurpRequired.value).toBe(true);
    expect(workerCurpValidationRules.value).toBe('required|curpRenapoValidation');
  });

  it('returns no validation rules for non-MX providers', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      ...baseProveedor,
      pais: 'GT',
    } as any;

    const { workerCurpValidationRules, showWorkerCurpField } = useNom024Fields();

    expect(showWorkerCurpField.value).toBe(false);
    expect(workerCurpValidationRules.value).toBeNull();
  });
});
