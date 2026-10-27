import { describe, expect, it } from 'vitest';
import { esTeclaDeSalto, indicePorTexto, vecinoEnRejilla, type PosicionTarjeta } from './navegacionTarjetas';

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

describe('salto por letra', () => {
  const nombres = ['Aceros', 'Comercial Delta', 'Constructora Peña', 'Ébano Muebles', 'Delta', 'Distribuidora'];

  it('una letra va a la primera que empieza con ella', () => {
    expect(indicePorTexto(nombres, -1, 'd')).toBe(4);
    expect(indicePorTexto(nombres, -1, 'D')).toBe(4);
  });

  it('repetir la letra avanza y al final vuelve a la primera', () => {
    expect(indicePorTexto(nombres, 4, 'd')).toBe(5);
    expect(indicePorTexto(nombres, 5, 'dd')).toBe(4);
  });

  it('varias letras buscan ese inicio desde la actual', () => {
    expect(indicePorTexto(nombres, 1, 'con')).toBe(2);
    expect(indicePorTexto(nombres, 1, 'co')).toBe(1);
  });

  it('sin acentos', () => {
    expect(indicePorTexto(nombres, -1, 'e')).toBe(3);
  });

  it('sin coincidencias no se mueve', () => {
    expect(indicePorTexto(nombres, 0, 'z')).toBeNull();
    expect(indicePorTexto([], -1, 'a')).toBeNull();
  });

  it('solo letras y números cuentan', () => {
    expect(esTeclaDeSalto('d')).toBe(true);
    expect(esTeclaDeSalto('Ñ')).toBe(true);
    expect(esTeclaDeSalto('7')).toBe(true);
    expect(esTeclaDeSalto(' ')).toBe(false);
    expect(esTeclaDeSalto('Enter')).toBe(false);
    expect(esTeclaDeSalto('/')).toBe(false);
  });
});
