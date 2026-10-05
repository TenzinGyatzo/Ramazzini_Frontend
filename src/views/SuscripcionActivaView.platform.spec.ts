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
    const uso = wrapper.find('[data-testid="suscripcion-uso"]').text();
    expect(uso).toMatch(/10\s*de 50/);
    expect(uso).toContain('20% usado');
    expect(uso).toContain('40 disponibles');
    expect(wrapper.find('[data-testid="suscripcion-estado-general"]').text()).toBe('Sin plan');
    expect(wrapper.find('[data-testid="suscripcion-desglose-historias"]').exists()).toBe(false);
  });

  it('con HC asignadas: límite total y desglose contratado / extra', async () => {
    const wrapper = await mountWith({
      maxHistoriasPermitidasAlMes: 50,
      limiteHistoriasManual: 200,
      limiteHistoriasEfectivo: 200,
    });
    const uso = wrapper.find('[data-testid="suscripcion-uso"]').text();
    expect(uso).toMatch(/10\s*de 200/);
    expect(uso).toContain('190 disponibles');
    const desglose = wrapper.find('[data-testid="suscripcion-desglose-historias"]').text();
    expect(desglose).toMatch(/Incluidas en tu plan\s*50/);
    expect(desglose).toMatch(/De cortesía de Ramazzini\s*\+150/);
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
    expect(wrapper.find('[data-testid="suscripcion-periodo-gratuito"]').text()).toMatch(
      /Periodo gratuito\s*Hasta el .*días restantes/,
    );
    expect(wrapper.find('[data-testid="suscripcion-estado-general"]').text()).toBe('Periodo gratuito');
    expect(wrapper.find('[data-testid="suscripcion-periodo-ajustado"]').text()).toContain(
      'originalmente hasta el',
    );
  });

  it('sin pago en línea: contacto con Ramazzini en lugar de «Comenzar con un Plan»', async () => {
    const wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25 });
    expect(wrapper.text()).not.toContain('Comenzar con un Plan');
    const contacto = wrapper.find('[data-testid="suscripcion-contacto-ramazzini"]');
    expect(wrapper.text()).toContain('se gestiona directamente con Ramazzini');
    expect(contacto.find('a[href^="https://wa.me/526681702850"]').exists()).toBe(true);
    expect(contacto.find('a[href^="mailto:soporte@ramazzini.app"]').exists()).toBe(true);
  });

  it('con pago en línea: botón de planes como siempre', async () => {
    const wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25, pagoEnLineaHabilitado: true });
    expect(wrapper.text()).toContain('Comenzar con un Plan');
    expect(wrapper.find('[data-testid="suscripcion-contacto-ramazzini"]').exists()).toBe(false);
  });

  it('uso: la barra cambia de color al acercarse y al llegar al límite, con un solo aviso', async () => {
    let wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 50 }, 10);
    expect(wrapper.find('[role="progressbar"] div').classes()).toContain('bg-emerald-500');
    expect(wrapper.find('[role="status"]').exists()).toBe(false);

    wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 50 }, 45);
    expect(wrapper.find('[role="progressbar"] div').classes()).toContain('bg-amber-500');
    expect(wrapper.find('[data-testid="suscripcion-aviso-cerca-limite"]').exists()).toBe(true);

    wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 50 }, 50);
    expect(wrapper.find('[role="progressbar"] div').classes()).toContain('bg-red-500');
    expect(wrapper.find('[data-testid="suscripcion-aviso-limite"]').exists()).toBe(true);
    expect(wrapper.findAll('[role="status"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('0 disponibles');
  });

  it('Mercado Pago: el estado se muestra en español y cancelar es un enlace discreto', async () => {
    const wrapper = await mountWith({
      maxHistoriasPermitidasAlMes: 25,
      pagoEnLineaHabilitado: true,
      estadoSuscripcion: 'authorized',
    });
    const tarjeta = wrapper.find('[data-testid="suscripcion-mercado-pago"]').text();
    expect(tarjeta).toContain('Activa');
    expect(tarjeta).not.toContain('authorized');
    // Sin suscripción cargada desde Mercado Pago no hay nada que cancelar
    expect(wrapper.find('[data-testid="suscripcion-cancelar"]').exists()).toBe(false);
  });

  describe('periodo gratuito sin plan contratado', () => {
    const enDias = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();
    const enPrueba = (diasRestantes: number, extra: Record<string, unknown> = {}) => ({
      maxHistoriasPermitidasAlMes: 25,
      periodoDePruebaFinalizado: false,
      fechaInicioTrial: enDias(diasRestantes - 15),
      fechaFinTrial: enDias(diasRestantes),
      ...extra,
    });

    it('la tarjeta principal muestra los días restantes en lugar de «Sin plan activo»', async () => {
      const wrapper = await mountWith(enPrueba(10.5));
      const tarjeta = wrapper.find('[data-testid="suscripcion-periodo-gratuito-tarjeta"]');
      expect(tarjeta.text()).toContain('Periodo gratuito');
      expect(tarjeta.text()).toContain('10 días restantes');
      expect(tarjeta.text()).toMatch(/Historias al mes incluidas\s*25/);
      expect(tarjeta.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('30');
      expect(wrapper.text()).not.toContain('Sin plan activo');
      expect(wrapper.find('[data-testid="suscripcion-mercado-pago"]').exists()).toBe(false);
      // Todavía falta: sin aviso
      expect(wrapper.find('[role="status"]').exists()).toBe(false);
    });

    it('avisa en los últimos días, con la acción que corresponde', async () => {
      let wrapper = await mountWith(enPrueba(3.5));
      let aviso = wrapper.find('[data-testid="suscripcion-aviso-prueba-por-terminar"]');
      expect(aviso.text()).toContain('Tu periodo gratuito termina en 3 días');
      expect(aviso.find('a[href^="https://wa.me/"]').exists()).toBe(true);

      wrapper = await mountWith(enPrueba(1.5, { pagoEnLineaHabilitado: true }));
      aviso = wrapper.find('[data-testid="suscripcion-aviso-prueba-por-terminar"]');
      expect(aviso.text()).toContain('termina mañana');
      expect(aviso.find('button').text()).toBe('Ver planes');

      wrapper = await mountWith(enPrueba(0.5));
      expect(wrapper.find('[data-testid="suscripcion-aviso-prueba-por-terminar"]').text()).toContain('termina hoy');
      expect(wrapper.find('[data-testid="suscripcion-periodo-gratuito-tarjeta"]').text()).toContain('Termina hoy');
    });

    it('terminado sin contratar: lo dice claro y lleva a contratar', async () => {
      const wrapper = await mountWith({
        maxHistoriasPermitidasAlMes: 25,
        periodoDePruebaFinalizado: true,
        fechaInicioTrial: enDias(-20),
        fechaFinTrial: enDias(-5),
      });
      expect(wrapper.find('[data-testid="suscripcion-sin-plan"]').text()).toContain('Tu periodo gratuito terminó');
      expect(wrapper.find('[data-testid="suscripcion-aviso-prueba-terminada"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="suscripcion-estado-general"]').text()).toBe('Sin plan');
      expect(wrapper.find('[data-testid="suscripcion-periodo-gratuito-tarjeta"]').exists()).toBe(false);
    });

    it('con plan contratado el periodo gratuito no ocupa la tarjeta ni avisa', async () => {
      const wrapper = await mountWith(
        enPrueba(2.5, {
          contrato: {
            plan: 'basico',
            historiasMes: 50,
            periodicidad: 'anual',
            fechaInicio: '2026-01-01T00:00:00.000Z',
            estado: 'activo',
            pagadoHasta: enDias(200),
          },
        }),
      );
      expect(wrapper.find('[data-testid="suscripcion-periodo-gratuito-tarjeta"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="suscripcion-aviso-prueba-por-terminar"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="suscripcion-contrato"]').exists()).toBe(true);
    });
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
      expect(tarjeta.text()).toContain('+20 de cortesía');
      expect(wrapper.find('[data-testid="suscripcion-estado-general"]').text()).toBe('Activa');
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
      expect(wrapper.find('[data-testid="suscripcion-estado-general"]').text()).toBe('Vencida');
      expect(wrapper.find('[data-testid="suscripcion-contrato-vigencia"]').text()).toContain('Venció el');
      wrapper = await mountWith({ maxHistoriasPermitidasAlMes: 25, contrato: contrato({ renovacionAutomatica: true }) });
      expect(wrapper.find('[data-testid="suscripcion-contrato-vigencia"]').text()).toContain('Renovación automática');
    });
  });
});
