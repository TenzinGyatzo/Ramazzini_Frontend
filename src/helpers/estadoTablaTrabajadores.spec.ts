import { describe, expect, it } from 'vitest';
import {
  claveEstadoTabla,
  estadoParaGuardar,
  guardarEstadoTabla,
  leerEstadoTabla,
  recordarUltimoTrabajador,
  tomarUltimoTrabajador,
} from './estadoTablaTrabajadores';

function almacenEnMemoria() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
    datos,
  };
}

const estadoDataTables = {
  time: 1,
  start: 30,
  length: 25,
  order: [[3, 'asc']],
  search: { search: 'perez', smart: true, regex: false, caseInsensitive: true },
  columns: [{ visible: false, search: { search: '^Apto$' } }],
  childRows: [],
};

describe('estadoTablaTrabajadores', () => {
  it('la clave es por centro de trabajo y sin centro no hay clave', () => {
    expect(claveEstadoTabla('c1')).toBe('ramazzini:tabla-trabajadores:c1');
    expect(claveEstadoTabla(null)).toBeNull();
  });

  it('guarda búsqueda, página, orden y largo, pero no las columnas', () => {
    const estado = estadoParaGuardar(estadoDataTables);
    expect(estado).toEqual({
      time: 1,
      start: 30,
      length: 25,
      order: [[3, 'asc']],
      search: { search: 'perez', smart: true, regex: false, caseInsensitive: true },
    });
    expect(estado).not.toHaveProperty('columns');
  });

  it('cada centro recuerda lo suyo', () => {
    const almacen = almacenEnMemoria();
    guardarEstadoTabla('c1', estadoDataTables, almacen);
    guardarEstadoTabla('c2', { ...estadoDataTables, start: 0, search: { search: 'lopez' } }, almacen);

    expect(leerEstadoTabla('c1', almacen)?.search.search).toBe('perez');
    expect(leerEstadoTabla('c1', almacen)?.start).toBe(30);
    expect(leerEstadoTabla('c2', almacen)?.search.search).toBe('lopez');
    expect(leerEstadoTabla('c3', almacen)).toBeNull();
  });

  it('un estado dañado o un almacén que falla no rompen la tabla', () => {
    const almacen = almacenEnMemoria();
    almacen.datos.set('ramazzini:tabla-trabajadores:c1', '{no es json');
    expect(leerEstadoTabla('c1', almacen)).toBeNull();

    const falla = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
      removeItem: () => {},
    };
    expect(() => guardarEstadoTabla('c1', estadoDataTables, falla)).not.toThrow();
    expect(leerEstadoTabla('c1', falla)).toBeNull();
  });

  it('el último trabajador se toma una sola vez', () => {
    const almacen = almacenEnMemoria();
    recordarUltimoTrabajador('c1', 't9', almacen);
    expect(tomarUltimoTrabajador('c2', almacen)).toBeNull();
    expect(tomarUltimoTrabajador('c1', almacen)).toBe('t9');
    expect(tomarUltimoTrabajador('c1', almacen)).toBeNull();
  });
});
