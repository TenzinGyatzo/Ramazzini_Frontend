import { describe, expect, it } from 'vitest';
import { esMedicion, fechaLegible, imcDesdePesoAltura, quitarMedicionesVacias } from './medicionesClinicas';

describe('medicionesClinicas', () => {
  it('un campo vacío no es medición; el cero sí', () => {
    for (const vacio of [undefined, null, '', 'abc', NaN]) expect(esMedicion(vacio)).toBe(false);
    expect(esMedicion(0)).toBe(true);
    expect(esMedicion('72')).toBe(true);
  });

  it('IMC solo con peso y altura', () => {
    expect(imcDesdePesoAltura(80, 1.7)).toBe(27.68);
    expect(imcDesdePesoAltura('', 1.7)).toBeNull();
    expect(imcDesdePesoAltura(80, null)).toBeNull();
  });

  it('fecha legible sin correrse de día por la zona horaria', () => {
    expect(fechaLegible('2026-10-13T00:00:00.000Z')).toBe('13 de octubre de 2026');
    expect(fechaLegible(undefined)).toBe('');
  });

  it('solo se envía lo medido; un grupo vacío no se envía', () => {
    const datos = quitarMedicionesVacias(
      {
        motivo: 'Control',
        somatometria: { peso: 82, altura: '', indiceMasaCorporal: null, categoriaIMC: '' },
        signosVitales: { tensionArterialSistolica: null, categoriaTensionArterial: '' },
      },
      ['somatometria', 'signosVitales'],
    );
    expect(datos).toEqual({ motivo: 'Control', somatometria: { peso: 82 } });
  });
});
