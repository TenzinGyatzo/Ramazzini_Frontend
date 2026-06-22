import { describe, it, expect } from 'vitest';
import {
  isMexicoProvider,
  normalizeProveedorPaisCode,
} from './proveedorPais';

describe('proveedorPais', () => {
  it('normaliza códigos de país', () => {
    expect(normalizeProveedorPaisCode(' gt ')).toBe('GT');
    expect(normalizeProveedorPaisCode('mx')).toBe('MX');
  });

  it('detecta proveedor mexicano', () => {
    expect(isMexicoProvider('MX')).toBe(true);
    expect(isMexicoProvider('mx')).toBe(true);
    expect(isMexicoProvider('GT')).toBe(false);
  });
});
