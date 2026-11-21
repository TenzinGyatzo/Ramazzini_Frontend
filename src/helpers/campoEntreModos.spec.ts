// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buscarCampo, esControlDeCaptura, recordarCampo } from './campoEntreModos';

// jsdom no calcula cajas: todo elemento conectado cuenta como visible
beforeEach(() => {
  HTMLElement.prototype.getClientRects = function () {
    return (this.isConnected ? [{}] : []) as unknown as DOMRectList;
  };
});

const pantalla = (html: string) => {
  document.body.innerHTML = html;
};

describe('campo entre modos de captura (punto 39)', () => {
  it('recuerda y vuelve a encontrar un campo por id', () => {
    pantalla('<div data-campo="talla"><input id="talla" /></div>');
    const r = recordarCampo(document.getElementById('talla')!, 3);
    expect(r).toMatchObject({ seccion: 3, id: 'talla', campo: 'talla' });
    pantalla('<section><div data-campo="talla"><input id="talla" /></div></section>');
    expect(buscarCampo(r)).toBe(document.getElementById('talla'));
  });

  it('un radio: la misma opción del mismo grupo', () => {
    pantalla('<input type="radio" name="sino-alcoholismo" value="No" /><input type="radio" name="sino-alcoholismo" value="Si" />');
    const r = recordarCampo(document.querySelectorAll('input')[1] as HTMLElement, 4);
    pantalla('<input type="radio" name="sino-alcoholismo" value="No" /><input type="radio" name="sino-alcoholismo" value="Si" />');
    expect((buscarCampo(r) as HTMLInputElement).value).toBe('Si');
  });

  it('sin id ni nombre: por su marca data-campo', () => {
    pantalla('<div data-campo="motivoConsulta otro"><textarea></textarea></div>');
    const r = recordarCampo(document.querySelector('textarea')!, 1);
    expect(r.campo).toBe('motivoConsulta');
    expect(buscarCampo(r)).toBe(document.querySelector('textarea'));
  });

  it('si el campo todavía no está en pantalla, null', () => {
    pantalla('<input id="peso" />');
    const r = recordarCampo(document.getElementById('peso')!, 2);
    pantalla('');
    expect(buscarCampo(r)).toBeNull();
  });

  it('solo cuenta controles de captura (no botones)', () => {
    pantalla('<button></button><select></select><input disabled />');
    expect(esControlDeCaptura(document.querySelector('button'))).toBe(false);
    expect(esControlDeCaptura(document.querySelector('select'))).toBe(true);
    expect(esControlDeCaptura(document.querySelector('input'))).toBe(false);
  });
});
