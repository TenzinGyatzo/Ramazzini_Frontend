import { describe, expect, it } from 'vitest';
import { shouldShowPinpointVisual } from './sectionPinpointVisual';

describe('shouldShowPinpointVisual', () => {
  it('HC: oculta azul en motivo y resumen (singleton)', () => {
    expect(
      shouldShowPinpointVisual({
        documentType: 'historiaClinica',
        legacyStep: 1,
        sexo: 'Femenino',
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'historiaClinica',
        legacyStep: 46,
        sexo: 'Femenino',
      }),
    ).toBe(false);
  });

  it('HC: muestra azul en microsteps de sección multi', () => {
    expect(
      shouldShowPinpointVisual({
        documentType: 'historiaClinica',
        legacyStep: 9,
        sexo: 'Femenino',
      }),
    ).toBe(true);
  });

  it('EF: oculta en resumen/fecha; muestra en exploración', () => {
    expect(
      shouldShowPinpointVisual({
        documentType: 'exploracionFisica',
        legacyStep: 31,
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'exploracionFisica',
        legacyStep: 1,
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'exploracionFisica',
        legacyStep: 22,
      }),
    ).toBe(true);
  });

  it('Aptitud: oculta alteraciones; muestra evaluaciones', () => {
    expect(
      shouldShowPinpointVisual({
        documentType: 'aptitud',
        legacyStep: 9,
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'aptitud',
        legacyStep: 3,
      }),
    ).toBe(true);
  });

  it('Antidoping: nunca muestra azul; Certificado multi → sí', () => {
    expect(
      shouldShowPinpointVisual({
        documentType: 'antidoping',
        legacyStep: 1,
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'antidoping',
        legacyStep: 2,
      }),
    ).toBe(false);
    expect(
      shouldShowPinpointVisual({
        documentType: 'certificado',
        legacyStep: 2,
      }),
    ).toBe(true);
  });
});
