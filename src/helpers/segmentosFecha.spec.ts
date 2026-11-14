import { describe, expect, it } from 'vitest';
import {
  borrar,
  borrarTodo,
  cambiarConFlecha,
  escribirDigito,
  estadoDesdeIso,
  estadoDesdeTextoPegado,
  estadoVacio,
  irA,
  isoDe,
  separador,
  textoDe,
  type EstadoFecha,
} from './segmentosFecha';

const teclear = (e: EstadoFecha, numeros: string) =>
  [...numeros].reduce((acc, c) => (c === '/' ? separador(acc) : escribirDigito(acc, Number(c))), e);

describe('captura por partes, como el campo de fecha del navegador', () => {
  it('la plantilla dd/mm/aaaa está siempre a la vista; cada número reemplaza su letra', () => {
    let e = estadoVacio();
    expect(textoDe(e)).toBe('dd/mm/aaaa');
    e = escribirDigito(e, 1);
    expect(textoDe(e)).toBe('1d/mm/aaaa');
    e = escribirDigito(e, 5);
    // Completo el día, pasa solo al mes
    expect(textoDe(e)).toBe('15/mm/aaaa');
    expect(e.segmento).toBe(1);
    e = teclear(e, '08');
    expect(textoDe(e)).toBe('15/08/aaaa');
    e = teclear(e, '19');
    expect(textoDe(e)).toBe('15/08/19aa');
    e = teclear(e, '85');
    expect(textoDe(e)).toBe('15/08/1985');
    expect(isoDe(e)).toBe('1985-08-15');
  });

  it('un día de 4 a 9 o un mes de 2 a 9 se completan con 0 y pasan a la siguiente parte', () => {
    const e = teclear(estadoVacio(), '5');
    expect(textoDe(e)).toBe('05/mm/aaaa');
    expect(e.segmento).toBe(1);
    expect(textoDe(teclear(e, '3'))).toBe('05/03/aaaa');
  });

  it('«/» pasa a la siguiente parte y completa con 0', () => {
    expect(textoDe(teclear(estadoVacio(), '5/1/2026'))).toBe('05/01/2026');
  });

  it('día y mes no pasan de su máximo', () => {
    expect(textoDe(teclear(estadoVacio(), '39'))).toBe('31/mm/aaaa');
    expect(textoDe(teclear(estadoVacio(), '0519'))).toBe('05/12/aaaa');
  });

  it('borrar regresa la parte a sus letras sin tocar las demás', () => {
    let e = estadoDesdeIso('2026-11-05');
    e = irA(e, 1);
    e = borrar(e);
    expect(textoDe(e)).toBe('05/mm/2026');
    expect(isoDe(e)).toBe('');
    // Otra vez con la parte vacía: pasa a la anterior (sin borrarla)
    e = borrar(e);
    expect(e.segmento).toBe(0);
    expect(textoDe(e)).toBe('05/mm/2026');
    expect(textoDe(borrarTodo())).toBe('dd/mm/aaaa');
  });

  it('escribir sobre una parte la reemplaza', () => {
    let e = irA(estadoDesdeIso('2026-11-05'), 0);
    e = teclear(e, '12');
    expect(textoDe(e)).toBe('12/11/2026');
  });

  it('↑/↓ suben o bajan la parte; vacía empieza en la de hoy', () => {
    let e = irA(estadoDesdeIso('2026-11-30'), 0);
    e = cambiarConFlecha(e, 1);
    expect(textoDe(e)).toBe('31/11/2026');
    e = cambiarConFlecha(e, 1);
    expect(textoDe(e)).toBe('01/11/2026');
    e = cambiarConFlecha(irA(e, 1), -1);
    expect(textoDe(e)).toBe('01/10/2026');
    const vacia = cambiarConFlecha(estadoVacio(), 1);
    expect(textoDe(vacia)).toMatch(/^\d{2}\/mm\/aaaa$/);
  });

  it('fechas imposibles no se entregan (31/02)', () => {
    expect(isoDe(teclear(estadoVacio(), '31022026'))).toBe('');
  });

  it('pegar AAAA-MM-DD o DD/MM/AAAA', () => {
    expect(textoDe(estadoDesdeTextoPegado('2026-11-05')!)).toBe('05/11/2026');
    expect(textoDe(estadoDesdeTextoPegado('5/11/2026')!)).toBe('05/11/2026');
    expect(estadoDesdeTextoPegado('hola')).toBeNull();
  });
});
