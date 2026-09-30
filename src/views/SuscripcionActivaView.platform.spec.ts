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
    expect(desglose).toContain('De cortesía de Ramazzini: +150');
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

  it('sin pago en línea: contacto con Ramazzini en lugar de «Comenzar con un Plan»', async () => {
    const wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25 });
    expect(wrapper.text()).not.toContain('Comenzar con un Plan');
    const contacto = wrapper.find('[data-testid="suscripcion-contacto-ramazzini"]');
    expect(contacto.text()).toContain('se gestiona directamente con Ramazzini');
    expect(contacto.find('a[href^="https://wa.me/526681702850"]').exists()).toBe(true);
    expect(contacto.find('a[href^="mailto:soporte@ramazzini.app"]').exists()).toBe(true);
  });

  it('con pago en línea: botón de planes como siempre', async () => {
    const wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25, pagoEnLineaHabilitado: true });
    expect(wrapper.text()).toContain('Comenzar con un Plan');
    expect(wrapper.find('[data-testid="suscripcion-contacto-ramazzini"]').exists()).toBe(false);
  });

  describe('plan contratado con Ramazzini', () => {
    const contrato = (extra: Record<string, unknown> = {}) => ({
      plan: 'profesional',
      historiasMes: 150,
      periodicidad: 'mensual',
      fechaInicio: '2026-01-01T00:00:00.000Z',
      estado: 'activo',
      ...extra,
    });
    const enDias = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

    it('muestra plan, HC con cortesía y vigencia, sin monto ni tarjeta de Mercado Pago', async () => {
      const wrapper = await mountWith({
        maxHistoriasPermitidasAlMes: 25,
        historiasCortesia: 20,
        limiteHistoriasEfectivo: 170,
        contrato: contrato({ pagadoHasta: enDias(20) }),
      });
      const tarjeta = wrapper.find('[data-testid="suscripcion-contrato"]');
      expect(tarjeta.text()).toContain('Plan Profesional');
      expect(tarjeta.text()).toContain('150');
      expect(tarjeta.text()).toContain('(+20 de cortesía)');
      expect(tarjeta.find('[data-testid="suscripcion-contrato-vigencia"]').text()).toContain('Vigente hasta el');
      expect(tarjeta.text()).not.toMatch(/\$|MXN|Pago mensual/);
      expect(wrapper.text()).not.toContain('Sin plan activo');
      expect(wrapper.find('[data-testid="suscripcion-contrato-aviso"]').exists()).toBe(false);
    });

    it('aviso en los últimos días (mensual: 7)', async () => {
      const wrapper = await mountWith({
        maxHistoriasPermitidasAlMes: 25,
        contrato: contrato({ pagadoHasta: enDias(4.5) }),
      });
      expect(wrapper.find('[data-testid="suscripcion-contrato-aviso"]').text()).toContain('Tu plan vence en 5 días');
    });

    it('vencido y renovación automática', async () => {
      let wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25, contrato: contrato({ pagadoHasta: enDias(-2) }) });
      expect(wrapper.find('[data-testid="suscripcion-contrato-vencido"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="suscripcion-contrato-vigencia"]').text()).toContain('Venció el');
      wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25, contrato: contrato({ renovacionAutomatica: true }) });
      expect(wrapper.find('[data-testid="suscripcion-contrato-vigencia"]').text()).toContain('Renovación automática');
    });
  });
});
