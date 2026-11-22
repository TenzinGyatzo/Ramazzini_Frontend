import { describe, expect, it } from 'vitest';
import { motivoSugeridoConRazon, sugerirMotivoExamenHC } from './motivoExamenSugerido';

const sugerir = (fechaHistoriaClinica: string, fechasAptitudes: Array<string | null>, fechaIngreso?: string | null) =>
  sugerirMotivoExamenHC({ fechaHistoriaClinica, fechasAptitudes, fechaIngreso });

describe('motivo del examen sugerido para una historia clínica nueva (punto 53)', () => {
  it('con una aptitud anterior a la historia clínica es periódico, sin importar la antigüedad', () => {
    expect(sugerir('2026-11-22', ['2025-11-10T00:00:00.000Z'], '2026-11-20')).toBe('Periódico');
    expect(sugerir('2026-11-22', ['2026-11-21'], null)).toBe('Periódico');
  });

  it('una aptitud del mismo día o posterior no cuenta como previa', () => {
    expect(sugerir('2026-11-22', ['2026-11-22T00:00:00.000Z', '2026-12-01'], '2026-11-15')).toBe('Ingreso');
  });

  it('sin aptitud previa: menos de un mes de antigüedad es ingreso; un mes o más, inicial', () => {
    expect(sugerir('2026-11-22', [], '2026-10-23')).toBe('Ingreso');
    expect(sugerir('2026-11-22', [], '2026-10-22')).toBe('Inicial');
    expect(sugerir('2026-11-22', [], '2024-01-05T00:00:00.000Z')).toBe('Inicial');
    // Ingreso posterior a la historia clínica (contratación en curso)
    expect(sugerir('2026-11-22', [], '2026-12-01')).toBe('Ingreso');
  });

  it('el mes se cuenta por calendario (31 de enero → 28 de febrero)', () => {
    expect(sugerir('2027-02-27', [], '2027-01-31')).toBe('Ingreso');
    expect(sugerir('2027-02-28', [], '2027-01-31')).toBe('Inicial');
    expect(sugerir('2027-01-14', [], '2026-12-15')).toBe('Ingreso');
    expect(sugerir('2027-01-15', [], '2026-12-15')).toBe('Inicial');
  });

  it('sin fecha de ingreso ni aptitud previa no sugiere nada', () => {
    expect(sugerir('2026-11-22', [], null)).toBeNull();
    expect(sugerir('2026-11-22', [], 'No recuerda')).toBeNull();
    expect(sugerir('', [], '2020-01-01')).toBeNull();
  });

  it('explica por qué: la aptitud anterior más reciente o la fecha de ingreso', () => {
    expect(
      motivoSugeridoConRazon({ fechaHistoriaClinica: '2026-11-22', fechasAptitudes: ['2024-05-02', '2025-11-10T00:00:00.000Z'], fechaIngreso: '2020-01-01' }),
    ).toEqual({ motivo: 'Periódico', razon: 'Ya tiene una aptitud anterior (10 de noviembre de 2025).' });
    expect(motivoSugeridoConRazon({ fechaHistoriaClinica: '2026-11-22', fechasAptitudes: [], fechaIngreso: '2026-11-10' })?.razon).toBe(
      'Sin aptitud anterior; ingresó hace menos de un mes (10 de noviembre de 2026).',
    );
    expect(motivoSugeridoConRazon({ fechaHistoriaClinica: '2026-11-22', fechasAptitudes: [], fechaIngreso: '2022-03-01' })?.razon).toBe(
      'Sin aptitud anterior; ingresó hace un mes o más (1 de marzo de 2022).',
    );
  });
});
