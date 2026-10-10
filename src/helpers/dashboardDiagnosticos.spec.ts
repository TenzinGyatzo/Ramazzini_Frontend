import { describe, expect, it } from 'vitest';
import {
  capituloDe,
  consultasPorMes,
  resumirDiagnosticos,
  type DiagnosticoDeTablero,
} from './dashboardDiagnosticos';

const dx = (clave: string, campos: Partial<DiagnosticoDeTablero> = {}): DiagnosticoDeTablero => ({
  clave,
  etiqueta: clave,
  principal: true,
  mes: '2026-03',
  ...campos,
});

describe('diagnósticos de consultas en el tablero de salud', () => {
  it('ubica cada código en su capítulo de la CIE-10', () => {
    expect(capituloDe('J00X')?.etiqueta).toBe('Sistema respiratorio');
    expect(capituloDe('M545')?.etiqueta).toBe('Sistema musculoesquelético');
    expect(capituloDe('I10X')?.etiqueta).toBe('Sistema circulatorio');
    // H se reparte entre ojo y oído; D, entre tumores y sangre
    expect(capituloDe('H109')?.etiqueta).toBe('Ojo y sus anexos');
    expect(capituloDe('H919')?.etiqueta).toBe('Oído');
    expect(capituloDe('D481')?.etiqueta).toBe('Tumores');
    expect(capituloDe('D509')?.etiqueta).toBe('Sangre e inmunidad');
    expect(capituloDe('S934')?.etiqueta).toBe('Traumatismos y envenenamientos');
    expect(capituloDe('T140')?.etiqueta).toBe('Traumatismos y envenenamientos');
    expect(capituloDe('Z000')?.etiqueta).toBe('Factores que influyen en la salud');
    // Huecos entre capítulos y valores que no son códigos
    expect(capituloDe('D49')).toBeNull();
    expect(capituloDe('XX')).toBeNull();
  });

  it('cuenta los diagnósticos por código, del más al menos frecuente', () => {
    const resumen = resumirDiagnosticos([
      dx('J00X', { etiqueta: 'J00X' }),
      dx('J00X', { etiqueta: 'J00X - RINOFARINGITIS AGUDA', principal: false }),
      dx('M545', { etiqueta: 'M545 - LUMBAGO' }),
      dx('J029', { etiqueta: 'J029 - FARINGITIS AGUDA' }),
      dx('J00X'),
    ]);
    expect(resumen.total).toBe(5);
    expect(resumen.porCodigo).toEqual([
      // Conserva la etiqueta que trae el nombre
      { clave: 'J00X', etiqueta: 'J00X - RINOFARINGITIS AGUDA', cantidad: 3 },
      { clave: 'J029', etiqueta: 'J029 - FARINGITIS AGUDA', cantidad: 1 },
      { clave: 'M545', etiqueta: 'M545 - LUMBAGO', cantidad: 1 },
    ]);
    expect(resumen.porCapitulo).toEqual([
      { clave: 'X', etiqueta: 'Sistema respiratorio', cantidad: 4 },
      { clave: 'XIII', etiqueta: 'Sistema musculoesquelético', cantidad: 1 },
    ]);
  });

  it('cuenta primera vez y subsecuentes solo donde se indicó', () => {
    const resumen = resumirDiagnosticos([
      dx('J00X', { primeraVez: true }),
      dx('J00X', { primeraVez: false }),
      dx('J00X', { primeraVez: false }),
      dx('J00X'),
    ]);
    expect(resumen.primeraVez).toBe(1);
    expect(resumen.subsecuentes).toBe(2);
  });

  it('un código fuera de los capítulos se agrupa aparte', () => {
    expect(resumirDiagnosticos([dx('D49X')]).porCapitulo).toEqual([
      { clave: 'otro', etiqueta: 'Sin capítulo reconocido', cantidad: 1 },
    ]);
  });

  it('sin diagnósticos todo queda en cero', () => {
    expect(resumirDiagnosticos([])).toEqual({
      total: 0,
      porCodigo: [],
      porCapitulo: [],
      primeraVez: 0,
      subsecuentes: 0,
    });
  });

  it('agrupa las consultas por mes y rellena los meses sin consultas', () => {
    expect(
      consultasPorMes([
        '2025-11-20T00:00:00.000Z',
        '2026-02-03T00:00:00.000Z',
        '2026-02-17T00:00:00.000Z',
        null,
        'sin fecha',
      ]),
    ).toEqual([
      { clave: '2025-11', etiqueta: 'nov 2025', cantidad: 1 },
      { clave: '2025-12', etiqueta: 'dic 2025', cantidad: 0 },
      { clave: '2026-01', etiqueta: 'ene 2026', cantidad: 0 },
      { clave: '2026-02', etiqueta: 'feb 2026', cantidad: 2 },
    ]);
    expect(consultasPorMes([])).toEqual([]);
  });
});
