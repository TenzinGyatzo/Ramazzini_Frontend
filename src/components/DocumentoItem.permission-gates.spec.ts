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

describe('DocumentoItem - permission gates (finalizar / anular / editar)', () => {
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

  it('Técnico + notaMedica borrador: sin Finalizar; Editar y Eliminar disabled', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'tec',
      email: 'tec@test.com',
      role: 'Técnico Evaluador',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Técnico Evaluador'] },
    } as any;

    const wrapper = mountDocumentoItem({
      notaMedica: {
        _id: 'nm-1',
        estado: 'borrador',
        fechaNotaMedica: new Date().toISOString(),
      },
      documentoTipo: 'notaMedica',
      documentoId: 'nm-1',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(false);

    expect(wrapper.find('.documento-item-action--edit').exists()).toBe(false);
    expect(wrapper.find('button.documento-item-action--disabled').exists()).toBe(true);

    const deleteBtn = wrapper
      .findAll('button.documento-item-action')
      .find((b) => b.find('i.fa-trash-can').exists() || b.find('i.fa-file-circle-xmark').exists());
    expect(deleteBtn).toBeTruthy();
    expect(deleteBtn!.attributes('disabled')).toBeDefined();
  });

  it('Técnico + notaMedica finalizado: Ver habilitado; Anular disabled', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'tec',
      email: 'tec@test.com',
      role: 'Técnico Evaluador',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Técnico Evaluador'] },
    } as any;

    const wrapper = mountDocumentoItem({
      notaMedica: {
        _id: 'nm-readonly',
        estado: 'finalizado',
        fechaNotaMedica: new Date().toISOString(),
      },
      documentoTipo: 'notaMedica',
      documentoId: 'nm-readonly',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    const viewBtn = wrapper.find('.documento-item-action--edit');
    expect(viewBtn.exists()).toBe(true);
    expect(viewBtn.attributes('disabled')).toBeUndefined();
    expect(viewBtn.find('i.fa-eye').exists()).toBe(true);

    const anularBtn = wrapper
      .findAll('button.documento-item-action')
      .find((b) => b.find('i.fa-file-circle-xmark').exists());
    expect(anularBtn).toBeTruthy();
    expect(anularBtn!.attributes('disabled')).toBeDefined();
  });

  it('Técnico + audiometria borrador: Finalizar visible', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'tec',
      email: 'tec@test.com',
      role: 'Técnico Evaluador',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Técnico Evaluador'] },
    } as any;

    const wrapper = mountDocumentoItem({
      audiometria: {
        _id: 'au-1',
        estado: 'borrador',
        fechaAudiometria: new Date().toISOString(),
      },
      documentoTipo: 'audiometria',
      documentoId: 'au-1',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(true);
    expect(wrapper.find('.documento-item-action--edit').exists()).toBe(true);
  });

  it('Técnico + audiometria finalizado: Anular habilitado', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u1',
      username: 'tec',
      email: 'tec@test.com',
      role: 'Técnico Evaluador',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Técnico Evaluador'] },
    } as any;

    const wrapper = mountDocumentoItem({
      audiometria: {
        _id: 'au-2',
        estado: 'finalizado',
        fechaAudiometria: new Date().toISOString(),
      },
      documentoTipo: 'audiometria',
      documentoId: 'au-2',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(false);

    const anularBtn = wrapper
      .findAll('button.documento-item-action')
      .find((b) => b.find('i.fa-file-circle-xmark').exists());
    expect(anularBtn).toBeTruthy();
    expect(anularBtn!.attributes('disabled')).toBeUndefined();
    expect(anularBtn!.classes()).toContain('documento-item-action--delete');
  });

  it('Médico + notaMedica borrador: Finalizar visible', () => {
    const userStore = useUserStore();
    userStore.user = {
      _id: 'u2',
      username: 'med',
      email: 'med@test.com',
      role: 'Médico',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Médico'] },
    } as any;

    const wrapper = mountDocumentoItem({
      notaMedica: {
        _id: 'nm-2',
        estado: 'borrador',
        fechaNotaMedica: new Date().toISOString(),
      },
      documentoTipo: 'notaMedica',
      documentoId: 'nm-2',
      isSelected: false,
      toggleRouteSelection: vi.fn(),
    });

    expect(wrapper.find('.documento-item-action--finalize').exists()).toBe(true);
    expect(wrapper.find('.documento-item-action--edit').exists()).toBe(true);
  });
});
