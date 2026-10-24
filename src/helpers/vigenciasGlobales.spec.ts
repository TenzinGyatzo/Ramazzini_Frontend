import { describe, expect, it } from 'vitest';
import type { ConteosVigencia, EmpresaParaElegir, EmpresaVigencias } from '@/api/VigenciasAptitudAPI';
import {
  cambiosDeSeleccion,
  filasExcelPendientes,
  filtrarEmpresas,
  filtrarParaElegir,
  nombreArchivoPendientes,
  ocultasPorPendientes,
  ordenarEmpresas,
  porcentajeAlDia,
  textoDias,
} from './vigenciasGlobales';

const conteos = (parcial: Partial<ConteosVigencia> = {}): ConteosVigencia => {
  const base = {
    vigentes: 0,
    porVencer: 0,
    vencidasRecientes: 0,
    vencidasAntiguas: 0,
    sinAptitud: 0,
    vencen30: 0,
    vencen60: 0,
    vencen90: 0,
    ...parcial,
  };
  return {
    ...base,
    activos: base.vigentes + base.porVencer + base.vencidasRecientes + base.vencidasAntiguas + base.sinAptitud,
  };
};

const empresa = (nombreEmpresa: string, parcial: Partial<ConteosVigencia>): EmpresaVigencias => ({
  idEmpresa: nombreEmpresa,
  nombreEmpresa,
  ultimaAptitud: null,
  conteos: conteos(parcial),
  centros: [],
});

const paraElegir = (
  nombreEmpresa: string,
  seleccionada: boolean,
  ultimaAptitud: string | null = null,
): EmpresaParaElegir => ({ idEmpresa: nombreEmpresa, nombreEmpresa, seleccionada, activos: 1, ultimaAptitud });

