import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SimpleLayout from './SimpleLayout.vue';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

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

describe('SimpleLayout — folio de edición', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountLayout() {
    return mount(SimpleLayout, {
      global: {
        plugins: [createPinia()],
        stubs: { RouterView: true },
      },
    });
  }

  it('sin régimen muestra Ramazzini sin número', () => {
    const wrapper = mountLayout();
    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('Ramazzini');
    expect(el.attributes('title')).toBe('Ramazzini');
  });

  it('SIRES_NOM024 muestra SIRES y el folio SIRES', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const wrapper = mount(SimpleLayout, {
      global: {
        plugins: [pinia],
        stubs: { RouterView: true },
      },
    });

    const el = wrapper.get('[data-testid="edition-label"]');
    const expected = `SIRES ${__APP_VERSION_SIRES__}`;
    expect(el.text()).toBe(expected);
    expect(el.attributes('title')).toBe(expected);
    expect(el.text()).not.toContain('v2.0.0');
  });

  it('SIN_REGIMEN muestra Ramazzini v2.0.0 sin SIRES', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = mount(SimpleLayout, {
      global: {
        plugins: [pinia],
        stubs: { RouterView: true },
      },
    });

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('Ramazzini v2.0.0');
    expect(el.attributes('title')).toBe('Ramazzini v2.0.0');
    expect(el.text()).not.toContain('v1.0.3');
    expect(el.text()).not.toContain('SIRES');
  });
});
