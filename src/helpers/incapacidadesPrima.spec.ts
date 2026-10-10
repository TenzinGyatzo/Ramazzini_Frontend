import { describe, expect, it } from 'vitest';
import { aniosDisponibles, calcularPrima, textoDePrima } from './incapacidadesPrima';

describe('estimación de la prima de riesgo', () => {
  it('sin siniestralidad, la prima es la mínima de 0.5 %', () => {
    expect(calcularPrima({ S: 0, I: 0, D: 0, N: 100, F: 2.3 })).toEqual({
      calculada: 0.5,
      aplicable: 0.5,
      ajustes: [],
      diferencia: null,
    });
  });

  it('aplica la fórmula [(S/365) + V × (I + D)] × (F/N) + M', () => {
    // (365/365 + 28 × (0.10 + 0)) × (2.3/100) + 0.005 = 3.8 × 0.023 + 0.005 = 0.0924
    expect(calcularPrima({ S: 365, I: 0.1, D: 0, N: 100, F: 2.3 })?.calculada).toBe(9.24);
    // Una defunción: (0 + 28 × 1) × (2.3/200) + 0.005 = 0.327
    expect(calcularPrima({ S: 0, I: 0, D: 1, N: 200, F: 2.3 })?.calculada).toBe(32.7);
    // Con sistema de seguridad acreditado el factor baja a 2.2
    expect(calcularPrima({ S: 365, I: 0.1, D: 0, N: 100, F: 2.2 })?.calculada).toBe(8.86);
  });

  it('redondea a cinco decimales', () => {
    // (46/365) × (2.3/37) + 0.005 = 0.0128341…
    expect(calcularPrima({ S: 46, I: 0, D: 0, N: 37, F: 2.3 })?.calculada).toBe(1.28341);
  });

  it('no deja subir ni bajar más de un punto respecto a la prima anterior', () => {
    const sube = calcularPrima({ S: 365, I: 0.1, D: 0, N: 100, F: 2.3, primaAnterior: 2.5 });
    expect(sube).toMatchObject({ calculada: 9.24, aplicable: 3.5, diferencia: 1 });
    expect(sube?.ajustes[0]).toContain('No puede subir');

    const baja = calcularPrima({ S: 0, I: 0, D: 0, N: 100, F: 2.3, primaAnterior: 4.65325 });
    expect(baja).toMatchObject({ calculada: 0.5, aplicable: 3.65325, diferencia: -1 });
    expect(baja?.ajustes[0]).toContain('No puede bajar');
  });

  it('dentro del margen no hay ajuste y se informa la diferencia', () => {
    const resultado = calcularPrima({ S: 46, I: 0, D: 0, N: 37, F: 2.3, primaAnterior: 1.5 });
    expect(resultado).toMatchObject({ aplicable: 1.28341, ajustes: [], diferencia: -0.21659 });
  });

  it('respeta el mínimo de 0.5 % y el máximo de 15 %', () => {
    const maximo = calcularPrima({ S: 0, I: 0, D: 2, N: 50, F: 2.3, primaAnterior: 14.6 });
    expect(maximo?.aplicable).toBe(15);
    expect(maximo?.ajustes).toHaveLength(2);
    expect(maximo?.ajustes[1]).toBe('No puede ser mayor a 15 %.');

    const sinAnterior = calcularPrima({ S: 0, I: 0, D: 2, N: 50, F: 2.3 });
    expect(sinAnterior).toMatchObject({ calculada: 258.1, aplicable: 15, diferencia: null });
    expect(sinAnterior?.ajustes).toEqual(['No puede ser mayor a 15 %.']);
  });

  it('sin trabajadores expuestos no hay resultado', () => {
    expect(calcularPrima({ S: 10, I: 0, D: 0, N: 0, F: 2.3 })).toBeNull();
    expect(calcularPrima({ S: 10, I: 0, D: 0, N: NaN, F: 2.3 })).toBeNull();
  });

  it('da formato con cinco decimales y lista los años consultables', () => {
    expect(textoDePrima(0.5)).toBe('0.50000 %');
    expect(textoDePrima(1.28341)).toBe('1.28341 %');
    expect(aniosDisponibles(2026)).toEqual([2026, 2025, 2024, 2023, 2022, 2021, 2020]);
  });
});
