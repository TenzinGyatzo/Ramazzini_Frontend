import { describe, expect, it } from 'vitest';
import {
  filasDesdeDocumento,
  filasValidas,
  mensajesDeInventario,
} from './insumosSuministrados';

describe('insumos suministrados', () => {
  it('lee lo guardado en el documento, con el insumo como id o poblado', () => {
    expect(
      filasDesdeDocumento([
        { idInsumo: 'a1', cantidad: 2, uso: 'ENTREGADO' },
        { idInsumo: { _id: 'b2', nombre: 'Gasa' }, cantidad: 3 },
        { cantidad: 1 },
      ]),
    ).toEqual([
      { idInsumo: 'a1', cantidad: 2, uso: 'ENTREGADO' },
      { idInsumo: 'b2', cantidad: 3, uso: 'ADMINISTRADO' },
    ]);
    expect(filasDesdeDocumento(undefined)).toEqual([]);
  });

  it('solo guarda renglones completos, enteros y sin insumos repetidos', () => {
    expect(
      filasValidas([
        { idInsumo: 'a1', cantidad: 2, uso: 'ENTREGADO' },
        { idInsumo: '', cantidad: 1, uso: 'ADMINISTRADO' },
        { idInsumo: 'b2', cantidad: 0, uso: 'ADMINISTRADO' },
        { idInsumo: 'c3', cantidad: 1.5, uso: 'ADMINISTRADO' },
        { idInsumo: 'd4', cantidad: '', uso: 'ADMINISTRADO' },
        { idInsumo: 'a1', cantidad: 9, uso: 'ADMINISTRADO' },
      ]),
    ).toEqual([{ idInsumo: 'a1', cantidad: 2, uso: 'ENTREGADO' }]);
  });

  it('arma los mensajes de lo que movió el guardado', () => {
    expect(
      mensajesDeInventario({
        descontados: [
          { nombre: 'Paracetamol 500 mg', unidad: 'tableta', cantidad: 2 },
          { nombre: 'Gasa', unidad: 'pieza', cantidad: 3 },
        ],
        devueltos: [{ nombre: 'Venda', unidad: 'pieza', cantidad: 1 }],
        avisos: ['Falta existencia'],
      }),
    ).toEqual({
      info: [
        'Se descontaron del inventario: Paracetamol 500 mg × 2, Gasa × 3',
        'Se devolvieron al inventario: Venda × 1',
      ],
      avisos: ['Falta existencia'],
    });
    expect(mensajesDeInventario(undefined)).toEqual({ info: [], avisos: [] });
  });
});
