import { describe, expect, it } from 'vitest';
import type { ConteosVigencia, EmpresaVigencias } from '@/api/VigenciasAptitudAPI';
import {
  filasExcelPendientes,
  nombreArchivoPendientes,
  ocultasPorPendientes,
  ordenarEmpresas,
  porcentajeAlDia,
  separarSecciones,
  textoDias,
  textoMotivo,
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

const empresa = (
  nombreEmpresa: string,
  parcial: Partial<ConteosVigencia>,
  seguimiento: EmpresaVigencias['seguimiento'] = 'EN_SEGUIMIENTO',
): EmpresaVigencias => ({
  idEmpresa: nombreEmpresa,
  nombreEmpresa,
  seguimiento,
  reactivadoEn: null,
  ultimaAptitud: null,
  conteos: conteos(parcial),
  centros: [],
});

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

  it('separa las secciones; «solo con pendientes» aplica solo a la principal', () => {
    const lista = [
      empresa('Al día', { vigentes: 5 }),
      empresa('Pendiente', { porVencer: 1 }),
      empresa('Reactivada', { sinAptitud: 1 }, 'REACTIVADA'),
      empresa('Vieja', { vencidasAntiguas: 3 }, 'SIN_ACTIVIDAD'),
      empresa('Pausada', { vencidasAntiguas: 3 }, 'PAUSADA'),
    ];
    const secciones = separarSecciones(lista, { busqueda: '', soloPendientes: true, orden: 'urgencia' });
    expect(secciones.principal.map((e) => e.nombreEmpresa)).toEqual(['Pendiente', 'Reactivada']);
    expect(secciones.sinActividad.map((e) => e.nombreEmpresa)).toEqual(['Vieja']);
    expect(secciones.pausadas.map((e) => e.nombreEmpresa)).toEqual(['Pausada']);
    expect(ocultasPorPendientes(lista, '')).toBe(1);

    const todas = separarSecciones(lista, { busqueda: '', soloPendientes: false, orden: 'nombre' });
    expect(todas.principal.map((e) => e.nombreEmpresa)).toEqual(['Al día', 'Pendiente', 'Reactivada']);
  });

  it('busca sin importar acentos ni mayúsculas, en todas las secciones', () => {
    const lista = [
      empresa('Construcción Peña', { porVencer: 1 }),
      empresa('Peñoles', { vencidasAntiguas: 1 }, 'PAUSADA'),
      empresa('Otra', { porVencer: 1 }),
    ];
    const secciones = separarSecciones(lista, { busqueda: 'PENA', soloPendientes: false, orden: 'urgencia' });
    expect(secciones.principal.map((e) => e.nombreEmpresa)).toEqual(['Construcción Peña']);
    expect(separarSecciones(lista, { busqueda: 'penol', soloPendientes: false, orden: 'urgencia' }).pausadas).toHaveLength(1);
  });

  it('textos de motivo y de días', () => {
    expect(textoMotivo('CAMBIO_PROVEEDOR')).toBe('Cambió de proveedor');
    expect(textoMotivo('OTRO', 'Cerró la planta')).toBe('Cerró la planta');
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
