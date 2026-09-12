import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useEditionLabel } from './useEditionLabel';

function createSiresPolicy() {
  return {
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
  };
}

function createSinRegimenPolicy() {
  return {
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
  };
}

describe('useEditionLabel', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('muestra el folio SIRES cuando el régimen es SIRES_NOM024', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const { editionLabel, editionVersion, editionVersionPrefixed } = useEditionLabel();
    expect(editionLabel.value).toBe(`SIRES ${__APP_VERSION_SIRES__}`);
    expect(editionLabel.value).toContain('v1.0.');
    expect(editionLabel.value).not.toContain('Ramazzini');
    expect(editionLabel.value).not.toContain('v2.0.0');
    expect(editionVersionPrefixed.value).toBe(__APP_VERSION_SIRES__);
    expect(editionVersion.value).toBe(__APP_VERSION_SIRES__.replace(/^v/i, ''));
    expect(editionVersion.value).not.toContain('v');
  });

  it('muestra el folio comercial cuando el régimen es SIN_REGIMEN', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const { editionLabel, editionVersion, editionVersionPrefixed } = useEditionLabel();
    expect(editionLabel.value).toBe(`Ramazzini ${__APP_VERSION_COMMERCIAL__}`);
    expect(editionLabel.value).toBe('Ramazzini v2.0.0');
    expect(editionLabel.value).not.toContain('v1.0.3');
    expect(editionLabel.value).not.toContain('SIRES');
    expect(editionVersionPrefixed.value).toBe('v2.0.0');
    expect(editionVersion.value).toBe('2.0.0');
  });

  it('sin proveedor ni policy muestra Ramazzini sin número', () => {
    const { editionLabel, editionVersion } = useEditionLabel();
    expect(editionLabel.value).toBe('Ramazzini');
    expect(editionLabel.value).not.toContain('v1.0.3');
    expect(editionLabel.value).not.toContain('v2.0.0');
    expect(editionVersion.value).toBe('');
  });

  it('tras upgrade SIN_REGIMEN → SIRES_NOM024 pasa al folio 1.0.x', () => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regimenRegulatorio: 'SIN_REGIMEN',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const { editionLabel, editionVersion } = useEditionLabel();
    expect(editionLabel.value).toBe('Ramazzini v2.0.0');
    expect(editionVersion.value).toBe('2.0.0');

    store.proveedorSalud = {
      ...store.proveedorSalud,
      regimenRegulatorio: 'SIRES_NOM024',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    expect(editionLabel.value).toBe(`SIRES ${__APP_VERSION_SIRES__}`);
    expect(editionLabel.value).toContain('v1.0.');
    expect(editionLabel.value).not.toContain('v2.0.0');
    expect(editionVersion.value).toBe(__APP_VERSION_SIRES__.replace(/^v/i, ''));
    expect(editionVersion.value).not.toContain('v');
  });
});
