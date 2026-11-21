import { describe, expect, it } from 'vitest';
import { colorAgudeza } from './colorAgudeza';

describe('color de la interpretación de agudeza e Ishihara (punto 43)', () => {
  it('por nivel', () => {
    expect(colorAgudeza('Visión normal')).toBe('bg-emerald-600');
    expect(colorAgudeza('Visión ligeramente reducida')).toBe('bg-amber-600');
    expect(colorAgudeza('Visión moderadamente reducida')).toBe('bg-orange-600');
    expect(colorAgudeza('Ceguera total')).toBe('bg-red-600');
    expect(colorAgudeza('Daltonismo')).toBe('bg-red-600');
    expect(colorAgudeza('Normal')).toBe('bg-emerald-600');
  });

  it('un solo ojo, los dos en renglones y lo no evaluable', () => {
    expect(colorAgudeza('OD: Visión normal')).toBe('bg-emerald-600');
    expect(colorAgudeza('OI: Visión normal OD: Visión muy reducida')).toBe('bg-red-600');
    expect(colorAgudeza('No evaluable (lentes de contacto)')).toBe('bg-slate-500');
    expect(colorAgudeza(null)).toBe('bg-gray-400');
  });
});
