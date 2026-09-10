import { describe, expect, it } from 'vitest';
import {
  aplicarBorradorConclusionSiNoEditada,
  construirBorradorConclusionIla,
  mostrarRestaurarBorradorConclusionIla,
} from './ilaConclusionBorrador';
import {
  CONFIRMACION_HALLAZGOS_ILA,
  DISTRIBUCION_HALLAZGOS_ILA,
  EVOLUCION_SEGUIMIENTO_ILA,
  RELACION_LABORAL_ILA,
} from './ilaConclusionDecisiones';

describe('construirBorradorConclusionIla', () => {
  it('no genera texto si las cuatro keys están vacías', () => {
    expect(construirBorradorConclusionIla({})).toBe('');
    expect(construirBorradorConclusionIla(undefined)).toBe('');
  });

  it('compone las plantillas del plan carácter a carácter', () => {
    expect(
      construirBorradorConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.ESTABLE,
        distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_SIMILAR,
      }),
    ).toBe(
      'La evolución del seguimiento se considera estable y los hallazgos presentan una distribución bilateral similar.',
    );

    expect(
      construirBorradorConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.PROGRESIVA,
        distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OI,
      }),
    ).toBe(
      'La evolución del seguimiento se considera progresiva, con predominio de los hallazgos en el oído izquierdo.',
    );

    expect(
      construirBorradorConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.FLUCTUANTE,
      }),
    ).toBe('La evolución del seguimiento se considera fluctuante.');

    expect(
      construirBorradorConclusionIla({
        distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_DIFERENTE,
        confirmacion: CONFIRMACION_HALLAZGOS_ILA.REQUIERE_REPETICION,
      }),
    ).toBe(
      'Los hallazgos presentan una distribución bilateral diferente. Los hallazgos requieren repetición para su confirmación.',
    );

    expect(
      construirBorradorConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.ESTABLE,
        distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.BILATERAL_SIMILAR,
        relacionLaboral: RELACION_LABORAL_ILA.POSIBLE,
      }),
    ).toBe(
      'La evolución del seguimiento se considera estable y los hallazgos presentan una distribución bilateral similar. La relación con el trabajo se considera posible.',
    );

    expect(
      construirBorradorConclusionIla({
        relacionLaboral: RELACION_LABORAL_ILA.NO_DETERMINABLE,
      }),
    ).toBe('La relación con el trabajo se considera no determinable.');

    expect(
      construirBorradorConclusionIla({
        evolucion: EVOLUCION_SEGUIMIENTO_ILA.ESTABLE,
        confirmacion: CONFIRMACION_HALLAZGOS_ILA.REQUIERE_REPETICION,
      }),
    ).toBe(
      'La evolución del seguimiento se considera estable. Los hallazgos requieren repetición para su confirmación.',
    );
  });

  it('no inserta espacios rotos antes de comas ni hechos de contexto', () => {
    const t = construirBorradorConclusionIla({
      evolucion: EVOLUCION_SEGUIMIENTO_ILA.PROGRESIVA,
      distribucionHallazgos: DISTRIBUCION_HALLAZGOS_ILA.PREDOMINIO_OD,
    });
    expect(t).not.toMatch(/ ,/);
    expect(t).not.toMatch(/puesto|historia otológica|Ruido/i);
  });
});

describe('aplicarBorradorConclusionSiNoEditada', () => {
  it('carga el primer borrador si la conclusión está vacía', () => {
    expect(aplicarBorradorConclusionSiNoEditada('', undefined, 'T')).toBe('T');
  });

  it('reemplaza si la conclusión sigue igual al borrador anterior', () => {
    expect(aplicarBorradorConclusionSiNoEditada('T', 'T', 'U')).toBe('U');
  });

  it('conserva la edición del médico', () => {
    expect(aplicarBorradorConclusionSiNoEditada('editada', 'T', 'U')).toBe('editada');
  });

  it('conserva el vacío intencional', () => {
    expect(aplicarBorradorConclusionSiNoEditada('', 'T', 'U')).toBe('');
  });

  it('vacía la conclusión si se vacían las cuatro decisiones y no estaba editada', () => {
    expect(aplicarBorradorConclusionSiNoEditada('T', 'T', '')).toBe('');
  });
});

describe('mostrarRestaurarBorradorConclusionIla', () => {
  it('oculta el botón si el texto sigue siendo el generado', () => {
    expect(mostrarRestaurarBorradorConclusionIla('T', 'T')).toBe(false);
    expect(mostrarRestaurarBorradorConclusionIla('  T  ', 'T')).toBe(false);
    expect(mostrarRestaurarBorradorConclusionIla('', '')).toBe(false);
  });

  it('muestra el botón solo si hay borrador y el médico cambió el texto', () => {
    expect(mostrarRestaurarBorradorConclusionIla('editada', 'T')).toBe(true);
    expect(mostrarRestaurarBorradorConclusionIla('', 'T')).toBe(true);
    expect(mostrarRestaurarBorradorConclusionIla('T', '')).toBe(false);
  });
});
