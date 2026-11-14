// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import {
  atajoDePaso,
  evitarFocoAlHacerClic,
  quitarDelTabLosSoloLectura,
  useTecladoAsistente,
} from './useTecladoAsistente';

afterEach(() => {
  document.body.innerHTML = '';
});

const tecla = (key: string, extra: Partial<KeyboardEvent> = {}, target: EventTarget | null = document.body) =>
  ({ key, altKey: true, ctrlKey: false, metaKey: false, shiftKey: false, target, ...extra }) as KeyboardEvent;

describe('campos de solo lectura en el área de captura', () => {
  it('Tab los salta (tabindex -1); los editables y los de fuera no cambian', () => {
    document.body.innerHTML = `
      <div data-captura-documento>
        <input id="imc" readonly /><input id="peso" /><textarea id="texto" readonly></textarea>
      </div>
      <input id="fuera" readonly />`;
    quitarDelTabLosSoloLectura();
    expect(document.getElementById('imc')?.getAttribute('tabindex')).toBe('-1');
    expect(document.getElementById('peso')?.hasAttribute('tabindex')).toBe(false);
    // Los cuadros de texto largos se pueden seleccionar y copiar
    expect(document.getElementById('texto')?.hasAttribute('tabindex')).toBe(false);
    expect(document.getElementById('fuera')?.hasAttribute('tabindex')).toBe(false);
  });

  it('el clic no les pone el cursor', () => {
    document.body.innerHTML = `<div data-captura-documento><input id="imc" readonly /><input id="peso" /></div>`;
    const clic = (id: string) => {
      const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      Object.defineProperty(e, 'target', { value: document.getElementById(id) });
      evitarFocoAlHacerClic(e);
      return e.defaultPrevented;
    };
    expect(clic('imc')).toBe(true);
    expect(clic('peso')).toBe(false);
  });
});

describe('atajos Alt + ← / Alt + →', () => {
  it('Alt + flecha cambia de paso; con otras teclas no', () => {
    expect(atajoDePaso(tecla('ArrowLeft'), false)).toBe('anterior');
    expect(atajoDePaso(tecla('ArrowRight'), false)).toBe('siguiente');
    expect(atajoDePaso(tecla('ArrowLeft', { altKey: false }), false)).toBeNull();
    expect(atajoDePaso(tecla('ArrowLeft', { ctrlKey: true }), false)).toBeNull();
    expect(atajoDePaso(tecla('ArrowLeft', { shiftKey: true }), false)).toBeNull();
    expect(atajoDePaso(tecla('ArrowUp'), false)).toBeNull();
  });

  it('en Windows funciona aunque se esté en un campo; en Mac no (Option + flecha mueve por palabras)', () => {
    const campo = document.createElement('input');
    expect(atajoDePaso(tecla('ArrowRight', {}, campo), false)).toBe('siguiente');
    expect(atajoDePaso(tecla('ArrowRight', {}, campo), true)).toBeNull();
    expect(atajoDePaso(tecla('ArrowRight', {}, document.body), true)).toBe('siguiente');
  });

  it('con una ventana abierta no cambia de paso detrás de ella', () => {
    document.body.innerHTML = `<div role="dialog"><button id="b">Ir</button></div>`;
    expect(atajoDePaso(tecla('ArrowRight', {}, document.getElementById('b')), false)).toBeNull();
  });

  it('en el asistente: cambia de paso, evita el «atrás» del navegador y no avanza si no se puede', () => {
    const anterior = vi.fn();
    const siguiente = vi.fn();
    let hayAnterior = false;
    const wrapper = mount(
      defineComponent({
        setup() {
          useTecladoAsistente({ anterior, siguiente, puedeAnterior: () => hayAnterior, puedeSiguiente: () => true });
          return () => h('div');
        },
      }),
      { attachTo: document.body },
    );
    const enviar = (key: string) => {
      const e = new KeyboardEvent('keydown', { key, altKey: true, cancelable: true });
      window.dispatchEvent(e);
      return e.defaultPrevented;
    };
    expect(enviar('ArrowRight')).toBe(true);
    expect(siguiente).toHaveBeenCalledTimes(1);
    // En el primer paso no hay anterior, pero tampoco se sale de la página
    expect(enviar('ArrowLeft')).toBe(true);
    expect(anterior).not.toHaveBeenCalled();
    hayAnterior = true;
    enviar('ArrowLeft');
    expect(anterior).toHaveBeenCalledTimes(1);
    wrapper.unmount();
  });
});
