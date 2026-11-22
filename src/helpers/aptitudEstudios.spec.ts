import { describe, expect, it } from 'vitest';
import { filasEstudiosAptitud } from './aptitudEstudios';

const FECHA = '2026-06-15';

describe('filasEstudiosAptitud (tabla de estudios de la aptitud, punto 45)', () => {
  it('sin documentos: las cuatro filas fijas con «-»', () => {
    const filas = filasEstudiosAptitud({}, [], FECHA);
    expect(filas.map((f) => f.clave)).toEqual(['historiaClinica', 'exploracionFisica', 'adiposidadCorporal', 'examenVista']);
    expect(filas.every((f) => f.fecha === null && f.resumen === '-')).toBe(true);
  });

  it('toma el documento más cercano del mismo año y arma los resúmenes como el documento', () => {
    const filas = filasEstudiosAptitud(
      {
        historiaClinica: [
          { fechaHistoriaClinica: '2025-06-14', resumenHistoriaClinica: 'Del año pasado' },
          { fechaHistoriaClinica: '2026-06-10', resumenHistoriaClinica: 'Tabaquismo negado' },
        ],
        exploracionFisica: [
          {
            fechaExploracionFisica: '2026-06-12',
            tensionArterialSistolica: 120,
            tensionArterialDiastolica: 80,
            categoriaTensionArterial: 'Óptima',
            resumenExploracionFisica: 'Sin alteraciones',
            indiceMasaCorporal: 24.1,
            categoriaIMC: 'Normal',
          },
        ],
        audiometria: [{ fechaAudiometria: '2026-06-01', diagnosticoAudiometria: 'Audición normal.', hipoacusiaBilateralCombinada: 0 }],
        antidoping: [{ fechaAntidoping: '2026-06-02', marihuana: 'Negativo', cocaina: 'Negativo', anfetaminas: 'Negativo', metanfetaminas: 'Negativo', opiaceos: 'Negativo' }],
      },
      [
        { tipoEstudio: 'EKG', fechaEstudio: '2026-03-01', resultadoGlobal: 'NORMAL' },
        { tipoEstudio: 'ESPIROMETRIA', fechaEstudio: '2026-03-01', resultadoGlobal: 'NO_CONCLUYENTE' },
        { tipoEstudio: 'RAYOS_X', fechaEstudio: '2026-03-01', resultadoGlobal: 'ANORMAL', tipoAlteracionRayosX: ['NODULO_O_MASA'] },
      ],
      FECHA,
    );
    const por = Object.fromEntries(filas.map((f) => [f.clave, f]));
    expect(por.historiaClinica).toMatchObject({ fecha: '2026-06-10', resumen: 'Tabaquismo negado' });
    expect(por.exploracionFisica.resumen).toBe('TA: 120/80 mmHg - Óptima. Sin alteraciones.');
    expect(por.adiposidadCorporal.resumen).toMatch(/^IMC: 24.1 - Normal\./);
    expect(por.audiometria.resumen).toBe('Audición normal. HBC 0%');
    expect(por.antidoping.resumen).toBe('Negativo a cinco parámetros');
    expect(por.ekg.resumen).toBe('Normal, valores dentro del rango de referencia');
    expect(por.espirometria).toBeUndefined();
    expect(por.rayosX.resumen).toBe('Nódulo o masa');
  });

  it('cambia con la fecha de la aptitud', () => {
    const vecinos = { examenVista: [{ fechaExamenVista: '2025-01-10', porcentajeIshihara: 100, interpretacionIshihara: 'Normal' }] };
    expect(filasEstudiosAptitud(vecinos, [], FECHA).find((f) => f.clave === 'examenVista')?.resumen).toBe('-');
    expect(filasEstudiosAptitud(vecinos, [], '2025-02-01').find((f) => f.clave === 'examenVista')?.resumen).toContain('Ishihara: 100% - Normal');
  });
});
