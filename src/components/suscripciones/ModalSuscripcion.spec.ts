import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useProveedorSaludStore } from '@/stores/proveedorSalud';

let routeName = 'trabajadores';
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ name: routeName }),
}));

const { default: ModalSuscripcion } = await import('./ModalSuscripcion.vue');

describe('ModalSuscripcion: ajustes del Administrador de plataforma', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    routeName = 'trabajadores';
  });

  const mountWith = async (proveedor: Record<string, unknown>, historiasDelMes = 0) => {
    const store = useProveedorSaludStore();
    store.proveedorSalud = proveedor as any;
    vi.spyOn(store, 'getHistoriasClinicasDelMes').mockResolvedValue(historiasDelMes as any);
    const wrapper = mount(ModalSuscripcion, {
      global: { plugins: [pinia], stubs: { Teleport: true } },
      attachTo: document.body,
    });
    await flushPromises();
    return wrapper;
  };

  it('restricción manual: mensaje propio, aunque la suscripción esté activa', async () => {
    const wrapper = await mountWith({
      periodoDePruebaFinalizado: true,
      estadoSuscripcion: 'authorized',
      restriccionManual: true,
    });
    expect(wrapper.text()).toContain('Tu cuenta tiene el acceso restringido');
    wrapper.unmount();
  });

  it('sin restricción ni bloqueo comercial no se muestra', async () => {
    const wrapper = await mountWith({
      periodoDePruebaFinalizado: true,
      estadoSuscripcion: 'authorized',
    });
    expect(wrapper.text()).not.toContain('acceso restringido');
    expect(wrapper.find('.modal').exists()).toBe(false);
    wrapper.unmount();
  });

  it('límite de HC: usa el límite manual, no el del plan', async () => {
    routeName = 'expediente-medico';
    const wrapper = await mountWith(
      {
        periodoDePruebaFinalizado: true,
        estadoSuscripcion: 'authorized',
        maxHistoriasPermitidasAlMes: 50,
        limiteHistoriasManual: 80,
      },
      80,
    );
    expect(wrapper.text()).toContain('hasta 80 historias clínicas');
    wrapper.unmount();
  });

  it('con 60 de 80 permitidas (manual) no bloquea aunque el plan sea 50', async () => {
    routeName = 'expediente-medico';
    const wrapper = await mountWith(
      {
        periodoDePruebaFinalizado: true,
        estadoSuscripcion: 'authorized',
        maxHistoriasPermitidasAlMes: 50,
        limiteHistoriasManual: 80,
      },
      60,
    );
    expect(wrapper.find('.modal').exists()).toBe(false);
    wrapper.unmount();
  });

  describe('pago en línea', () => {
    const trialVencido = { nombre: 'Clínica Norte', periodoDePruebaFinalizado: true, estadoSuscripcion: null };

    it('deshabilitado (por defecto): contacto con Ramazzini, sin precio ni «Suscríbete»', async () => {
      const open = vi.spyOn(window, 'open').mockImplementation(() => null);
      const wrapper = await mountWith(trialVencido);
      expect(wrapper.text()).toContain('Contactar a Ramazzini por WhatsApp');
      expect(wrapper.text()).not.toContain('Suscríbete ahora');
      expect(wrapper.text()).not.toContain('$999');
      expect(wrapper.text()).not.toContain('Cancela en cualquier momento');
      expect(wrapper.find('[data-testid="modal-suscripcion-correo"]').attributes('href')).toContain(
        'mailto:soporte@ramazzini.app',
      );
      const boton = wrapper.findAll('button').find((b) => b.text().includes('WhatsApp'))!;
      await boton.trigger('click');
      expect(open).toHaveBeenCalledWith(expect.stringContaining('https://wa.me/526681702850'), '_blank', 'noopener');
      open.mockRestore();
      wrapper.unmount();
    });

    it('habilitado: igual que siempre («Suscríbete ahora»)', async () => {
      const wrapper = await mountWith({ ...trialVencido, pagoEnLineaHabilitado: true });
      expect(wrapper.text()).toContain('Suscríbete ahora');
      expect(wrapper.text()).toContain('$999');
      expect(wrapper.find('[data-testid="modal-suscripcion-correo"]').exists()).toBe(false);
      wrapper.unmount();
    });
  });
});
