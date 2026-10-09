import { describe, expect, it } from 'vitest';
import {
  coincideTrabajador,
  filtrarCasos,
  inicioDePeriodo,
  textoDeFoco,
  type CasoDePanel,
  type FiltrosDeCasos,
} from './incapacidadesPanel';

const HOY = '2026-10-09';

const caso = (
  id: string,
  campos: Partial<CasoDePanel['caso']> = {},
  resto: Partial<CasoDePanel> = {},
): CasoDePanel => ({
  idTrabajador: 't1',
  caso: {
    _id: id,
    ramo: 'enfermedadGeneral',
    fechaInicio: '2026-09-01T00:00:00.000Z',
    diasAcumulados: 3,
    fechaTerminoUltimaIncapacidad: '2026-09-03T00:00:00.000Z',
    ...campos,
  },
  incapacidades: [],
  estado: 'terminado',
  dias: { total: 3, subsidiados: 0, sinSubsidio: 3, aCargoEmpresa: 0 },
  incapacitadoHoy: false,
  ...resto,
});

const filtros = (cambios: Partial<FiltrosDeCasos> = {}): FiltrosDeCasos => ({
  ramo: '',
  estado: '',
  periodo: 'todo',
  trabajadores: null,
  ...cambios,
});

const ids = (casos: CasoDePanel[]) => casos.map((item) => item.caso._id);

describe('seguimiento de incapacidades por empresa', () => {
  it('calcula el inicio de cada periodo', () => {
    expect(inicioDePeriodo('ultimos30', HOY)).toBe('2026-09-09');
    expect(inicioDePeriodo('ultimos12Meses', HOY)).toBe('2025-10-09');
    expect(inicioDePeriodo('esteAnio', HOY)).toBe('2026-01-01');
    expect(inicioDePeriodo('todo', HOY)).toBe('');
  });

  it('filtra por ramo, estado y trabajadores visibles', () => {
    const casos = [
      caso('a'),
      caso('b', { ramo: 'riesgoTrabajo' }, { estado: 'activo' }),
      caso('c', {}, { idTrabajador: 't2' }),
    ];
    expect(ids(filtrarCasos(casos, filtros({ ramo: 'riesgoTrabajo' }), HOY))).toEqual(['b']);
    expect(ids(filtrarCasos(casos, filtros({ estado: 'terminado' }), HOY))).toEqual(['a', 'c']);
    expect(ids(filtrarCasos(casos, filtros({ trabajadores: new Set(['t2']) }), HOY))).toEqual(['c']);
  });

  it('el periodo toma el último día de incapacidad; los casos activos siempre entran', () => {
    const casos = [
      caso('reciente', { fechaTerminoUltimaIncapacidad: '2026-09-20T00:00:00.000Z' }),
      caso('deEsteAnio', {
        fechaInicio: '2026-02-02T00:00:00.000Z',
        fechaTerminoUltimaIncapacidad: '2026-02-04T00:00:00.000Z',
      }),
      caso('antiguo', {
        fechaInicio: '2024-02-02T00:00:00.000Z',
        fechaTerminoUltimaIncapacidad: '2024-02-04T00:00:00.000Z',
      }),
      caso(
        'riesgoAbierto',
        { ramo: 'riesgoTrabajo', fechaInicio: '2024-05-06T00:00:00.000Z', fechaTerminoUltimaIncapacidad: undefined },
        { estado: 'activo' },
      ),
    ];
    const en = (periodo: FiltrosDeCasos['periodo']) => ids(filtrarCasos(casos, filtros({ periodo }), HOY));
    expect(en('ultimos30')).toEqual(['reciente', 'riesgoAbierto']);
    expect(en('esteAnio')).toEqual(['reciente', 'deEsteAnio', 'riesgoAbierto']);
    expect(en('todo')).toHaveLength(4);
  });

  it('un caso sin incapacidades se ubica por su fecha de inicio', () => {
    const sinIncapacidad = caso('x', {
      fechaInicio: '2026-10-01T00:00:00.000Z',
      fechaTerminoUltimaIncapacidad: undefined,
    });
    expect(ids(filtrarCasos([sinIncapacidad], filtros({ periodo: 'ultimos30' }), HOY))).toEqual(['x']);
  });

  it('busca al trabajador sin acentos ni mayúsculas, por nombre o número de empleado', () => {
    const ana = {
      _id: 't1',
      nombre: 'Ana María',
      primerApellido: 'López',
      numeroEmpleado: 'E-045',
      idCentroTrabajo: 'c1',
    };
    expect(coincideTrabajador(ana, '')).toBe(true);
    expect(coincideTrabajador(ana, 'lopez ana')).toBe(true);
    expect(coincideTrabajador(ana, 'e-045')).toBe(true);
    expect(coincideTrabajador(ana, 'pérez')).toBe(false);
  });

  it('el texto del foco lleva el dato solo cuando aporta', () => {
    expect(textoDeFoco({ tipo: 'prolongada', detalle: '45 días' })).toBe('Incapacidad prolongada · 45 días');
    expect(textoDeFoco({ tipo: 'secuelas', detalle: 'Con secuelas' })).toBe('Con secuelas');
    expect(textoDeFoco({ tipo: 'frecuentes', detalle: '3 casos en 12 meses' })).toBe(
      'Incapacidades frecuentes · 3 casos en 12 meses',
    );
  });
});
