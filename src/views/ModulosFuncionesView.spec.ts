import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useUserStore } from '@/stores/user';
import { useInventarioStore } from '@/stores/inventario';

const { getEstado, actualizarSemaforizacion, actualizarConfiguracionFirma, updateConfiguracionInventario } = vi.hoisted(() => ({
  getEstado: vi.fn(),
  actualizarSemaforizacion: vi.fn(),
  actualizarConfiguracionFirma: vi.fn(),
  updateConfiguracionInventario: vi.fn(),
}));
vi.mock('@/api/ModulosFuncionesAPI', () => ({ default: { getEstado, actualizarSemaforizacion } }));
vi.mock('@/api/FormatosFirmadosAPI', () => ({ default: { actualizarConfiguracion: actualizarConfiguracionFirma } }));
vi.mock('@/api/InventarioAPI', () => ({ default: { updateConfiguracion: updateConfiguracionInventario, getConfiguracion: vi.fn() } }));

import ModulosFuncionesView from './ModulosFuncionesView.vue';

const ESTADO = {
  firmaEnPantallaHabilitada: true,
  semaforizacionActivada: false,
  inventarioHabilitado: false,
  inventarioControlaAntidoping: false,
};
const toast = { open: vi.fn() };

function montar() {
  return mount(ModulosFuncionesView, {
    global: { provide: { toast }, stubs: { RouterLink: { template: '<a><slot /></a>' } } },
  });
}

const interruptor = (w: ReturnType<typeof montar>, cual: string) => w.find(`[data-interruptor="${cual}"] [role="switch"]`);

describe('ModulosFuncionesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    useUserStore().user = { _id: 'u1', role: 'Principal' } as any;
    getEstado.mockResolvedValue({ data: { ...ESTADO } });
  });

  it('muestra primero las funciones y después los módulos, con su estado', async () => {
    const w = montar();
    await flushPromises();
    const secciones = w.findAll('h2').map((h) => h.text());
    expect(secciones[0]).toMatch(/^Funciones/);
    expect(secciones[1]).toMatch(/^Módulos/);
    expect(w.findAll('[data-interruptor]').map((t) => t.attributes('data-interruptor'))).toEqual([
      'firma',
      'semaforizacion',
      'inventario',
    ]);
    expect(interruptor(w, 'firma').attributes('aria-checked')).toBe('true');
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('false');
  });

  it('cada interruptor se guarda al instante por su ruta', async () => {
    actualizarSemaforizacion.mockResolvedValue({ data: { ...ESTADO, semaforizacionActivada: true } });
    actualizarConfiguracionFirma.mockResolvedValue({ data: { firmaEnPantallaHabilitada: false } });
    updateConfiguracionInventario.mockResolvedValue({ data: { inventarioHabilitado: true } });
    const w = montar();
    await flushPromises();

    await interruptor(w, 'semaforizacion').trigger('click');
    await flushPromises();
    expect(actualizarSemaforizacion).toHaveBeenCalledWith(true);
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('true');

    await interruptor(w, 'firma').trigger('click');
    await flushPromises();
    expect(actualizarConfiguracionFirma).toHaveBeenCalledWith({ firmaEnPantallaHabilitada: false });

    await interruptor(w, 'inventario').trigger('click');
    await flushPromises();
    expect(updateConfiguracionInventario).toHaveBeenCalledWith({ inventarioHabilitado: true });
    expect(useInventarioStore().habilitado).toBe(true);
    expect(w.find('[data-interruptor="inventario"]').text()).toContain('Catálogo de insumos');
  });

  it('si falla, se queda como estaba y lo avisa', async () => {
    actualizarSemaforizacion.mockRejectedValue({ response: { data: { message: 'Sin permiso' } } });
    const w = montar();
    await flushPromises();
    await interruptor(w, 'semaforizacion').trigger('click');
    await flushPromises();
    expect(interruptor(w, 'semaforizacion').attributes('aria-checked')).toBe('false');
    expect(toast.open).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('quien no es Principal la ve, pero no cambia nada', async () => {
    useUserStore().user = { _id: 'u2', role: 'Médico' } as any;
    const w = montar();
    await flushPromises();
    expect(interruptor(w, 'firma').attributes('disabled')).toBeDefined();
    expect(w.text()).toContain('Solo el usuario Principal los cambia');
  });
});
