import { describe, expect, it } from 'vitest';
import casos from './__fixtures__/cie10-edad-casos.json';
import { isAgeAllowedForLinfLsup } from './cie10';
import {
  CIE10_EXCLUIDOS_CONSULTA_EXTERNA,
  mensajeCie10ExcluidoConsultaExterna,
} from './notaMedicaDiagnosticosSis';

/**
 * Punto 37: los mismos casos de borde que prueba el servidor
 * (backend/src/utils/__fixtures__/cie10-edad-casos.json, generado desde el catálogo completo).
 * Si el servidor cambia la regla, se regenera allá y se copia aquí.
 */
const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe('límites de edad de los diagnósticos (punto 37)', () => {
  it('hay casos de todos los límites del catálogo', () => {
    expect(casos.length).toBeGreaterThan(500);
  });

  it('la pantalla da el mismo resultado que el servidor en cada borde', () => {
    const fallas = casos
      .filter((c) => isAgeAllowedForLinfLsup(c.linf, c.lsup, dia(c.nacimiento), dia(c.nota)) !== c.permitido)
      .map((c) => `${c.linf}-${c.lsup} nac ${c.nacimiento} nota ${c.nota} (${c.descripcion}): esperado ${c.permitido}`);
    expect(fallas.slice(0, 10)).toEqual([]);
  });

  it('edad a la fecha de la nota (notas extemporáneas) y tope inclusivo hasta la víspera', () => {
    // Cumple 20 el 16/11/2026: con mínimo de 20, la víspera no y el cumpleaños sí
    expect(isAgeAllowedForLinfLsup('020A', '120A', dia('2006-11-16'), dia('2026-11-15'))).toBe(false);
    expect(isAgeAllowedForLinfLsup('020A', '120A', dia('2006-11-16'), dia('2026-11-16'))).toBe(true);
    // Z003 (10 a 19 años): con 19 años y 11 meses sí; con 20, no
    expect(isAgeAllowedForLinfLsup('010A', '019A', dia('2006-11-16'), dia('2026-11-15'))).toBe(true);
    expect(isAgeAllowedForLinfLsup('010A', '019A', dia('2006-11-16'), dia('2026-11-16'))).toBe(false);
    // Embarazo (9 a 59): 59 años y 10 meses sí
    expect(isAgeAllowedForLinfLsup('009A', '059A', dia('1966-01-10'), dia('2025-11-16'))).toBe(true);
  });

  it('O240–O249 no se admiten, con un mensaje que nombra la clave', () => {
    expect(CIE10_EXCLUIDOS_CONSULTA_EXTERNA).toEqual(['O240', 'O241', 'O242', 'O243', 'O244', 'O249']);
    expect(mensajeCie10ExcluidoConsultaExterna('O244', 'Diagnóstico principal')).toBe(
      'Diagnóstico principal: el código O244 (diabetes mellitus en el embarazo) no se puede registrar en la nota médica.',
    );
  });
});
