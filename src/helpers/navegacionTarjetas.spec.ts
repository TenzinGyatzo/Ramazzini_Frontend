import { describe, expect, it } from 'vitest';
import { vecinoEnRejilla, type PosicionTarjeta } from './navegacionTarjetas';

/** Rejilla de 3 columnas con 7 tarjetas (la última fila incompleta). */
const rejilla = (columnas: number, total: number): PosicionTarjeta[] =>
  Array.from({ length: total }, (_, i) => ({
    top: Math.floor(i / columnas) * 300,
    left: (i % columnas) * 400,
  }));

describe('navegación entre tarjetas', () => {
  const tres = rejilla(3, 7);

  it('izquierda y derecha siguen el orden y pasan de fila', () => {
    expect(vecinoEnRejilla(tres, 0, 'ArrowRight')).toBe(1);
    expect(vecinoEnRejilla(tres, 2, 'ArrowRight')).toBe(3);
    expect(vecinoEnRejilla(tres, 3, 'ArrowLeft')).toBe(2);
    expect(vecinoEnRejilla(tres, 0, 'ArrowLeft')).toBeNull();
    expect(vecinoEnRejilla(tres, 6, 'ArrowRight')).toBeNull();
  });

  it('arriba y abajo conservan la columna', () => {
    expect(vecinoEnRejilla(tres, 1, 'ArrowDown')).toBe(4);
    expect(vecinoEnRejilla(tres, 4, 'ArrowUp')).toBe(1);
    expect(vecinoEnRejilla(tres, 1, 'ArrowUp')).toBeNull();
  });

  it('si la fila de abajo es más corta, va a la más cercana', () => {
    expect(vecinoEnRejilla(tres, 5, 'ArrowDown')).toBe(6);
    expect(vecinoEnRejilla(tres, 4, 'ArrowDown')).toBe(6);
    expect(vecinoEnRejilla(tres, 6, 'ArrowDown')).toBeNull();
  });

  it('una sola columna (celular): abajo es la siguiente', () => {
    const una = rejilla(1, 3);
    expect(vecinoEnRejilla(una, 0, 'ArrowDown')).toBe(1);
    expect(vecinoEnRejilla(una, 2, 'ArrowUp')).toBe(1);
  });

  it('pequeñas diferencias de altura cuentan como la misma fila', () => {
    const posiciones = [
      { top: 0, left: 0 },
      { top: 2, left: 400 },
      { top: 300, left: 0 },
    ];
    expect(vecinoEnRejilla(posiciones, 1, 'ArrowDown')).toBe(2);
  });

  it('Inicio y Fin van a la primera y a la última', () => {
    expect(vecinoEnRejilla(tres, 4, 'Home')).toBe(0);
    expect(vecinoEnRejilla(tres, 1, 'End')).toBe(6);
  });

  it('otras teclas no mueven', () => {
    expect(vecinoEnRejilla(tres, 1, 'Enter')).toBeNull();
    expect(vecinoEnRejilla([], 0, 'ArrowRight')).toBeNull();
  });
});
