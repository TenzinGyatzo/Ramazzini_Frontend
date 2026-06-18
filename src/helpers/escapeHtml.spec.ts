import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml (H-14)', () => {
  it('escapa comillas y markup para atributos', () => {
    expect(escapeHtml('"><script>alert(1)</script>')).toBe(
      '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('escapa payloads con onerror', () => {
    expect(escapeHtml('" onmouseover=alert(1) "')).not.toContain('" onmouseover');
    expect(escapeHtml('<img src=x onerror=alert(1)>')).toBe(
      '&lt;img src=x onerror=alert(1)&gt;',
    );
  });

  it('conserva texto legítimo', () => {
    expect(escapeHtml('Juan Pérez')).toBe('Juan Pérez');
  });

  it('maneja null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});
