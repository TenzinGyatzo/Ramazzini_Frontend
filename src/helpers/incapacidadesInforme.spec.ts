import { describe, expect, it } from 'vitest';
import {
  fechasDePeriodo,
  hojasDeInforme,
  nombreDeArchivo,
  textoDeClave,
  textoDeIndicador,
  textoDeMes,
  type InformeIncapacidades,
} from './incapacidadesInforme';

const informe = (): InformeIncapacidades => ({
  periodo: { desde: '2026-01-01T00:00:00.000Z', hasta: '2026-03-31T00:00:00.000Z', dias: 90 },
  trabajadoresActivos: 40,
  totales: {
    casosNuevos: 3,
    casosPorRamo: { enfermedadGeneral: 2, riesgoTrabajo: 1 },
    riesgosPorTipo: { accidenteTrayecto: 1 },
    dias: { total: 25, subsidiados: 16, sinSubsidio: 6, aCargoEmpresa: 3 },
    diasPorRamo: { enfermedadGeneral: 15, riesgoTrabajo: 10 },
    casosConDias: 3,
    trabajadoresConIncapacidad: 2,
    recaidas: 0,
    incapacidadesPermanentes: 0,
    casosConSecuelas: 1,
    defunciones: 0,
  },
  indicadores: { tasaAusentismo: 0.69, indiceFrecuencia: 0.08, indiceGravedad: 0.63, duracionMedia: 8.33 },
  tendencias: {
    porGrupoDiagnostico: [{ clave: 'respiratorio', casos: 2, dias: 15 }],
    porRegionAnatomica: [{ clave: 'espaldaBaja', casos: 1, dias: 10 }],
    porNaturalezaLesion: [{ clave: 'esguince', casos: 1, dias: 10 }],
    porDuracion: [
      { clave: 'sinIncapacidad', casos: 0 },
      { clave: 'de1a3', casos: 1 },
      { clave: 'de4a7', casos: 0 },
      { clave: 'de8a14', casos: 2 },
      { clave: 'de15a30', casos: 0 },
      { clave: 'de31a90', casos: 0 },
      { clave: 'masDe90', casos: 0 },
    ],
    porPuesto: [{ clave: 'Soldador', casos: 3, dias: 25 }],
    porCentro: [{ clave: 'c1', casos: 3, dias: 25, trabajadoresActivos: 40 }],
    porMes: [
      { mes: '2026-01', casos: 2, dias: 12 },
      { mes: '2026-02', casos: 1, dias: 13 },
      { mes: '2026-03', casos: 0, dias: 0 },
    ],
    porDiaSemana: [0, 2, 0, 0, 0, 1, 0],
    regionPorPuesto: [{ region: 'espaldaBaja', puesto: 'Soldador', casos: 1 }],
  },
  porTrabajador: [
    {
      idTrabajador: 't1',
      casos: 2,
      dias: 20,
      diasPorRamo: { enfermedadGeneral: 10, riesgoTrabajo: 10 },
      ultimaIncapacidad: '2026-02-20T00:00:00.000Z',
    },
  ],
  centros: [{ _id: 'c1', nombreCentro: 'Planta Norte' }],
  trabajadores: [
    { _id: 't1', nombre: 'Ana', primerApellido: 'López', puesto: 'Soldador', idCentroTrabajo: 'c1' },
  ],
  conDiagnosticos: true,
});

describe('informe de incapacidades', () => {
  it('calcula las fechas de cada periodo predefinido', () => {
    const hoy = '2026-10-09';
    expect(fechasDePeriodo('esteMes', hoy)).toEqual({ desde: '2026-10-01', hasta: hoy });
    expect(fechasDePeriodo('esteAnio', hoy)).toEqual({ desde: '2026-01-01', hasta: hoy });
    expect(fechasDePeriodo('anioAnterior', hoy)).toEqual({ desde: '2025-01-01', hasta: '2025-12-31' });
    expect(fechasDePeriodo('ultimos12Meses', hoy)).toEqual({ desde: '2025-10-10', hasta: hoy });
  });

  it('da texto a meses, claves de catálogo e indicadores', () => {
    expect(textoDeMes('2026-03')).toBe('mar 2026');
    expect(textoDeClave(null, 'sinDato')).toBe('Sin especificar');
    expect(textoDeClave(null, 'Soldador')).toBe('Soldador');
    expect(textoDeIndicador(null)).toBe('—');
    expect(textoDeIndicador(8.33)).toBe('8.33');
  });

  it('el archivo para la empresa lleva totales, indicadores y tendencias, sin diagnósticos', () => {
    const hojas = hojasDeInforme(informe(), { empresa: 'Aceros del Norte', centro: 'Todos' });
    expect(hojas.map((hoja) => hoja.nombre)).toEqual(['Resumen', 'Tendencias', 'Por mes', 'Por trabajador']);

    const [resumen, tendencias, porMes, porTrabajador] = hojas.map((hoja) => hoja.filas);
    expect(resumen).toContainEqual(['Periodo', '01-01-2026 al 31-03-2026']);
    expect(resumen).toContainEqual(['Casos nuevos', 3]);
    expect(resumen).toContainEqual(['   Accidente en trayecto', 1]);
    expect(resumen).toContainEqual(['Días subsidiados por el IMSS', 16]);
    expect(resumen).toContainEqual([
      'Duración media',
      8.33,
      'días por caso',
      'Días de incapacidad ÷ casos con días en el periodo',
    ]);

    expect(tendencias).toContainEqual(['Espalda baja (lumbar)', 1, 10]);
    expect(tendencias).toContainEqual(['Planta Norte', 3, 25]);
    expect(tendencias).toContainEqual(['Esguince', 1, 10]);
    expect(tendencias).toContainEqual(['De 8 a 14 días', 2]);
    expect(resumen).toContainEqual(['Casos con secuelas', 1]);
    expect(tendencias).toContainEqual(['Lunes', 2]);
    expect(tendencias).toContainEqual(['Espalda baja (lumbar)', 'Soldador', 1]);
    expect(porMes[1]).toEqual(['ene 2026', 2, 12]);
    expect(porTrabajador[1]).toEqual(['López Ana', 'Soldador', 'Planta Norte', 2, 20, 10, 10, 0, '20-02-2026']);

    const todo = JSON.stringify(hojas);
    expect(todo).not.toContain('Respiratorio');
    expect(todo).not.toContain('respiratorio');
  });

  it('nombra el archivo con la empresa y el periodo', () => {
    expect(nombreDeArchivo(informe(), 'Aceros del Norte, S.A.')).toBe(
      'Incapacidades_Aceros_del_Norte_S_A_2026-01-01_a_2026-03-31.xlsx',
    );
  });
});
