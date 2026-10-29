import { describe, expect, it } from 'vitest';
import { etiquetaCriterioDuplicado } from './criterioDuplicado';

describe('etiquetaCriterioDuplicado', () => {
  it('CURP: con el nombre del identificador del país', () => {
    expect(etiquetaCriterioDuplicado('CURP')).toBe('misma CURP');
    expect(etiquetaCriterioDuplicado('CURP', 'DPI')).toBe('misma DPI');
  });

  it("'FOLIO' son los mismos datos de identidad, nunca el folio", () => {
    expect(etiquetaCriterioDuplicado('FOLIO')).toBe('mismos datos de identidad');
    expect(etiquetaCriterioDuplicado('FOLIO')).not.toMatch(/folio/i);
  });

  it('sin criterio: confirmación manual', () => {
    expect(etiquetaCriterioDuplicado(null)).toBe('confirmación manual');
  });
});
