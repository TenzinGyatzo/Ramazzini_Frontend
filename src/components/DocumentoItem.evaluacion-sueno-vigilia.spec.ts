import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';
import { calcularResultadoEvaluacionSuenoVigilia } from '@/helpers/evaluacionSuenoVigilia';

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

describe('DocumentoItem - Evaluación de sueño y vigilia', () => {
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
        documentoTipo: 'evaluacionSuenoVigilia',
        toggleRouteSelection: vi.fn(),
        isDeletionMode: false,
        isSelected: false,
        evaluacionSuenoVigilia: {
          _id: 'doc-1',
          fechaEvaluacionSuenoVigilia: '2026-10-04T07:00:00.000Z',
          rutaPDF: 'expedientes-medicos/x',
          estado: 'borrador',
          resultado,
        },
      },
    });
  }

  const nunca = { sueno: {}, vigilia: {} } as any;
  for (const clave of [
    'suenoSuperficial',
    'despertarSinDescanso',
    'suenoInsuficiente',
    'conciliacionTardia',
    'despertarNocturno',
    'despertarTemprano',
  ]) {
    nunca.sueno[clave] = 0;
  }
  for (const clave of [
    'esfuerzoNoDormirse',
    'suenoInvoluntario',
    'faltaEnergia',
    'interrupcionPorAgotamiento',
    'dificultadAtencion',
    'erroresUOlvidos',
  ]) {
    nunca.vigilia[clave] = 0;
  }
  const seguridadNegada = {
    ronquidoFuerte: 'No',
    pausasRespiratorias: 'No',
    despertarConAhogo: 'No',
    suenoActividadPeligrosa: 'No',
    accidenteOCasiAccidente: 'No',
  };

  it('muestra la prioridad guardada y la alerta más grave en la fila', () => {
    const wrapper = montar(
      calcularResultadoEvaluacionSuenoVigilia({
        ...nunca,
        minutosSuenoDiarios: 300,
        seguridad: { ...seguridadNegada, ronquidoFuerte: 'Sí', suenoActividadPeligrosa: 'Sí' },
      }),
    );

    expect(wrapper.text()).toContain('Evaluación de sueño y vigilia');
    const resultado = wrapper.find('p.text-red-600');
    expect(resultado.exists()).toBe(true);
    // Solo la alerta más grave; las informativas (sueño corto) no salen en la fila
    expect(resultado.text()).toBe(
      'Síntomas frecuentes o alerta de seguridad · Somnolencia en actividad peligrosa',
    );
  });

  it('sin síntomas muestra solo el título en verde', () => {
    const wrapper = montar(
      calcularResultadoEvaluacionSuenoVigilia({ ...nunca, seguridad: seguridadNegada }),
    );
    const resultado = wrapper.find('p.text-green-600');
    expect(resultado.exists()).toBe(true);
    expect(resultado.text()).toBe('Sin síntomas ni alertas reportadas');
  });

  it('avisa cuando la evaluación guardada está incompleta', () => {
    const wrapper = montar(calcularResultadoEvaluacionSuenoVigilia(nunca));
    expect(wrapper.find('p.text-green-600').text()).toBe(
      'Sin síntomas ni alertas reportadas · incompleta',
    );
  });

  it('un documento sin resultado no rompe la fila', () => {
    const wrapper = montar(undefined);
    expect(wrapper.text()).toContain('Sin resultado');
  });
});
