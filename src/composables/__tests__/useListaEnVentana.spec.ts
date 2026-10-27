import { afterEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { useListaEnVentana } from '../useListaEnVentana';

function montar(conPaginas = true) {
  const abierta = ref(false);
  const pagina = ref(1);
  const alCerrar = vi.fn(() => {
    abierta.value = false;
  });
  const alAnterior = vi.fn(() => {
    pagina.value -= 1;
  });
  const alSiguiente = vi.fn(() => {
    pagina.value += 1;
  });
  const Ventana = defineComponent({
    setup() {
      const panel = ref<HTMLElement | null>(null);
      useListaEnVentana(panel, {
        abierta: () => abierta.value,
        alCerrar,
        contenido: () => pagina.value,
        ...(conPaginas ? { alAnterior, alSiguiente } : {}),
      });
      return () =>
        h('div', [
          h('button', { id: 'indicador' }, 'Indicador'),
          abierta.value
            ? h('div', { ref: panel, role: 'dialog', 'aria-modal': 'true' }, [
                h('button', { id: 'cerrar' }, 'Cerrar'),
                h(
                  'div',
                  { 'data-lista-ventana': '' },
                  ['a', 'b', 'c'].map((id) => h('button', { id: `${id}${pagina.value}` }, id)),
                ),
              ])
            : null,
        ]);
    },
  });
  const w = mount(Ventana, { attachTo: document.body });
  return { w, abierta, pagina, alCerrar, alAnterior, alSiguiente };
}

const tecla = (key: string) =>
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
const enfocado = () => document.activeElement?.id;

describe('useListaEnVentana', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('al abrir enfoca el primero; ↑ ↓ recorren, Inicio y Fin van a los extremos', async () => {
    const { w, abierta } = montar();
    (document.getElementById('indicador') as HTMLElement).focus();
    abierta.value = true;
    await flushPromises();
    expect(enfocado()).toBe('a1');
    tecla('ArrowDown');
    expect(enfocado()).toBe('b1');
    tecla('End');
    expect(enfocado()).toBe('c1');
    tecla('ArrowDown');
    expect(enfocado()).toBe('c1');
    tecla('Home');
    expect(enfocado()).toBe('a1');
    w.unmount();
  });

  it('← → cambian de página y el foco va al primero de la nueva', async () => {
    const { w, abierta, alSiguiente, alAnterior } = montar();
    abierta.value = true;
    await flushPromises();
    tecla('ArrowRight');
    await flushPromises();
    expect(alSiguiente).toHaveBeenCalled();
    expect(enfocado()).toBe('a2');
    tecla('ArrowLeft');
    await flushPromises();
    expect(alAnterior).toHaveBeenCalled();
    expect(enfocado()).toBe('a1');
    w.unmount();
  });

  it('Esc cierra y el foco regresa a donde estaba', async () => {
    const { w, abierta, alCerrar } = montar(false);
    (document.getElementById('indicador') as HTMLElement).focus();
    abierta.value = true;
    await flushPromises();
    tecla('Escape');
    await nextTick();
    await flushPromises();
    expect(alCerrar).toHaveBeenCalled();
    expect(enfocado()).toBe('indicador');
    // Cerrada, las flechas ya no son suyas
    tecla('ArrowDown');
    expect(enfocado()).toBe('indicador');
    w.unmount();
  });
});
