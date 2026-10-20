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

const fetchClinicalFileBlob = vi.fn();
const consultarArchivoClinico = vi.fn();
vi.mock('@/lib/clinicalFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/clinicalFiles')>()),
  consultarArchivoClinico: (...args: unknown[]) => consultarArchivoClinico(...args),
  fetchClinicalFileBlob: (...args: unknown[]) => fetchClinicalFileBlob(...args),
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
const pdfBlob = () => new Blob(['%PDF-1.4'], { type: 'application/pdf' });

/** Promesa que la prueba resuelve o rechaza cuando quiere. */
function pendiente<T>() {
  let resolver!: (valor: T) => void;
  let rechazar!: (error: unknown) => void;
  const promesa = new Promise<T>((res, rej) => {
    resolver = res;
    rechazar = rej;
  });
  return { promesa, resolver, rechazar };
}

describe('DocumentoItem - apertura del visor de PDF', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    fetchClinicalFileBlob.mockReset();
    consultarArchivoClinico.mockReset().mockResolvedValue('disponible');
    // jsdom no implementa URL de objetos
    URL.createObjectURL = vi.fn(() => 'blob:visor');
    URL.revokeObjectURL = vi.fn();
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

  it('el visor aparece con el indicador de carga antes de que llegue el PDF', async () => {
    const descarga = pendiente<unknown>();
    vi.spyOn(axios, 'get').mockReturnValue(descarga.promesa as any);
    const wrapper = montar();
    await flushPromises();

    await wrapper.find('[data-abrir-documento]').trigger('click');

    expect(wrapper.find('.documento-item-viewer').exists()).toBe(true);
    expect(wrapper.find('.visor-cargando').exists()).toBe(true);

    descarga.resolver({ status: 200, headers: { 'content-type': 'application/pdf' }, data: pdfBlob() });
    await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    await flushPromises();
    expect(wrapper.find('.documento-item-viewer').exists()).toBe(true);
  });

  it('si el PDF no existe, el visor de carga se cierra y aparece el aviso', async () => {
    const descarga = pendiente<unknown>();
    vi.spyOn(axios, 'get').mockReturnValue(descarga.promesa as any);
    const wrapper = montar();
    await flushPromises();

    await wrapper.find('[data-abrir-documento]').trigger('click');
    descarga.rechazar({ response: { status: 404 } });
    await flushPromises();

    expect(wrapper.find('.documento-item-viewer').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'ModalPdfEliminado' }).exists()).toBe(true);
  });

  it('si se cierra mientras carga, no se vuelve a abrir al llegar el PDF', async () => {
    const descarga = pendiente<unknown>();
    vi.spyOn(axios, 'get').mockReturnValue(descarga.promesa as any);
    const wrapper = montar();
    await flushPromises();

    await wrapper.find('[data-abrir-documento]').trigger('click');
    await wrapper.find('.documento-item-viewer').trigger('click');
    expect(wrapper.find('.documento-item-viewer').exists()).toBe(false);

    descarga.resolver({ status: 200, headers: { 'content-type': 'application/pdf' }, data: pdfBlob() });
    await flushPromises();
    expect(wrapper.find('.documento-item-viewer').exists()).toBe(false);
  });

  it('al abrir tras la vista previa reutiliza su descarga en lugar de pedir el PDF otra vez', async () => {
    vi.useFakeTimers();
    try {
      fetchClinicalFileBlob.mockResolvedValue(pdfBlob());
      const get = vi.spyOn(axios, 'get');
      const wrapper = montar();
      await flushPromises();

      const abrir = wrapper.find('[data-abrir-documento]');
      await abrir.trigger('mouseenter');
      await vi.advanceTimersByTimeAsync(700);
      expect(fetchClinicalFileBlob).toHaveBeenCalledWith(rutaPdf);

      await abrir.trigger('click');
      await flushPromises();

      await vi.waitFor(() => expect(URL.createObjectURL).toHaveBeenCalledTimes(2));
      expect(get).not.toHaveBeenCalled();
      expect(fetchClinicalFileBlob).toHaveBeenCalledTimes(1);
      expect(wrapper.find('.documento-item-viewer').exists()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
