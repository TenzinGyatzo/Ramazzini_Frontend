import { describe, expect, it } from 'vitest';
import { recolectarCamposInvalidos } from './camposInvalidosTrabajador';

const nodo = (name: string, valid: boolean, type = 'input') => ({
  type,
  name,
  context: { state: { valid } },
  walk: () => {},
});

const formulario = (hijos: ReturnType<typeof nodo>[]) => ({
  type: 'group',
  name: 'form',
  context: { state: { valid: false } },
  walk: (cb: (n: any) => void) => hijos.forEach(cb),
});

describe('recolectarCamposInvalidos', () => {
  it('devuelve solo los campos inválidos, en orden y con su etiqueta', () => {
    const form = formulario([
      nodo('curp', true),
      nodo('puesto', false),
      nodo('nss', false),
      nodo('municipioResidencia', false),
    ]);
    expect(recolectarCamposInvalidos(form)).toEqual([
      { name: 'puesto', etiqueta: 'Puesto' },
      { name: 'nss', etiqueta: 'NSS' },
      { name: 'municipioResidencia', etiqueta: 'Municipio de residencia' },
    ]);
  });

  it('ignora nodos que no son entradas y nombres repetidos', () => {
    const form = formulario([
      nodo('grupo', false, 'group'),
      nodo('sexo', false),
      nodo('sexo', false),
    ]);
    expect(recolectarCamposInvalidos(form)).toEqual([{ name: 'sexo', etiqueta: 'Sexo' }]);
  });

  it('usa etiquetas propias (p. ej. identificador LATAM) y el nombre si no hay etiqueta', () => {
    const form = formulario([nodo('curp', false), nodo('campoNuevo', false)]);
    expect(recolectarCamposInvalidos(form, { curp: 'DPI' })).toEqual([
      { name: 'curp', etiqueta: 'DPI' },
      { name: 'campoNuevo', etiqueta: 'campoNuevo' },
    ]);
  });

  it('ordena como se ve en pantalla aunque las entradas ocultas se declaren en otro orden', () => {
    const form = formulario([
      nodo('paisResidencia', false),
      nodo('localidadResidencia', false),
      nodo('entidadResidencia', false),
      nodo('puesto', false),
    ]);
    expect(recolectarCamposInvalidos(form).map((c) => c.name)).toEqual([
      'puesto',
      'entidadResidencia',
      'localidadResidencia',
      'paisResidencia',
    ]);
  });

  it('sin formulario devuelve lista vacía', () => {
    expect(recolectarCamposInvalidos(null)).toEqual([]);
  });
});
