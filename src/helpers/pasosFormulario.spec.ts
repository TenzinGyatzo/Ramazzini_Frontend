import { describe, expect, it } from 'vitest';
import {
  MAX_PASOS_SEGMENTADOS,
  estadoSegmento,
  nombreDePaso,
  usarPasosSegmentados,
} from './pasosFormulario';

describe('pasosFormulario', () => {
  it('nombreDePaso descarta los nombres genéricos «Paso N»', () => {
    expect(nombreDePaso('Paso 3')).toBeNull();
    expect(nombreDePaso('Paso 12')).toBeNull();
    expect(nombreDePaso('')).toBeNull();
    expect(nombreDePaso(undefined)).toBeNull();
  });

  it('nombreDePaso conserva los nombres de sección', () => {
    expect(nombreDePaso('Signos vitales')).toBe('Signos vitales');
    expect(nombreDePaso(' Aptitud ')).toBe('Aptitud');
  });

  it('usarPasosSegmentados solo con 2 a MAX pasos', () => {
    expect(usarPasosSegmentados(0)).toBe(false);
    expect(usarPasosSegmentados(1)).toBe(false);
    expect(usarPasosSegmentados(2)).toBe(true);
    expect(usarPasosSegmentados(MAX_PASOS_SEGMENTADOS)).toBe(true);
    expect(usarPasosSegmentados(MAX_PASOS_SEGMENTADOS + 1)).toBe(false);
  });

  it('estadoSegmento distingue previo, actual y pendiente', () => {
    expect(estadoSegmento(1, 3, 6)).toBe('previo');
    expect(estadoSegmento(3, 3, 6)).toBe('actual');
    expect(estadoSegmento(4, 3, 6)).toBe('pendiente');
  });

  it('estadoSegmento marca todo completo en la pantalla final', () => {
    for (let paso = 1; paso <= 6; paso++) {
      expect(estadoSegmento(paso, 7, 6)).toBe('completado');
    }
  });
});
