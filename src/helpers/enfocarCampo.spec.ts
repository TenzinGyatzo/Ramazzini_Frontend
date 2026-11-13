// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CLASE_ATENCION, enfocarCampo, limpiarAtencionCampo } from './enfocarCampo';

/** jsdom no calcula cajas: se simula que el campo está a la vista. */
function visible(el: HTMLElement) {
  el.getClientRects = () => [{}] as unknown as DOMRectList;
  el.scrollIntoView = vi.fn();
}

afterEach(() => {
  limpiarAtencionCampo();
  document.body.innerHTML = '';
});

describe('enfocarCampo', () => {
  it('resalta el contenedor, muestra qué corregir y enfoca lo primero que se captura', async () => {
    document.body.innerHTML = `<div data-campo="peso"><label>Peso</label><input id="peso" /></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="peso"]')!;
    visible(cont);

    expect(await enfocarCampo('peso', 'Escribe el peso o marca «Se desconoce».')).toBe(true);
    expect(cont.classList.contains(CLASE_ATENCION)).toBe(true);
    expect(cont.getAttribute('data-atencion')).toBe('Escribe el peso o marca «Se desconoce».');
    expect(document.activeElement?.id).toBe('peso');
    // Ya estaba a la vista: no se desplaza
    expect(cont.scrollIntoView).not.toHaveBeenCalled();
  });

  it('fuera de la vista: desplaza y resalta cuando termina el desplazamiento', async () => {
    document.body.innerHTML = `<div data-campo="talla"><input id="t" /></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="talla"]')!;
    visible(cont);
    cont.getBoundingClientRect = () =>
      ({ top: 2000, bottom: 2100 }) as DOMRect;

    const promesa = enfocarCampo('talla', 'Escribe la talla.');
    await new Promise((r) => setTimeout(r, 0));
    expect(cont.scrollIntoView).toHaveBeenCalled();
    // Mientras se desplaza, todavía sin resaltar
    expect(cont.classList.contains(CLASE_ATENCION)).toBe(false);
    document.dispatchEvent(new Event('scrollend'));
    expect(await promesa).toBe(true);
    expect(cont.classList.contains(CLASE_ATENCION)).toBe(true);
  });

  it('si mientras se desplaza se pide otro campo, solo queda marcado el último', async () => {
    document.body.innerHTML = `<div data-campo="a"><input /></div><div data-campo="b"><input /></div>`;
    const a = document.querySelector<HTMLElement>('[data-campo="a"]')!;
    const b = document.querySelector<HTMLElement>('[data-campo="b"]')!;
    visible(a);
    visible(b);
    a.getBoundingClientRect = () => ({ top: 2000, bottom: 2100 }) as DOMRect;

    const primera = enfocarCampo('a', 'A');
    await new Promise((r) => setTimeout(r, 0));
    const segunda = enfocarCampo('b', 'B');
    document.dispatchEvent(new Event('scrollend'));
    expect(await primera).toBe(false);
    expect(await segunda).toBe(true);
    expect(a.classList.contains(CLASE_ATENCION)).toBe(false);
    expect(b.classList.contains(CLASE_ATENCION)).toBe(true);
  });

  it('se quita en cuanto el usuario cambia el dato', async () => {
    document.body.innerHTML = `<div data-campo="genero"><select id="g"><option>1</option></select></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="genero"]')!;
    visible(cont);
    await enfocarCampo('genero', 'Elige el género.');
    cont.querySelector('select')!.dispatchEvent(new Event('change', { bubbles: true }));
    expect(cont.classList.contains(CLASE_ATENCION)).toBe(false);
    expect(cont.hasAttribute('data-atencion')).toBe(false);
  });

  it('espera a que el paso monte el campo', async () => {
    setTimeout(() => {
      document.body.innerHTML = `<div data-campo="talla"><input id="t" /></div>`;
      visible(document.querySelector<HTMLElement>('[data-campo="talla"]')!);
    }, 120);
    expect(await enfocarCampo('talla', 'Escribe la talla.')).toBe(true);
    expect(document.activeElement?.id).toBe('t');
  });

  it('sin marca en el paso o sin campo: no hace nada', async () => {
    expect(await enfocarCampo(undefined, 'x')).toBe(false);
    vi.useFakeTimers();
    const promesa = enfocarCampo('noExiste', 'x');
    await vi.advanceTimersByTimeAsync(2000);
    expect(await promesa).toBe(false);
    vi.useRealTimers();
  });

  it('al ir a otro campo se limpia el anterior', async () => {
    document.body.innerHTML = `<div data-campo="a"><input /></div><div data-campo="b"><input /></div>`;
    const a = document.querySelector<HTMLElement>('[data-campo="a"]')!;
    const b = document.querySelector<HTMLElement>('[data-campo="b"]')!;
    visible(a);
    visible(b);
    await enfocarCampo('a', 'A');
    await enfocarCampo('b', 'B');
    expect(a.classList.contains(CLASE_ATENCION)).toBe(false);
    expect(b.classList.contains(CLASE_ATENCION)).toBe(true);
  });
});
