import { describe, expect, it } from 'vitest';
import type { EventoConcentradoCardiometabolicoEsc } from '@/interfaces/documentos.inteface';
import {
  codigoControlClinicoParaTendencia,
  codigoEstadoVigenciaDesdeResultado,
  diagnosticoActivoEnEvento,
  evaluarCondicionEnEvento,
  eventoConcentradoAEscForm,
  tendenciaControlDesdeSerie,
  tendenciaControlAString,
} from './informeLongitudinalCoherenciaEsc';

describe('informeLongitudinalCoherenciaEsc', () => {
  it('alteración sin dx: vigencia ALTERACION, sin punto en serie clínica', () => {
    const ev: EventoConcentradoCardiometabolicoEsc = {
      fechaControl: '2025-01-01',
      laboratorio: { glucosaMgDl: 145, categoriaGlucosa: 'Elevada', hba1cPorcentaje: 6.8 },
    };
    const r = evaluarCondicionEnEvento(ev, 'diabetesMellitusTipo2');
    expect(diagnosticoActivoEnEvento(ev, 'diabetesMellitusTipo2')).toBe(false);
    expect(codigoEstadoVigenciaDesdeResultado(r, eventoConcentradoAEscForm(ev), 'diabetesMellitusTipo2')).toBe(
      'ALTERACION_DOCUMENTADA',
    );
    expect(codigoControlClinicoParaTendencia(r, eventoConcentradoAEscForm(ev), 'diabetesMellitusTipo2')).toBeUndefined();
  });

  it('dx + NO_CONTROLADA → CONTROLADA: serie clínica y MEJORIA', () => {
    const e1: EventoConcentradoCardiometabolicoEsc = {
      fechaControl: '2025-01-01',
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: { tensionArterialSistolica: 150, tensionArterialDiastolica: 95 },
      estadoCondiciones: { hipertensionArterial: { control: 'NO_CONTROLADA' } },
    };
    const e2: EventoConcentradoCardiometabolicoEsc = {
      fechaControl: '2025-06-01',
      diagnosticosActivos: ['HIPERTENSION_ARTERIAL'],
      signosVitales: { tensionArterialSistolica: 120, tensionArterialDiastolica: 78 },
      estadoCondiciones: { hipertensionArterial: { control: 'CONTROLADA' } },
    };
    const serie = [e1, e2].map((ev) => {
      const form = eventoConcentradoAEscForm(ev);
      const r = evaluarCondicionEnEvento(ev, 'hipertensionArterial');
      return codigoControlClinicoParaTendencia(r, form, 'hipertensionArterial');
    }).filter(Boolean);
    expect(serie).toEqual(['NO_CONTROLADA', 'CONTROLADA']);
    expect(tendenciaControlAString(tendenciaControlDesdeSerie(serie as ('CONTROLADA' | 'NO_CONTROLADA')[]))).toBe(
      'Mejoría',
    );
  });

  it('NO_VALORABLE en extremos → INSUFICIENTE (no Mejoría)', () => {
    expect(tendenciaControlDesdeSerie(['CONTROLADA'])).toBe('INSUFICIENTE');
    expect(tendenciaControlAString(tendenciaControlDesdeSerie(['CONTROLADA']))).toBeUndefined();
  });
});
