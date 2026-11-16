import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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
vi.mock('@/composables/usePdfAvailabilityQueue', () => ({ enqueuePdfAvailabilityCheck: vi.fn() }));
vi.mock('@/composables/usePdfGenerationTracker', () => ({
  usePdfGenerationTracker: () => ({ isGenerating: { value: false }, track: vi.fn() }),
}));

// Borradores de nota médica: la nota «nm-vieja» es un borrador antiguo
const pendientes: Record<string, { nivelUrgencia: string }> = {
  'nm-vieja': { nivelUrgencia: 'warning' },
  'nm-muy-vieja': { nivelUrgencia: 'critical' },
};
vi.mock('@/composables/useBorradoresNotaMedica', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/composables/useBorradoresNotaMedica')>();
  return {
    ...original,
    useBorradoresNotaMedica: () => ({
      ...original.useBorradoresNotaMedica(),
      borradoresHabilitados: { value: true },
      getBorradorPendiente: (id: string) => pendientes[id] ?? null,
    }),
  };
});

const { default: DocumentoItem } = await import('./DocumentoItem.vue');

const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] });

const nota = (id: string) => ({
  _id: id,
  estado: 'borrador',
  tipoNota: 'Inicial',
  fechaNotaMedica: '2026-11-13T00:00:00.000Z',
  rutaPDF: 'expedientes-medicos/Empresa/Centro/Juan_507f1f77bcf86cd799439014',
  updatedAt: '2026-11-13T00:00:00.000Z',
});

describe('DocumentoItem — insignias de la nota médica en borrador (punto 36)', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    await router.push('/');
    await router.isReady();
    useProveedorSaludStore().proveedorSalud = {
      _id: 'prov-1',
      pais: 'MX',
      periodoDePruebaFinalizado: false,
      estadoSuscripcion: 'active',
      regulatoryPolicy: { regime: 'SIRES_NOM024', features: { documentImmutabilityEnabled: true } },
    } as any;
    useUserStore().user = {
      _id: 'u1',
      role: 'Médico',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Médico'] },
    } as any;
  });

  const montar = (id: string) =>
    mount(DocumentoItem, {
      global: {
        plugins: [pinia, router],
        provide: { toast: { open: vi.fn() } },
        stubs: {
          BadgeNotaAclaratoria: true,
          EstadoDocumentoBadge: { template: '<span data-estado-documento />' },
          ModalPdfEliminado: true,
          DocumentHoverPreview: true,
          Teleport: true,
          VPdfViewer: true,
        },
      },
      props: {
        notaMedica: nota(id),
        documentoTipo: 'notaMedica',
        documentoId: id,
        isSelected: false,
        toggleRouteSelection: vi.fn(),
      },
    });

  it('un borrador antiguo muestra solo «Borrador antiguo», en lugar de la insignia azul', async () => {
    const w = montar('nm-vieja');
    await flushPromises();
    expect(w.find('[data-borrador-pendiente]').text()).toBe('Borrador antiguo');
    expect(w.find('[data-estado-documento]').exists()).toBe(false);
  });

  it('14 días o más: «Borrador sin finalizar» (sigue diciendo que es borrador)', async () => {
    const w = montar('nm-muy-vieja');
    await flushPromises();
    expect(w.find('[data-borrador-pendiente]').text()).toBe('Borrador sin finalizar');
    expect(w.find('[data-estado-documento]').exists()).toBe(false);
  });

  it('un borrador reciente sigue con la insignia azul de siempre', async () => {
    const w = montar('nm-reciente');
    await flushPromises();
    expect(w.find('[data-borrador-pendiente]').exists()).toBe(false);
    expect(w.find('[data-estado-documento]').exists()).toBe(true);
  });
});
