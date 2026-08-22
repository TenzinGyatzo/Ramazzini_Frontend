import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import Sidebar from './Sidebar.vue';
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

async function mountSidebar(pinia = createPinia()) {
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  });
  await router.push('/');
  await router.isReady();

  return mount(Sidebar, {
    global: {
      plugins: [pinia, router],
      provide: { toast: { open: vi.fn() } },
      stubs: {
        SidebarLink: true,
        Transition: true,
      },
    },
  });
}

describe('Sidebar — folio de edición', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('sin régimen muestra Ramazzini sin número', async () => {
    const wrapper = await mountSidebar();
    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('Ramazzini');
    expect(el.attributes('title')).toBe('Ramazzini');
  });

  it('SIRES_NOM024 muestra SIRES y el folio SIRES', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSiresPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    const el = wrapper.get('[data-testid="edition-label"]');
    const expected = `SIRES ${__APP_VERSION_SIRES__}`;
    expect(el.text()).toBe(expected);
    expect(el.attributes('title')).toBe(expected);
    expect(el.text()).not.toContain('v2.0.0');
  });

  it('SIN_REGIMEN muestra Ramazzini v2.0.0 sin SIRES', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe('Ramazzini v2.0.0');
    expect(el.attributes('title')).toBe('Ramazzini v2.0.0');
    expect(el.text()).not.toContain('v1.0.3');
    expect(el.text()).not.toContain('SIRES');
  });

  it('tras changeRegimen a SIRES el footer pasa al folio 1.0.x', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useProveedorSaludStore();
    store.proveedorSalud = {
      _id: 'test-id',
      regimenRegulatorio: 'SIN_REGIMEN',
      regulatoryPolicy: createSinRegimenPolicy(),
    } as any;

    const wrapper = await mountSidebar(pinia);
    expect(wrapper.get('[data-testid="edition-label"]').text()).toBe(
      'Ramazzini v2.0.0',
    );

    store.proveedorSalud = {
      ...store.proveedorSalud,
      regimenRegulatorio: 'SIRES_NOM024',
      regulatoryPolicy: createSiresPolicy(),
    } as any;
    await wrapper.vm.$nextTick();

    const el = wrapper.get('[data-testid="edition-label"]');
    expect(el.text()).toBe(`SIRES ${__APP_VERSION_SIRES__}`);
    expect(el.attributes('title')).toBe(el.text());
    expect(el.text()).not.toContain('v2.0.0');
  });
});
