import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DISTRIBUCION_HALLAZGOS_ILA,
  EVOLUCION_SEGUIMIENTO_ILA,
  RELACION_LABORAL_ILA,
  advertenciasDecisionesConclusionIla,
  hayAlgunaDecisionConclusionIla,
} from './ilaConclusionDecisiones';

describe('decisionesConclusionIla', () => {
  it('inicia sin ninguna decisión seleccionada', () => {
    expect(hayAlgunaDecisionConclusionIla({})).toBe(false);
    expect(hayAlgunaDecisionConclusionIla(undefined)).toBe(false);
  });

  it('advierte combinaciones no concluyente + probable sin bloquear', () => {
    expect(
      advertenciasDecisionesConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.NO_CONCLUSIVO,
        relacionLaboral: RELACION_LABORAL_ILA.PROBABLE,
      }),
    ).toEqual(['La evolución se marcó no concluyente y la relación laboral como probable.']);
    expect(
      advertenciasDecisionesConclusionIla({
        distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.NO_CONCLUSIVO,
        relacionLaboral: RELACION_LABORAL_ILA.PROBABLE,
      }),
    ).toEqual(['La distribución se marcó no concluyente y la relación laboral como probable.']);
  });

  it('no usa la palabra afectación', () => {
    const src = readFileSync(
      path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'ilaConclusionDecisiones.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/afectaci[oó]n/i);
  });
});