describe('vista de vigencias', () => {
  it('porcentaje al día: vigentes y por vencer sobre activos', () => {
    expect(porcentajeAlDia(conteos({ vigentes: 2, porVencer: 1, vencidasRecientes: 1 }))).toBe(75);
    expect(porcentajeAlDia(conteos())).toBeNull();
  });

  it('ordena por urgencia, por % al día o por nombre', () => {
    const lista = [
      empresa('Antigua', { vencidasAntiguas: 9 }),
      empresa('Urgente', { porVencer: 3, vencidasRecientes: 2 }),
      empresa('Sin aptitud', { vencidasRecientes: 1, sinAptitud: 4 }),
      empresa('Ábaco', { vencidasRecientes: 1, vigentes: 1 }),
    ];
    expect(ordenarEmpresas(lista, 'urgencia').map((e) => e.nombreEmpresa)).toEqual([
      'Urgente',
      'Sin aptitud',
      'Ábaco',
      'Antigua',
    ]);
    expect(ordenarEmpresas(lista, 'alDia').map((e) => e.nombreEmpresa)).toEqual([
      'Antigua',
      'Sin aptitud',
      'Ábaco',
      'Urgente',
    ]);
    expect(ordenarEmpresas(lista, 'nombre')[0].nombreEmpresa).toBe('Ábaco');
  });

  it('«solo con pendientes» oculta las empresas al día', () => {
    const lista = [
      empresa('Al día', { vigentes: 5 }),
      empresa('Pendiente', { porVencer: 1 }),
      empresa('Sin aptitud', { sinAptitud: 1 }),
      empresa('Vacía', {}),
    ];
    expect(
      filtrarEmpresas(lista, { busqueda: '', soloPendientes: true, orden: 'urgencia' }).map((e) => e.nombreEmpresa),
    ).toEqual(['Pendiente', 'Sin aptitud']);
    expect(ocultasPorPendientes(lista, '')).toBe(2);
    expect(filtrarEmpresas(lista, { busqueda: '', soloPendientes: false, orden: 'nombre' })).toHaveLength(4);
  });

  it('busca sin importar acentos ni mayúsculas', () => {
    const lista = [empresa('Construcción Peña', { porVencer: 1 }), empresa('Otra', { porVencer: 1 })];
    expect(
      filtrarEmpresas(lista, { busqueda: 'PENA', soloPendientes: false, orden: 'urgencia' }).map((e) => e.nombreEmpresa),
    ).toEqual(['Construcción Peña']);
  });

  it('elegir empresas: busca y ordena por nombre o última aptitud', () => {
    const lista = [
      paraElegir('Beta', false, '2026-01-10T00:00:00.000Z'),
      paraElegir('Alfa', true, null),
      paraElegir('Gamma', false, '2026-09-01T00:00:00.000Z'),
    ];
    expect(filtrarParaElegir(lista, '', 'nombre').map((e) => e.nombreEmpresa)).toEqual(['Alfa', 'Beta', 'Gamma']);
    expect(filtrarParaElegir(lista, '', 'ultimaAptitud').map((e) => e.nombreEmpresa)).toEqual([
      'Gamma',
      'Beta',
      'Alfa',
    ]);
    expect(filtrarParaElegir(lista, 'gam', 'nombre').map((e) => e.nombreEmpresa)).toEqual(['Gamma']);
  });

  it('elegir empresas: solo envía lo que cambió', () => {
    const lista = [paraElegir('A', true), paraElegir('B', false), paraElegir('C', true)];
    expect(cambiosDeSeleccion(lista, new Set(['A', 'B']))).toEqual([
      { idEmpresa: 'B', seleccionada: true },
      { idEmpresa: 'C', seleccionada: false },
    ]);
    expect(cambiosDeSeleccion(lista, new Set(['A', 'C']))).toEqual([]);
  });

  it('textos de días', () => {
    expect(textoDias(45)).toBe('45 días restantes');
    expect(textoDias(1)).toBe('1 día restante');
    expect(textoDias(0)).toBe('Vence hoy');
    expect(textoDias(-35)).toBe('Vencida hace 35 días');
    expect(textoDias(null)).toBe('');
  });

  it('filas del Excel de pendientes', () => {
    expect(
      filasExcelPendientes([
        {
          idTrabajador: 't1',
          nombreCentro: 'Planta',
          nombre: 'Ana',
          primerApellido: 'López',
          segundoApellido: 'Ruiz',
          numeroEmpleado: '-',
          puesto: 'Operadora',
          fechaUltimaAptitud: '2025-09-01T00:00:00.000Z',
          fechaVencimiento: '2026-09-01T00:00:00.000Z',
          estado: 'VENCIDA_RECIENTE',
          diasRestantes: -40,
        },
        {
          idTrabajador: 't2',
          nombreCentro: 'Planta',
          nombre: 'Luis',
          primerApellido: 'Mora',
          segundoApellido: '',
          numeroEmpleado: '12',
          puesto: 'Chofer',
          fechaUltimaAptitud: null,
          fechaVencimiento: null,
          estado: null,
          diasRestantes: null,
        },
      ]),
    ).toEqual([
      {
        'Centro de trabajo': 'Planta',
        'Nombre completo': 'López Ruiz Ana',
        'Num. Trab.': '',
        Puesto: 'Operadora',
        'Última aptitud': '01-09-2025',
        'Vence el': '01-09-2026',
        Estado: 'Vencida',
        Días: 'Vencida hace 40 días',
      },
      {
        'Centro de trabajo': 'Planta',
        'Nombre completo': 'Mora Luis',
        'Num. Trab.': '12',
        Puesto: 'Chofer',
        'Última aptitud': '',
        'Vence el': '',
        Estado: 'Sin aptitud',
        Días: '',
      },
    ]);
  });

  it('nombre del archivo sin caracteres inválidos', () => {
    expect(nombreArchivoPendientes('Aceros: Norte/Sur', new Date(2026, 9, 24))).toBe(
      'Pendientes de aptitud - Aceros Norte Sur - 2026-10-24.xlsx',
    );
  });
});
