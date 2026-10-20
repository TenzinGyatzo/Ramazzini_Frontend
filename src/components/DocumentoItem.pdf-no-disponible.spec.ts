import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import axios from 'axios';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { useUserStore } from '@/stores/user';
import { ROLE_DEFAULT_PERMISSIONS } from '@/constants/rolePermissionPolicy';

vi.mock('@vue-pdf-viewer/viewer', () => ({
  Locales: {},
  useLicense: vi.fn(),
  ZoomLevel: {},
  VPdfViewer: { name: 'VPdfViewer', template: '<div />' },
}));

// La verificación de disponibilidad corre en cuanto se monta el documento
vi.mock('@/composables/usePdfAvailabilityQueue', () => ({
  enqueuePdfAvailabilityCheck: (task: () => Promise<void>) => {
    void task();
  },
}));

vi.mock('@/composables/usePdfGenerationTracker', () => ({
  usePdfGenerationTracker: () => ({
    isGenerating: { value: false },
    track: vi.fn(),
  }),
}));

const consultarArchivoClinico = vi.fn();
vi.mock('@/lib/clinicalFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/clinicalFiles')>()),
  consultarArchivoClinico: (...args: unknown[]) => consultarArchivoClinico(...args),
}));

const { default: DocumentoItem } = await import('./DocumentoItem.vue');

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

const antidoping = {
  _id: 'ad-1',
  estado: 'finalizado',
  fechaAntidoping: '2026-09-01T00:00:00.000Z',
  rutaPDF: 'expedientes-medicos/Empresa/Centro/Juan_507f1f77bcf86cd799439014',
  updatedAt: '2026-09-01T00:00:00.000Z',
};
const rutaPdf = `${antidoping.rutaPDF}/Antidoping 01-09-2026.pdf`;

describe('DocumentoItem - PDF que ya no está', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    consultarArchivoClinico.mockReset();
    pinia = createPinia();
    setActivePinia(pinia);
    await router.push('/');
    await router.isReady();

    useProveedorSaludStore().proveedorSalud = {
      _id: 'prov-1',
      periodoDePruebaFinalizado: false,
      estadoSuscripcion: 'active',
    } as any;
    useUserStore().user = {
      _id: 'u1',
      username: 'medico',
      email: 'medico@test.com',
      role: 'Médico',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Médico'] },
    } as any;
  });

  const montar = () =>
    mount(DocumentoItem, {
      global: {
        plugins: [pinia, router],
        provide: { toast: { open: vi.fn() } },
        stubs: {
          BadgeNotaAclaratoria: true,
          EstadoDocumentoBadge: true,
          ModalPdfEliminado: true,
          DocumentHoverPreview: true,
          Teleport: true,
          VPdfViewer: true,
        },
      },
      props: {
        antidoping,
        documentoTipo: 'antidoping',
        documentoId: 'ad-1',
        isSelected: false,
        toggleRouteSelection: vi.fn(),
      },
    });

  it('si la verificación confirmó que no existe, el aviso aparece sin pedir el PDF', async () => {
    consultarArchivoClinico.mockResolvedValue('ausente');
    const get = vi.spyOn(axios, 'get');

    const wrapper = montar();
    await flushPromises();
    expect(consultarArchivoClinico).toHaveBeenCalledWith(rutaPdf, expect.anything());

    await wrapper.find('[data-abrir-documento]').trigger('click');

    expect(get).not.toHaveBeenCalled();
    expect(wrapper.findComponent({ name: 'ModalPdfEliminado' }).exists()).toBe(true);
  });

  it('si no se pudo verificar, al abrir se pide el PDF como siempre', async () => {
    consultarArchivoClinico.mockResolvedValue('sin-verificar');
    const get = vi.spyOn(axios, 'get').mockRejectedValue(new Error('sin conexión'));

    const wrapper = montar();
    await flushPromises();

    await wrapper.find('[data-abrir-documento]').trigger('click');
    await flushPromises();

    expect(get).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent({ name: 'ModalPdfEliminado' }).exists()).toBe(false);
  });
});
