import { describe, expect, it } from 'vitest';
import { validarCamposRequeridos } from './validacionCampos';
import { problemasExploracionFisica } from './problemasDocumento';
import { validateSomatometriaSignosField, type SomatometriaSignosField } from './somatometriaSignosRanges';
import { textoCinturaResumen } from './medicionesClinicas';
import { calcularCircunferenciaCintura } from './dashboardDataProcessor';

const motivo = (campo: string, valor: unknown) =>
  validateSomatometriaSignosField(campo as SomatometriaSignosField, valor);

const completa = {
  fechaExploracionFisica: '2026-11-14',
  peso: 80,
  altura: 1.7,
  indiceMasaCorporal: 27.68,
  tensionArterialSistolica: 118,
  tensionArterialDiastolica: 76,
  frecuenciaCardiaca: 72,
  frecuenciaRespiratoria: 16,
  saturacionOxigeno: 98,
};

const problemas = (datos: Record<string, unknown>) =>
  problemasExploracionFisica(validarCamposRequeridos('exploracionFisica', datos).camposFaltantes, datos, motivo);

describe('circunferencia de cintura opcional con «Se desconoce»', () => {
  it('vacía y sin marcar: el aviso la pide y dice que se puede marcar «Se desconoce»', () => {
    expect(problemas({ ...completa, circunferenciaCintura: null })).toEqual([
      expect.objectContaining({
        campo: 'circunferenciaCintura',
        mensaje: 'Escribe la circunferencia de cintura; si no se pudo medir, marca «Se desconoce».',
      }),
    ]);
  });

  it('marcada «Se desconoce»: se puede guardar sin cintura', () => {
    expect(problemas({ ...completa, circunferenciaCintura: null, circunferenciaCinturaSeDesconoce: true })).toEqual([]);
  });

  it('con medición fuera de rango sigue diciendo el rango', () => {
    const [p] = problemas({ ...completa, circunferenciaCintura: 5 });
    expect(p).toMatchObject({ campo: 'circunferenciaCintura', falta: false });
  });

  it('resumen de la aptitud: valor, «se desconoce» o nada (nunca «undefined cm»)', () => {
    expect(textoCinturaResumen({ circunferenciaCintura: 90, categoriaCircunferenciaCintura: 'Bajo Riesgo' })).toBe(
      ' Cintura: 90 cm - Bajo Riesgo.',
    );
    expect(textoCinturaResumen({ circunferenciaCinturaSeDesconoce: true })).toBe(' Cintura: se desconoce.');
    expect(textoCinturaResumen({})).toBe('');
  });

  it('tablero: cuenta cuántos tienen la cintura registrada', () => {
    const r = calcularCircunferenciaCintura([
      { categoriaCircunferenciaCintura: 'Alto Riesgo' },
      { categoriaCircunferenciaCintura: 'Bajo Riesgo' },
      { categoriaCircunferenciaCintura: null },
      { categoriaCircunferenciaCintura: '' },
    ]);
    expect(r).toMatchObject({ medidos: 2, conExploracion: 4, porcentaje: 50 });
  });
});
