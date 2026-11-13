// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLASE_ATENCION,
  comoDesplazar,
  enfocarCampo,
  limpiarAtencionCampo,
  mostrarTextoDesdeElPrincipio,
} from './enfocarCampo';

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

describe('comoDesplazar: campos altos se muestran desde su principio', () => {
  const pantalla = 800;

  it('campo normal: si se ve completo no se mueve; si no, se centra', () => {
    expect(comoDesplazar({ top: 100, bottom: 300, height: 200 }, pantalla)).toBe('no');
    expect(comoDesplazar({ top: 900, bottom: 1100, height: 200 }, pantalla)).toBe('centro');
    expect(comoDesplazar({ top: -150, bottom: 50, height: 200 }, pantalla)).toBe('centro');
  });

  it('campo alto: si su principio se ve en cualquier parte de la pantalla, no se mueve', () => {
    // Más alto que el 60 % de la pantalla
    expect(comoDesplazar({ top: 120, bottom: 1320, height: 1200 }, pantalla)).toBe('no');
    // A media pantalla (debajo de los títulos): antes se subía y la página «bajaba»
    expect(comoDesplazar({ top: 450, bottom: 1650, height: 1200 }, pantalla)).toBe('no');
    expect(comoDesplazar({ top: 680, bottom: 1880, height: 1200 }, pantalla)).toBe('no');
  });

  it('campo alto con su principio fuera de la vista: se muestra desde el principio', () => {
    // Casi al fondo (no alcanza a verse su título), abajo de la pantalla o arriba
    expect(comoDesplazar({ top: 700, bottom: 1900, height: 1200 }, pantalla)).toBe('inicio');
    expect(comoDesplazar({ top: 900, bottom: 2100, height: 1200 }, pantalla)).toBe('inicio');
    expect(comoDesplazar({ top: -400, bottom: 800, height: 1200 }, pantalla)).toBe('inicio');
  });
});

describe('enfocarCampo con un campo alto', () => {
  it('se desplaza al principio del campo, no al centro', async () => {
    document.body.innerHTML = `<div data-campo="resultados"><textarea id="r"></textarea></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="resultados"]')!;
    visible(cont);
    cont.getBoundingClientRect = () => ({ top: 900, bottom: 2400, height: 1500 }) as DOMRect;
    const promesa = enfocarCampo('resultados', 'Escribe los resultados.');
    await new Promise((r) => setTimeout(r, 0));
    expect(cont.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' });
    document.dispatchEvent(new Event('scrollend'));
    expect(await promesa).toBe(true);
    expect(document.activeElement?.id).toBe('r');
  });
});

describe('enfocarCampo con data-desplazar="no" (cuadro de texto arriba de su paso)', () => {
  it('si su principio se ve, no desplaza aunque el campo sea alto', async () => {
    document.body.innerHTML = `<div data-campo="medidas" data-desplazar="no"><textarea id="m"></textarea></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="medidas"]')!;
    visible(cont);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    // Alto (más que la pantalla) y con su principio a media pantalla
    cont.getBoundingClientRect = () => ({ top: 400, bottom: 2400, height: 2000 }) as DOMRect;
    expect(await enfocarCampo('medidas', 'Escribe las medidas preventivas.')).toBe(true);
    expect(cont.scrollIntoView).not.toHaveBeenCalled();
    expect(scrollTo).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('m');
    scrollTo.mockRestore();
  });

  it('si quedó fuera de la vista, la página sube hasta arriba (nunca baja hacia el campo)', async () => {
    document.body.innerHTML = `<div data-campo="resultados" data-desplazar="no"><textarea></textarea></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="resultados"]')!;
    visible(cont);
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    cont.getBoundingClientRect = () => ({ top: -600, bottom: 1400, height: 2000 }) as DOMRect;
    const promesa = enfocarCampo('resultados', 'Escribe los resultados.');
    await new Promise((r) => setTimeout(r, 0));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(cont.scrollIntoView).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('scrollend'));
    expect(await promesa).toBe(true);
    scrollTo.mockRestore();
  });
});

describe('cuadro de texto con contenido: se ve desde su principio', () => {
  it('al llevar al campo, el cursor queda al principio y el texto arriba', async () => {
    document.body.innerHTML = `<div data-campo="resultados"><textarea id="r"></textarea></div>`;
    const cont = document.querySelector<HTMLElement>('[data-campo="resultados"]')!;
    visible(cont);
    const area = document.getElementById('r') as HTMLTextAreaElement;
    area.value = 'Texto sugerido muy largo\n'.repeat(40);
    area.scrollTop = 500;
    expect(await enfocarCampo('resultados', 'Escribe los resultados.')).toBe(true);
    expect(area.selectionStart).toBe(0);
    expect(area.selectionEnd).toBe(0);
    expect(area.scrollTop).toBe(0);
  });

  it('si el texto llega después, se vuelve a mostrar desde el principio', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<textarea id="m"></textarea>`;
    const area = document.getElementById('m') as HTMLTextAreaElement;
    area.focus();
    mostrarTextoDesdeElPrincipio(area);
    // El paso precarga el texto un momento después (el cursor se va al final)
    area.value = 'Medidas sugeridas\n'.repeat(20);
    area.setSelectionRange(area.value.length, area.value.length);
    vi.advanceTimersByTime(600);
    expect(area.selectionStart).toBe(0);
    vi.useRealTimers();
  });

  it('si el usuario ya escribió, no le mueve el cursor', () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<textarea id="m"></textarea>`;
    const area = document.getElementById('m') as HTMLTextAreaElement;
    area.focus();
    mostrarTextoDesdeElPrincipio(area);
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    area.value = 'abc';
    area.setSelectionRange(3, 3);
    vi.advanceTimersByTime(1500);
    expect(area.selectionStart).toBe(3);
    vi.useRealTimers();
  });
});
