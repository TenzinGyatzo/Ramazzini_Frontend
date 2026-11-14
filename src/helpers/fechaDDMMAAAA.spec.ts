import { describe, expect, it } from 'vitest';
import {
  ddmmaaaaAIso,
  dentroDeRango,
  enmascararFecha,
  esFechaIsoValida,
  fechaDateADDMMAAAA,
  isoADDMMAAAA,
} from './fechaDDMMAAAA';

describe('fechas DD/MM/AAAA', () => {
  it('AAAA-MM-DD ↔ DD/MM/AAAA, sin zona horaria', () => {
    expect(isoADDMMAAAA('2026-11-05')).toBe('05/11/2026');
    expect(isoADDMMAAAA('2026-11-05T00:00:00.000Z')).toBe('05/11/2026');
    expect(isoADDMMAAAA('')).toBe('');
    expect(ddmmaaaaAIso('05/11/2026')).toBe('2026-11-05');
    expect(ddmmaaaaAIso('05/11/26')).toBe('');
  });

  it('fechas imposibles no valen (31/02, 29/02 no bisiesto)', () => {
    expect(ddmmaaaaAIso('31/02/2026')).toBe('');
    expect(ddmmaaaaAIso('29/02/2025')).toBe('');
    expect(ddmmaaaaAIso('29/02/2024')).toBe('2024-02-29');
    expect(esFechaIsoValida('2026-13-01')).toBe(false);
  });

  it('enmascarado al teclear: las diagonales se ponen solas', () => {
    expect(enmascararFecha('0')).toBe('0');
    expect(enmascararFecha('05')).toBe('05');
    expect(enmascararFecha('051')).toBe('05/1');
    expect(enmascararFecha('0511')).toBe('05/11');
    expect(enmascararFecha('05112026')).toBe('05/11/2026');
    expect(enmascararFecha('051120261')).toBe('05/11/2026');
    // Escribiendo sobre lo que ya tiene diagonales
    expect(enmascararFecha('05/112')).toBe('05/11/2');
    expect(enmascararFecha('05/11/2026')).toBe('05/11/2026');
  });

  it('día o mes de un dígito con separador se completan con 0', () => {
    expect(enmascararFecha('5/')).toBe('05/');
    expect(enmascararFecha('5/1/')).toBe('05/01/');
    expect(enmascararFecha('5/1/2026')).toBe('05/01/2026');
    expect(enmascararFecha('5-11-2026')).toBe('05/11/2026');
  });

  it('pegar AAAA-MM-DD se convierte', () => {
    expect(enmascararFecha('2026-11-05')).toBe('05/11/2026');
  });

  it('rango min/max', () => {
    expect(dentroDeRango('2026-11-05', '2026-01-01', '2026-12-31')).toBe(true);
    expect(dentroDeRango('2025-12-31', '2026-01-01', '')).toBe(false);
    expect(dentroDeRango('2027-01-01', null, '2026-12-31')).toBe(false);
  });

  it('una fecha Date se muestra siempre día/mes/año', () => {
    expect(fechaDateADDMMAAAA(new Date(2026, 10, 5))).toBe('05/11/2026');
    expect(fechaDateADDMMAAAA(null)).toBe('');
  });
});
