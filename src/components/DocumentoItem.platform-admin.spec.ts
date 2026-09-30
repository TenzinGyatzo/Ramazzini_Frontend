import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { ROLE_DEFAULT_PERMISSIONS } from '@/constants/rolePermissionPolicy';

vi.mock('@vue-pdf-viewer/viewer', () => ({
  Locales: {},
  useLicense: vi.fn(),
  ZoomLevel: {},
  VPdfViewer: { name: 'VPdfViewer', template: '<div />' },
}));

vi.mock('@/composables/usePdfAvailabilityQueue', () => ({
  enqueuePdfAvailabilityCheck: vi.fn(),
}));

vi.mock('@/composables/usePdfGenerationTracker', () => ({
  usePdfGenerationTracker: () => ({
    isGenerating: { value: false },
    track: vi.fn(),
  }),
}));

// Import after mocks so DocumentoItem does not load real PDF viewer assets
const { default: DocumentoItem } = await import('./DocumentoItem.vue');

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

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

describe('DocumentoItem - Administrador de plataforma (no finaliza ni anula; solo borra borradores)', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    await router.push('/');
    await router.isReady();

    const proveedorSaludStore = useProveedorSaludStore();
    proveedorSaludStore.proveedorSalud = {
      _id: 'prov-1',
      periodoDePruebaFinalizado: false,
      estadoSuscripcion: 'active',
      regulatoryPolicy: createSiresPolicy(),
    } as any;
  });

  function mountDocumentoItem(props: Record<string, unknown>) {
    return mount(DocumentoItem, {
      global: {
        plugins: [pinia, router],
        provide: {
          toast: { open: vi.fn() },
        },
        stubs: {
          BadgeNotaAclaratoria: true,
          EstadoDocumentoBadge: true,
          ModalPdfEliminado: true,
          DocumentHoverPreview: true,
          Teleport: true,
          Transition: false,
          VPdfViewer: true,
        },
      },
      props,
    });
  }

  function asPlatformAdmin() {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'admin-1',
      username: 'admin',
      email: 'admin@test.com',
      role: 'Administrador',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Administrador'] },
      platformContext: {
        activeTenant: { id: 'prov-1', nombre: 'Clínica', regimenRegulatorio: 'SIRES_NOM024' },
      },
    } as any;
  }

  const deleteOrAnularButton = (wrapper: ReturnType<typeof mountDocumentoItem>) =>
    wrapper
      .findAll('button.documento-item-action')
      .find((b) => b.find('i.fa-trash-can').exists() || b.find('i.fa-file-circle-xmark').exists());

  it('borrador: sin botón Finalizar; Eliminar habilitado', () => {
    asPlatformAdmin();
    const wrapper = mountDocumentoItem({
      audiometria: { _id: 'au-1', estado: 'borrador', fechaAudiometria: new Date().toISOString() },
      documentoTipo: 'audiometria',
      documentoId: 'au-1',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(false);
    const btn = deleteOrAnularButton(wrapper);
    expect(btn).toBeTruthy();
    expect(btn!.attributes('disabled')).toBeUndefined();
  });

  it('finalizado: Anular deshabilitado', () => {
    asPlatformAdmin();
    const wrapper = mountDocumentoItem({
      audiometria: { _id: 'au-2', estado: 'finalizado', fechaAudiometria: new Date().toISOString() },
      documentoTipo: 'audiometria',
      documentoId: 'au-2',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    const btn = deleteOrAnularButton(wrapper);
    expect(btn).toBeTruthy();
    expect(btn!.attributes('disabled')).toBeDefined();
    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(false);
  });

  it('un Principal conserva Finalizar en borradores (sin cambio)', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'p1',
      username: 'principal',
      email: 'p@test.com',
      role: 'Principal',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Principal'] },
    } as any;
    const wrapper = mountDocumentoItem({
      audiometria: { _id: 'au-3', estado: 'borrador', fechaAudiometria: new Date().toISOString() },
      documentoTipo: 'audiometria',
      documentoId: 'au-3',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });
    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(true);
  });
});
