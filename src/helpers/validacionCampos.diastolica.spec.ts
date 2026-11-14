import { describe, expect, it } from 'vitest';
import { validarCamposRequeridos } from './validacionCampos';
import { problemasExploracionFisica } from './problemasDocumento';
import { validateSomatometriaSignosField, type SomatometriaSignosField } from './somatometriaSignosRanges';

const motivo = (campo: string, valor: unknown) =>
  validateSomatometriaSignosField(campo as SomatometriaSignosField, valor);

const signos = {
  tensionArterialSistolica: 118,
  frecuenciaCardiaca: 72,
  frecuenciaRespiratoria: 16,
  saturacionOxigeno: 98,
};

describe('tensión arterial diastólica obligatoria', () => {
  it('exploración física: vacía, el aviso la pide (antes se la brincaba)', () => {
    const datos = {
      fechaExploracionFisica: '2026-11-14',
      peso: 80,
      altura: 1.7,
      indiceMasaCorporal: 27.68,
      circunferenciaCintura: 90,
      ...signos,
      tensionArterialDiastolica: null,
    };
    const { camposFaltantes } = validarCamposRequeridos('exploracionFisica', datos);
    const problemas = problemasExploracionFisica(camposFaltantes, datos, motivo);
    expect(problemas).toEqual([
      expect.objectContaining({
        campo: 'tensionArterialDiastolica',
        paso: 3,
        falta: true,
        mensaje: 'Escribe la tensión arterial diastólica.',
      }),
    ]);
  });

  it('exploración física: fuera de rango, dice el rango', () => {
    const datos = { ...signos, tensionArterialDiastolica: 300 };
    const { camposFaltantes } = validarCamposRequeridos('exploracionFisica', datos);
    const problemas = problemasExploracionFisica(camposFaltantes, datos, motivo);
    const diastolica = problemas.find((p) => p.campo === 'tensionArterialDiastolica');
    expect(diastolica).toMatchObject({ falta: false });
    expect(diastolica?.mensaje).not.toBe('Revisa este dato.');
  });

  it('certificado expedito: vacía, aparece en la lista de faltantes', () => {
    const { camposFaltantes } = validarCamposRequeridos('certificadoExpedito', { ...signos });
    expect(camposFaltantes.map((c) => c.campo)).toContain('tensionArterialDiastolica');
  });
});
