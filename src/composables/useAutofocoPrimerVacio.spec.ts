// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useAutofocoPrimerVacio } from './useAutofocoPrimerVacio';
import { enfocarCampo } from '@/helpers/enfocarCampo';

/** jsdom no calcula cajas: todo se considera visible. */
beforeAll(() => {
  Element.prototype.getClientRects = () => [{}] as unknown as DOMRectList;
});

const esperar = (ms = 60) => new Promise((r) => setTimeout(r, ms));

/** Un paso con peso, altura y cintura (valores iniciales opcionales). */
const paso = (valores: Record<string, string> = {}, opciones = {}, deshabilitado: string[] = []) =>
  defineComponent({
    setup() {
      useAutofocoPrimerVacio(['peso', 'altura', 'cintura'], opciones);
      return () =>
        h(
          'div',
          ['peso', 'altura', 'cintura'].map((c) =>
            h('div', { 'data-campo': c }, [
              h('input', { id: c, type: 'number', value: valores[c] ?? '', disabled: deshabilitado.includes(c) }),
            ]),
          ),
        );
    },
  });

/** Computadora (puntero fino); la configuración de pruebas simula un matchMedia sin coincidencias. */
beforeEach(() => {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('fine') }) as MediaQueryList);
});

afterEach(() => {
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

describe('useAutofocoPrimerVacio', () => {
  it('pone el cursor en el primer obligatorio vacío', async () => {
    mount(paso(), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.id).toBe('peso');
  });

  it('al volver al paso, salta los que ya tienen algo', async () => {
    mount(paso({ peso: '80' }), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.id).toBe('altura');
  });

  it('salta los campos desactivados (cintura con «Se desconoce»)', async () => {
    mount(paso({ peso: '80', altura: '1.7' }, {}, ['cintura']), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.tagName).toBe('BODY');
  });

  it('con todo lleno no hace nada', async () => {
    mount(paso({ peso: '80', altura: '1.7', cintura: '90' }), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.tagName).toBe('BODY');
  });

  it('siempreElPrimero: el primero aunque tenga valor, y seleccionado (audiometría)', async () => {
    mount(paso({ peso: '0', altura: '0' }, { siempreElPrimero: true }), { attachTo: document.body });
    await esperar();
    const el = document.activeElement as HTMLInputElement;
    expect(el.id).toBe('peso');
  });

  it('si el usuario ya hizo clic o tecleó, no le mueve el cursor', async () => {
    mount(paso(), { attachTo: document.body });
    document.dispatchEvent(new Event('pointerdown'));
    await esperar();
    expect(document.activeElement?.tagName).toBe('BODY');
  });

  it('en celular o tableta no se activa', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: !q.includes('fine') }) as MediaQueryList);
    mount(paso(), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.tagName).toBe('BODY');
  });

  // Al final: deja el aviso «en curso» un par de segundos
  it('si el aviso al guardar está llevando a un dato, gana el aviso', async () => {
    void enfocarCampo('otroCampo', 'Escribe otro campo.');
    mount(paso(), { attachTo: document.body });
    await esperar();
    expect(document.activeElement?.id).not.toBe('peso');
  });
});
