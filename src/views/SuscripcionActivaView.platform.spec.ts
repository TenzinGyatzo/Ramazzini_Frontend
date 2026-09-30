import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const { default: SuscripcionActivaView } = await import('./SuscripcionActivaView.vue');

describe('SuscripcionActivaView: contratado vs. asignado por Ramazzini', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  const mountWith = async (proveedor: Record<string, unknown>, historiasDelMes = 10) => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = { nombre: 'Clínica', pais: 'MX', addOns: [], ...proveedor } as any;
    vi.spyOn(store, 'getHistoriasClinicasDelMes').mockResolvedValue(historiasDelMes as any);
    // La vista recarga el proveedor al montarse: se devuelve el mismo de la prueba
    vi.spyOn(store, 'getProveedorById').mockImplementation(async () => store.proveedorSalud as any);
    const wrapper = mount(SuscripcionActivaView, {
      global: {
        plugins: [pinia],
        provide: { toast: { open: vi.fn() } },
        stubs: { ModalCancelarSuscripcion: true, Transition: false },
      },
    });
    await flushPromises();
    return wrapper;
  };

  it('sin ajustes: muestra lo contratado, sin desglose', async () => {
    const wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 50 });
    expect(wrapper.text()).toContain('10 de 50 permitidas');
    expect(wrapper.text()).toContain('40 disponibles');
    expect(wrapper.find('[data-testid="suscripcion-desglose-historias"]').exists()).toBe(false);
  });

  it('con HC asignadas: límite total y desglose contratado / extra', async () => {
    const wrapper = await mountWith({
      maxHistoriasPermitidasAlMes: 50,
      limiteHistoriasManual: 200,
      limiteHistoriasEfectivo: 200,
    });
    expect(wrapper.text()).toContain('10 de 200 permitidas');
    expect(wrapper.text()).toContain('190 disponibles');
    const desglose = wrapper.find('[data-testid="suscripcion-desglose-historias"]').text();
    expect(desglose).toContain('Contratadas en tu plan: 50');
    expect(desglose).toContain('Extra asignadas por Ramazzini: +150');
  });

  it('periodo gratuito extendido: muestra la fecha nueva y la original', async () => {
    const fin = new Date();
    fin.setDate(fin.getDate() + 20);
    const wrapper = await mountWith({
      maxHistoriasPermitidasAlMes: 25,
      fechaInicioTrial: '2026-01-01T12:00:00.000Z',
      fechaFinTrial: fin.toISOString(),
      periodoDePruebaFinalizado: false,
    });
    expect(wrapper.text()).toMatch(/Periodo Gratuito:\s*Hasta el .*días restantes/);
    expect(wrapper.find('[data-testid="suscripcion-periodo-ajustado"]').text()).toContain(
      'originalmente hasta el',
    );
  });
});
