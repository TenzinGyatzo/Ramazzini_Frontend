import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularResultadoCuestionarioNordico } from '@/helpers/cuestionarioNordico';

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

describe('DocumentoItem - Cuestionario Nórdico', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    await router.push('/');
    await router.isReady();

    useProveedorSaludStore().proveedorSalud = {
      _id: 'prov-1',
      periodoDePruebaFinalizado: false,
      estadoSuscripcion: 'active',
    } as any;
  });

  function montar(resultado: unknown) {
    return mount(DocumentoItem, {
      global: {
        plugins: [pinia, router],
        provide: { toast: { open: vi.fn() } },
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
      props: {
        documentoId: 'doc-1',
        documentoTipo: 'cuestionarioNordico',
        toggleRouteSelection: vi.fn(),
        isDeletionMode: false,
        isSelected: false,
        cuestionarioNordico: {
          _id: 'doc-1',
          fechaCuestionarioNordico: '2026-10-03T07:00:00.000Z',
          rutaPDF: 'expedientes-medicos/x',
          estado: 'borrador',
          resultado,
        },
      },
    });
  }

  it('muestra el resultado guardado por el servidor en la fila', () => {
    const wrapper = montar(
      calcularResultadoCuestionarioNordico({
        cuello: { molestia12Meses: 'Sí', intensidad: 3 },
        espaldaBaja: { molestia12Meses: 'Sí', molestia7Dias: 'Sí', intensidad: 9 },
      }),
    );

    expect(wrapper.text()).toContain('Cuestionario Nórdico');
    const resultado = wrapper.find('p.text-red-600');
    expect(resultado.exists()).toBe(true);
    expect(resultado.text()).toBe(
      'Molestias con prioridad de seguimiento · 2 regiones · intensidad máx. 9/10',
    );
  });

  it('sin molestias muestra solo el título en verde', () => {
    const wrapper = montar(calcularResultadoCuestionarioNordico({}));
    const resultado = wrapper.find('p.text-green-600');
    expect(resultado.exists()).toBe(true);
    expect(resultado.text()).toBe('Sin molestias reportadas');
  });

  it('un documento sin resultado no rompe la fila', () => {
    const wrapper = montar(undefined);
    expect(wrapper.text()).toContain('Sin resultado');
  });
});
