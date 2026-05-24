/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  getRamazziniLetraBlockMessage,
  getRamazziniLetraFromCatalogKey,
} from './cie10RamazziniScope';

describe('cie10RamazziniScope', () => {
  it('detecta MT y CP', () => {
    expect(getRamazziniLetraFromCatalogKey('CP01')).toBe('CP');
    expect(getRamazziniLetraFromCatalogKey('E110')).toBeNull();
  });

  it('mensaje CP menciona medicina del trabajo', () => {
    expect(getRamazziniLetraBlockMessage('CP', 'CP01')).toMatch(/medicina del trabajo/i);
  });
});
