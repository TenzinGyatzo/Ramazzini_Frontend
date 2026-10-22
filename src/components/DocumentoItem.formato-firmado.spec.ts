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

const { default: DocumentoItem } = await import('./DocumentoItem.vue');

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/', component: { template: '<div />' } }],
});

const externo = (cambios: Record<string, unknown> = {}) => ({
  _id: 'd1',
  nombreDocumento: 'Declaración de Veracidad',
  fechaDocumento: '2026-10-21T00:00:00.000Z',
  extension: '.pdf',
  notasDocumento: 'Firmado en pantalla',
  rutaDocumento: 'expedientes-medicos/Empresa/Centro/Juan_507f1f77bcf86cd799439014',
  estado: 'finalizado',
  idFormatoFirmado: 'f1',
  ...cambios,
});

describe('DocumentoItem - formato firmado en pantalla', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(async () => {
    pinia = createPinia();
    setActivePinia(pinia);
    await router.push('/');
    await router.isReady();
    // Sin régimen SIRES: los documentos externos normales se eliminan, no se anulan
    useProveedorSaludStore().proveedorSalud = {
      _id: 'prov-1',
      periodoDePruebaFinalizado: false,
      estadoSuscripcion: 'active',
    } as any;
    useUserStore().user = {
      _id: 'u1',
      username: 'medico',
      role: 'Médico',
      permisos: { ...ROLE_DEFAULT_PERMISSIONS['Médico'] },
    } as any;
  });

  const montar = (documentoExterno: Record<string, unknown>, props: Record<string, unknown> = {}) =>
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
        documentoExterno,
        documentoTipo: 'documentoExterno',
        documentoId: String(documentoExterno._id),
        isSelected: false,
        toggleRouteSelection: vi.fn(),
        ...props,
      },
    });

  it('finalizado: lleva el ícono de firma junto al título, no se edita y el botón rojo lo anula con su formato', async () => {
    const w = montar(externo());
    await flushPromises();

    const icono = w.find('h3 .documento-item-firmado-pantalla');
    expect(icono.find('.fa-signature').exists()).toBe(true);
    expect(icono.text()).toBe('');
    expect(icono.attributes('aria-label')).toBe('Firmado por el trabajador en pantalla');
    const acciones = w.findAll('button.documento-item-action');
    const editar = acciones.find((b) => b.find('.fa-pen-to-square, .fa-eye').exists())!;
    expect(editar.attributes('disabled')).toBeDefined();

    const anular = acciones.find((b) => b.find('.fa-file-circle-xmark').exists())!;
    expect(anular.attributes('disabled')).toBeUndefined();
    await anular.trigger('click');
    expect(w.emitted('abrirModalAnular')).toEqual([['d1', 'Declaración de Veracidad', 'documentoExterno', 'f1']]);
    expect(w.emitted('eliminarDocumento')).toBeUndefined();
  });

  it('anulado: el ícono en rojo lo dice y ya no hay nada que anular', async () => {
    const w = montar(externo({ estado: 'anulado', razonAnulacion: 'Firmó la persona equivocada' }));
    await flushPromises();

    const icono = w.find('h3 .documento-item-firmado-pantalla');
    expect(icono.classes()).toContain('documento-item-firmado-pantalla--anulado');
    expect(icono.attributes('title')).toBe('Firmado en pantalla · anulado: Firmó la persona equivocada');
    const rojo = w.findAll('button.documento-item-action').at(-1)!;
    expect(rojo.attributes('disabled')).toBeDefined();
  });

  it('no se puede seleccionar para la eliminación masiva', async () => {
    const w = montar(externo(), { isDeletionMode: true });
    await flushPromises();
    expect(w.find('input[type="checkbox"]').attributes('disabled')).toBeDefined();
  });

  it('un documento externo normal sigue con su botón de eliminar', async () => {
    const w = montar(externo({ idFormatoFirmado: undefined, notasDocumento: '' }));
    await flushPromises();
    expect(w.find('.documento-item-firmado-pantalla').exists()).toBe(false);
    const rojo = w.findAll('button.documento-item-action').find((b) => b.find('.fa-trash-can').exists())!;
    await rojo.trigger('click');
    expect(w.emitted('eliminarDocumento')?.[0]?.[0]).toBe('d1');
  });
});
