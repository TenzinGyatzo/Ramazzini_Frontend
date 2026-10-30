import { describe, expect, it } from 'vitest';
import { porcentajeDeCobertura, porcentajeLegible, resumirCobertura, type CoberturaDeTablero } from './dashboardCobertura';

const centro = (ruido: [number, number], polvos: [number, number], ergonomicos: [number, number]): CoberturaDeTablero[] => [
  { agente: 'Ruido', estudio: 'audiometria', expuestos: ruido[0], conEstudio: ruido[1] },
  { agente: 'Polvos', estudio: 'espirometria', expuestos: polvos[0], conEstudio: polvos[1] },
  { agente: 'Ergonómicos', estudio: 'nordico', expuestos: ergonomicos[0], conEstudio: ergonomicos[1] },
];

describe('tablero: cobertura según la exposición', () => {
  it('suma los centros y dice sobre cuántos', () => {
    const filas = resumirCobertura([...centro([10, 4], [3, 0], [5, 5]), ...centro([12, 7], [0, 0], [1, 0])]);
    expect(filas.map((f) => [f.clave, f.cantidad, f.total])).toEqual([
      ['audiometria', 11, 22],
      ['espirometria', 0, 3],
      ['nordico', 5, 6],
    ]);
    expect(porcentajeDeCobertura(filas[0])).toBe(50);
  });

  it('sin expuestos a un agente, su fila no aparece', () => {
    const filas = resumirCobertura(centro([8, 2], [0, 0], [0, 0]));
    expect(filas.map((f) => f.clave)).toEqual(['audiometria']);
  });

  it('un estudio que el centro nunca ha usado no se muestra en cero', () => {
    const filas = resumirCobertura(centro([8, 2], [4, 0], [6, 0]), { gabinete: true, musculoesqueletico: false });
    expect(filas.map((f) => f.clave)).toEqual(['audiometria', 'espirometria']);
  });

  it('sin datos: nada que mostrar', () => {
    expect(resumirCobertura([])).toEqual([]);
  });

  it('el porcentaje no engaña al redondear: ni «0 %» con casos ni «100 %» si falta alguien', () => {
    expect(porcentajeLegible(1, 434)).toBe(0.2);
    expect(porcentajeLegible(433, 434)).toBe(99.8);
    expect(porcentajeLegible(1, 5000)).toBe(0.1);
    expect(porcentajeLegible(4999, 5000)).toBe(99.9);
    expect(porcentajeLegible(38, 55)).toBe(69);
    expect(porcentajeLegible(0, 434)).toBe(0);
    expect(porcentajeLegible(434, 434)).toBe(100);
    expect(porcentajeLegible(3, 0)).toBe(0);
    expect(porcentajeDeCobertura({ clave: 'audiometria', etiqueta: 'Ruido: con audiometría', cantidad: 1, total: 434 })).toBe(0.2);
  });
});
