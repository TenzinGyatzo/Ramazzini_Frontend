import { describe, it, expect } from 'vitest';
import { toTitleCase } from './toTitleCase';

describe('toTitleCase', () => {
  it('convierte municipio y estado de catálogo SEPOMEX', () => {
    expect(toTitleCase('AHOME')).toBe('Ahome');
    expect(toTitleCase('SINALOA')).toBe('Sinaloa');
  });

  it('respeta espacios y guiones', () => {
    expect(toTitleCase('BAJA CALIFORNIA SUR')).toBe('Baja California Sur');
    expect(toTitleCase('JARDINES DEL BOSQUE')).toBe('Jardines Del Bosque');
  });

  it('tolera valores vacíos', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(null)).toBe('');
    expect(toTitleCase(undefined)).toBe('');
  });
});
