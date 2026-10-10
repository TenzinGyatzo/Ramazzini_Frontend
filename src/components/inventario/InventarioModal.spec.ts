import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import InventarioModal from './InventarioModal.vue';

const montar = (sucio = false) =>
  mount(InventarioModal, {
    props: { titulo: 'Registrar entrada', sucio },
    slots: {
      default: '<input data-test="campo" />',
      acciones: '<template #acciones="{ cerrar }"><button data-test="cancelar" @click="cerrar">Cancelar</button></template>',
    },
    global: { stubs: { Teleport: true } },
    attachTo: document.body,
  });

const descarte = (wrapper: ReturnType<typeof montar>) => wrapper.find('[role="alertdialog"]');

describe('InventarioModal', () => {
  it('cierra cuando el clic empieza y termina en el fondo', async () => {
    const wrapper = montar();
    const fondo = wrapper.find('[data-test="inventario-modal-fondo"]');
    await fondo.trigger('mousedown');
    await fondo.trigger('click');
    expect(wrapper.emitted('cerrar')).toHaveLength(1);
    wrapper.unmount();
  });

  it('no cierra si el clic empezó dentro del panel y terminó en el fondo', async () => {
    const wrapper = montar();
    await wrapper.find('[data-test="campo"]').trigger('mousedown');
    // El navegador entrega el clic al ancestro común: el fondo
    await wrapper.find('[data-test="inventario-modal-fondo"]').trigger('click');
    expect(wrapper.emitted('cerrar')).toBeUndefined();
    wrapper.unmount();
  });

  it('no cierra si el clic empezó en el fondo y terminó dentro del panel', async () => {
    const wrapper = montar();
    await wrapper.find('[data-test="inventario-modal-fondo"]').trigger('mousedown');
    await wrapper.find('[data-test="inventario-modal-panel"]').trigger('click');
    expect(wrapper.emitted('cerrar')).toBeUndefined();
    wrapper.unmount();
  });

  it('con cambios sin guardar pide confirmar antes de cerrar, por el fondo, la X o Cancelar', async () => {
    const wrapper = montar(true);
    const fondo = wrapper.find('[data-test="inventario-modal-fondo"]');

    await fondo.trigger('mousedown');
    await fondo.trigger('click');
    expect(wrapper.emitted('cerrar')).toBeUndefined();
    expect(descarte(wrapper).exists()).toBe(true);

    // Seguir editando conserva el modal
    await descarte(wrapper).findAll('button')[0].trigger('click');
    expect(descarte(wrapper).exists()).toBe(false);
    expect(wrapper.emitted('cerrar')).toBeUndefined();

    await wrapper.find('button[aria-label="Cerrar"]').trigger('click');
    expect(descarte(wrapper).exists()).toBe(true);
    await descarte(wrapper).findAll('button')[0].trigger('click');

    await wrapper.find('[data-test="cancelar"]').trigger('click');
    expect(descarte(wrapper).exists()).toBe(true);
    // Descartar cierra
    await descarte(wrapper).findAll('button')[1].trigger('click');
    expect(wrapper.emitted('cerrar')).toHaveLength(1);
    wrapper.unmount();
  });

  it('sin cambios, Escape y Cancelar cierran de inmediato', async () => {
    const wrapper = montar();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(wrapper.emitted('cerrar')).toHaveLength(1);
    await wrapper.find('[data-test="cancelar"]').trigger('click');
    expect(wrapper.emitted('cerrar')).toHaveLength(2);
    wrapper.unmount();
  });
});
