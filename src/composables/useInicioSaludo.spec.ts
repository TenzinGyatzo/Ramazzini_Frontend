import { describe, expect, it } from 'vitest';
import {
  formatInicioSaludo,
  getInicioSaludoPeriodo,
} from './useInicioSaludo';

describe('useInicioSaludo', () => {
  it('usa buenos días entre 05:00 y 11:59', () => {
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 5, 0))).toBe('días');
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 11, 59))).toBe('días');
    expect(formatInicioSaludo('Edgar', new Date(2026, 7, 28, 9, 0))).toBe(
      'Buenos días, Edgar',
    );
  });

  it('usa buenas tardes entre 12:00 y 18:59', () => {
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 12, 0))).toBe('tardes');
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 18, 59))).toBe('tardes');
    expect(formatInicioSaludo('Edgar', new Date(2026, 7, 28, 15, 0))).toBe(
      'Buenas tardes, Edgar',
    );
  });

  it('usa buenas noches entre 19:00 y 04:59', () => {
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 19, 0))).toBe('noches');
    expect(getInicioSaludoPeriodo(new Date(2026, 7, 28, 4, 59))).toBe('noches');
    expect(formatInicioSaludo('Edgar', new Date(2026, 7, 28, 21, 0))).toBe(
      'Buenas noches, Edgar',
    );
  });

  it('omite el nombre si no está disponible', () => {
    expect(formatInicioSaludo('  ', new Date(2026, 7, 28, 9, 0))).toBe(
      'Buenos días',
    );
  });
});
