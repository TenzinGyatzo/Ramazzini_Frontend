import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('pdfmake/build/pdfmake', () => ({
  default: { createPdf: vi.fn() },
}));
vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: { 'Roboto-Regular.ttf': 'AAAA' },
}));

describe('cargarPdfMake', () => {
  beforeEach(() => {
    vi.resetModules();
    delete (globalThis as { pdfMake?: unknown }).pdfMake;
  });

  it('carga pdfmake, registra las fuentes por omisión y lo publica como window.pdfMake', async () => {
    const { cargarPdfMake } = await import('./cargarPdfMake');
    const pdfMake = await cargarPdfMake();

    expect(typeof pdfMake.createPdf).toBe('function');
    expect(pdfMake.vfs).toEqual({ 'Roboto-Regular.ttf': 'AAAA' });
    // createPdf lee vfs y fonts del global, como cuando venía del CDN
    expect((globalThis as { pdfMake?: unknown }).pdfMake).toBe(pdfMake);
  });

  it('carga una sola vez aunque se pida varias veces', async () => {
    const { cargarPdfMake } = await import('./cargarPdfMake');
    const [a, b] = await Promise.all([cargarPdfMake(), cargarPdfMake()]);

    expect(a).toBe(b);
  });

  it('pdfMakeCargado es null hasta que termina de cargar', async () => {
    const { cargarPdfMake, pdfMakeCargado, precargarPdfMake } = await import('./cargarPdfMake');
    expect(pdfMakeCargado()).toBeNull();

    precargarPdfMake();
    const pdfMake = await cargarPdfMake();
    expect(pdfMakeCargado()).toBe(pdfMake);
  });
});
