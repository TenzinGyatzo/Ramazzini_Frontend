import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useNavegacionTarjetas } from '../useNavegacionTarjetas';

/** Seis tarjetas en dos columnas; jsdom no calcula posiciones, así que se simulan. */
function montar(alSalirArriba?: () => void) {
  let api!: ReturnType<typeof useNavegacionTarjetas>;
  const Prueba = defineComponent({
    setup() {
      const rejilla = ref<HTMLElement | null>(null);
      api = useNavegacionTarjetas(rejilla, { alSalirArriba });
      return () =>
        h(
          'div',
          { ref: rejilla, onKeydown: api.alPresionar },
          ['a', 'b', 'c', 'd', 'e', 'f'].map((id) =>
            h('div', { class: 'tarjeta-nav', key: id }, [
              h('a', { href: `#${id}`, 'data-tarjeta-nav': id, class: 'tarjeta-nav__enlace' }, id),
              h('button', { type: 'button' }, 'Editar'),
            ]),
          ),
        );
    },
  });
  const w = mount(Prueba, { attachTo: document.body });
  w.findAll('[data-tarjeta-nav]').forEach((enlace, i) => {
    const el = enlace.element as HTMLElement;
    el.getBoundingClientRect = () => ({ top: Math.floor(i / 2) * 300, left: (i % 2) * 400 }) as DOMRect;
    el.scrollIntoView = vi.fn();
  });
  return { w, api: () => api };
}

const enfocado = () => (document.activeElement as HTMLElement | null)?.dataset?.tarjetaNav;

describe('useNavegacionTarjetas', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('las flechas mueven el foco entre tarjetas', async () => {
    const { w } = montar();
    (w.find('[data-tarjeta-nav="a"]').element as HTMLElement).focus();
    await w.find('[data-tarjeta-nav="a"]').trigger('keydown', { key: 'ArrowRight' });
    expect(enfocado()).toBe('b');
    await w.find('[data-tarjeta-nav="b"]').trigger('keydown', { key: 'ArrowDown' });
    expect(enfocado()).toBe('d');
    await w.find('[data-tarjeta-nav="d"]').trigger('keydown', { key: 'End' });
    expect(enfocado()).toBe('f');
    w.unmount();
  });

  it('en los botones de la tarjeta las flechas no hacen nada', async () => {
    const { w } = montar();
    const boton = w.findAll('button')[0];
    (boton.element as HTMLElement).focus();
    await boton.trigger('keydown', { key: 'ArrowRight' });
    expect(document.activeElement).toBe(boton.element);
    w.unmount();
  });

  it('desde la primera fila, arriba sale (al buscador)', async () => {
    const alSalirArriba = vi.fn();
    const { w } = montar(alSalirArriba);
    (w.find('[data-tarjeta-nav="b"]').element as HTMLElement).focus();
    await w.find('[data-tarjeta-nav="b"]').trigger('keydown', { key: 'ArrowUp' });
    expect(alSalirArriba).toHaveBeenCalled();
    w.unmount();
  });

  it('con modificadores no interfiere', async () => {
    const { w } = montar();
    (w.find('[data-tarjeta-nav="a"]').element as HTMLElement).focus();
    await w.find('[data-tarjeta-nav="a"]').trigger('keydown', { key: 'ArrowRight', shiftKey: true });
    expect(enfocado()).toBe('a');
    w.unmount();
  });

  it('al llegar, la primera flecha empieza en la primera tarjeta', async () => {
    const { w } = montar();
    (document.activeElement as HTMLElement | null)?.blur();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(enfocado()).toBe('a');
    w.unmount();
  });

  it('también si el foco quedó en un enlace fuera de la rejilla (el menú)', async () => {
    const { w } = montar();
    const menu = document.createElement('a');
    menu.href = '#menu';
    document.body.appendChild(menu);
    menu.focus();
    menu.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(enfocado()).toBe('a');
    w.unmount();
  });

  it('no la toma en un campo de texto ni con una ventana abierta', async () => {
    const { w } = montar();
    const campo = document.createElement('input');
    document.body.appendChild(campo);
    campo.focus();
    campo.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(campo);

    campo.blur();
    const ventana = document.createElement('div');
    ventana.setAttribute('aria-modal', 'true');
    document.body.appendChild(ventana);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(enfocado()).toBeUndefined();
    w.unmount();
  });

  it('al salir de la vista deja de escuchar', async () => {
    const { w } = montar();
    w.unmount();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(enfocado()).toBeUndefined();
  });

  it('enfocarPrimera y resaltar llevan el foco y marcan la tarjeta', async () => {
    vi.useFakeTimers();
    const { w, api } = montar();
    expect(api().enfocarPrimera()).toBe(true);
    expect(enfocado()).toBe('a');

    const resultado = api().resaltar('e');
    await vi.runAllTicks();
    expect(await resultado).toBe(true);
    expect(enfocado()).toBe('e');
    const tarjeta = w.find('[data-tarjeta-nav="e"]').element.closest('.tarjeta-nav')!;
    expect(tarjeta.classList.contains('tarjeta-nav--reciente')).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(tarjeta.classList.contains('tarjeta-nav--reciente')).toBe(false);

    const noExiste = api().resaltar('zzz');
    await vi.advanceTimersByTimeAsync(1000);
    expect(await noExiste).toBe(false);
    vi.useRealTimers();
    w.unmount();
  });
});
