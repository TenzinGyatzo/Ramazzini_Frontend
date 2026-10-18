import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DURACION_RESALTADO_MS,
  anotarDocumentoAbierto,
  anotarDocumentoGuardado,
  anotarPosicionExpediente,
  documentoResaltado,
  resaltarDocumento,
  tomarRetornoExpediente,
} from './retornoExpediente';

beforeEach(() => {
  // El almacenamiento de las pruebas no guarda nada: uno en memoria para este archivo
  const memoria = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => memoria.get(k) ?? null,
    setItem: (k: string, v: string) => memoria.set(k, v),
    removeItem: (k: string) => memoria.delete(k),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('retornoExpediente', () => {
  it('combina posición, documento abierto y guardado del mismo trabajador, y se entrega una vez', () => {
    anotarDocumentoAbierto('t1', 'd1');
    anotarPosicionExpediente('t1', 840.4);
    anotarDocumentoGuardado('t1', 'd1');

    const retorno = tomarRetornoExpediente('t1');
    expect(retorno).toMatchObject({ trabajadorId: 't1', scrollY: 840, documentoAbierto: 'd1', documentoGuardado: 'd1' });
    expect(tomarRetornoExpediente('t1')).toBeNull();
  });

  it('abrir otro documento olvida un guardado anterior', () => {
    anotarDocumentoGuardado('t1', 'viejo');
    anotarDocumentoAbierto('t1', 'nuevo');
    const retorno = tomarRetornoExpediente('t1');
    expect(retorno?.documentoAbierto).toBe('nuevo');
    expect(retorno?.documentoGuardado).toBeUndefined();
  });

  it('no aplica a otro trabajador, y lo de otro trabajador se reemplaza', () => {
    anotarPosicionExpediente('t1', 500);
    expect(tomarRetornoExpediente('t2')).toBeNull();

    anotarPosicionExpediente('t1', 500);
    anotarDocumentoAbierto('t2', 'd9');
    expect(tomarRetornoExpediente('t2')).toMatchObject({ trabajadorId: 't2', documentoAbierto: 'd9' });
    expect(tomarRetornoExpediente('t2')?.scrollY).toBeUndefined();
  });

  it('caduca a los 30 minutos', () => {
    anotarPosicionExpediente('t1', 300);
    expect(tomarRetornoExpediente('t1', Date.now() + 31 * 60 * 1000)).toBeNull();
  });

  it('el resaltado dura unos segundos', () => {
    vi.useFakeTimers();
    resaltarDocumento('d1');
    expect(documentoResaltado.value).toBe('d1');
    vi.advanceTimersByTime(DURACION_RESALTADO_MS);
    expect(documentoResaltado.value).toBeNull();
  });
});
