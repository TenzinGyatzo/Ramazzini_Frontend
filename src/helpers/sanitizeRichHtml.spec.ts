// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { sanitizeRichHtml } from './sanitizeRichHtml';

describe('sanitizeRichHtml (H-13)', () => {
  it('elimina payloads XSS con onerror', () => {
    const dirty = '<img src=x onerror=alert(1)>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<img');
  });

  it('elimina script tags', () => {
    const dirty = '<script>alert(1)</script>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('alert');
  });

  it('conserva formato legítimo de Quill', () => {
    const html = '<p><strong>Hola</strong></p><ul><li>Item</li></ul>';
    const clean = sanitizeRichHtml(html);
    expect(clean).toContain('<strong>Hola</strong>');
    expect(clean).toContain('<li>Item</li>');
  });

  it('conserva enlaces https', () => {
    const html = '<p><a href="https://example.com" target="_blank" rel="noopener">Link</a></p>';
    expect(sanitizeRichHtml(html)).toContain('href="https://example.com"');
  });

  it('devuelve string vacío para null/undefined/vacío', () => {
    expect(sanitizeRichHtml(null)).toBe('');
    expect(sanitizeRichHtml(undefined)).toBe('');
    expect(sanitizeRichHtml('')).toBe('');
    expect(sanitizeRichHtml('   ')).toBe('');
  });
});
