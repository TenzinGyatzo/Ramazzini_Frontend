import { describe, expect, it } from 'vitest';
import { esTeclaDeBusqueda, filaDestino } from './navegacionFilas';

describe('filaDestino', () => {
  it('sube y baja de una en una, sin pasarse del final', () => {
    expect(filaDestino('ArrowDown', 1, 3)).toBe(2);
    expect(filaDestino('ArrowDown', 2, 3)).toBe(2);
    expect(filaDestino('ArrowUp', 2, 3)).toBe(1);
  });

  it('subir desde la primera fila sale de la tabla', () => {
    expect(filaDestino('ArrowUp', 0, 3)).toBe(-1);
  });

  it('Inicio y Fin van a los extremos de la página', () => {
    expect(filaDestino('Home', 2, 3)).toBe(0);
    expect(filaDestino('End', 0, 3)).toBe(2);
  });
});

describe('esTeclaDeBusqueda', () => {
  const tecla = (key: string, extra = {}) => ({ key, ctrlKey: false, altKey: false, metaKey: false, ...extra });

  it('acepta letras, acentos y números', () => {
    for (const key of ['a', 'Ñ', 'é', '7']) expect(esTeclaDeBusqueda(tecla(key))).toBe(true);
  });

  it('no toma espacios, signos, teclas especiales ni atajos', () => {
    for (const key of [' ', '/', 'Enter', 'Escape']) expect(esTeclaDeBusqueda(tecla(key))).toBe(false);
    expect(esTeclaDeBusqueda(tecla('k', { ctrlKey: true }))).toBe(false);
    expect(esTeclaDeBusqueda(tecla('c', { metaKey: true }))).toBe(false);
  });
});
