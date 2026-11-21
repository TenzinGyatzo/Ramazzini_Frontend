// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { buscarCampo, buscarPregunta, controlDelClic, esControlDeCaptura, recordarCampo, recordarDesde } from './campoEntreModos';

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

  it('el clic en la etiqueta de un botón No/Sí cuenta como su radio', () => {
    pantalla('<label><input type="radio" name="sino-x" value="Si" class="sr-only" /><span>Sí</span></label><p>texto</p>');
    expect(controlDelClic(document.querySelector('span'))).toBe(document.querySelector('input'));
    expect(controlDelClic(document.querySelector('p'))).toBeNull();
  });

  it('recuerda la pregunta (sub-paso) del campo', () => {
    pantalla('<div data-legacy-step="26"><input id="a" /></div>');
    expect(recordarCampo(document.getElementById('a')!, 4).legacyStep).toBe(26);
  });

  it('casilla sin id ni nombre: por su lugar dentro de la pregunta', () => {
    const html =
      '<div data-legacy-step="42"><input id="empresaAnterior1" />' +
      '<label><input type="checkbox" value="Ruido" />Ruido</label><label><input type="checkbox" value="Polvos" />Polvos</label></div>';
    pantalla(html);
    const r = recordarCampo(document.querySelectorAll('input[type=checkbox]')[1] as HTMLElement, 6);
    expect(r.indice).toBe(2);
    pantalla(html);
    expect((buscarCampo(r) as HTMLInputElement).value).toBe('Polvos');
  });

  it('clic en el texto de la pregunta: se recuerda la pregunta, sin control', () => {
    pantalla('<div data-legacy-step="19"><p>Accidentes</p><input type="radio" name="sino-accidentes" value="No" /></div>');
    const r = recordarDesde(document.querySelector('p'), 3)!;
    expect(r).toMatchObject({ seccion: 3, legacyStep: 19, indice: -1 });
    expect(buscarCampo(r)).toBeNull();
    expect(buscarPregunta(r)).toBe(document.querySelector('[data-legacy-step="19"]'));
    expect(recordarDesde(document.body, 3)).toBeNull();
  });
});
