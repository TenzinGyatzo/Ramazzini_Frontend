import { describe, expect, it } from 'vitest';
import { SECCIONES_DE_TABLERO, cifrasClave, registrosDe } from './dashboardSecciones';

const centro = (campos: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(campos).map(([clave, lista]) => [clave, [lista]]));

const norte = centro({
  grupoEtario: [{}, {}, {}, {}],
  imc: [{}, {}, {}],
  aptitudes: [
    { aptitudPuesto: 'Apto Sin Restricciones' },
    { aptitudPuesto: 'Apto Con Restricciones' },
  ],
  consultas: [{}, {}, {}, {}, {}],
  agudezaVisual: [{}],
});
const sur = centro({
  grupoEtario: [{}, {}],
  imc: [{}],
  aptitudes: [{ aptitudPuesto: 'Apto Sin Restricciones' }, { aptitudPuesto: 'No Apto' }],
  consultas: [{}],
  agudezaVisual: [],
});

describe('secciones y cifras del tablero de salud', () => {
  it('junta los registros de todos los centros o de uno solo', () => {
    expect(registrosDe([norte, sur], null, 'consultas')).toHaveLength(6);
    expect(registrosDe([norte, sur], 1, 'consultas')).toHaveLength(1);
    expect(registrosDe([norte, sur], 1, 'agudezaVisual')).toEqual([]);
    // Un centro que aún no termina de cargar, o un indicador que no llegó
    expect(registrosDe([norte, undefined], null, 'imc')).toHaveLength(3);
    expect(registrosDe([norte], 0, 'noExiste')).toEqual([]);
    expect(registrosDe([], null, 'imc')).toEqual([]);
  });

  it('resume plantilla, cobertura de exploración, aptitud y consultas', () => {
    expect(cifrasClave([norte, sur], null)).toEqual([
      { clave: 'activos', titulo: 'Trabajadores activos', valor: '6', detalle: 'Plantilla actual' },
      { clave: 'exploracion', titulo: 'Con exploración física', valor: '4', detalle: '67 % de los activos' },
      { clave: 'aptitud', titulo: 'Con aptitud evaluada', valor: '4', detalle: '50 % aptos sin restricciones' },
      { clave: 'consultas', titulo: 'Consultas médicas', valor: '6', detalle: '' },
    ]);
  });

  it('con un centro elegido solo cuenta ese centro', () => {
    const cifras = cifrasClave([norte, sur], 0);
    expect(cifras.map((c) => c.valor)).toEqual(['4', '3', '2', '5']);
    expect(cifras[1].detalle).toBe('75 % de los activos');
  });

  it('con filtros de población lo aclara en la plantilla', () => {
    expect(cifrasClave([norte, sur], null, true)[0].detalle).toBe('Con los filtros elegidos');
  });

  it('sin datos no inventa porcentajes', () => {
    const cifras = cifrasClave([], null);
    expect(cifras.map((c) => c.valor)).toEqual(['0', '0', '0', '0']);
    expect(cifras.map((c) => c.detalle)).toEqual(['Plantilla actual', '', '', '']);
  });

  it('define las secciones en el orden de la pantalla', () => {
    expect(SECCIONES_DE_TABLERO.map((s) => s.id)).toEqual([
      'poblacion',
      'exposicion',
      'saludMental',
      'saludVisual',
      'gabinete',
      'aptitud',
      'diagnosticos',
    ]);
  });
});
