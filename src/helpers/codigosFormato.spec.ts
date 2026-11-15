import { describe, expect, it } from 'vitest';
import {
  DOCUMENTOS_CON_CODIGO_FORMATO,
  bloqueCodigoFormato,
  codigoFormatoVigente,
  codigosParaGuardar,
  encabezadoConCodigoFormato,
} from './codigosFormato';

describe('códigos de formato (punto 34)', () => {
  it('los 25 documentos con PDF, sin el documento externo', () => {
    expect(DOCUMENTOS_CON_CODIGO_FORMATO.length).toBe(25);
    expect(DOCUMENTOS_CON_CODIGO_FORMATO as readonly string[]).not.toContain('documentoExterno');
  });

  it('código vigente: solo con la función encendida y el tipo con código', () => {
    const codigosFormato = { DECLARACION_VERACIDAD: { codigo: 'FCPE-040', lineaAdicional: 'Rev. 01' } };
    expect(codigoFormatoVigente({ codigosFormatoHabilitado: false, codigosFormato }, 'DECLARACION_VERACIDAD')).toBeNull();
    expect(codigoFormatoVigente({ codigosFormatoHabilitado: true, codigosFormato }, 'CONSENTIMIENTO_ANTIDOPING')).toBeNull();
    expect(codigoFormatoVigente(null, 'DECLARACION_VERACIDAD')).toBeNull();
    expect(codigoFormatoVigente({ codigosFormatoHabilitado: true, codigosFormato }, 'DECLARACION_VERACIDAD')).toEqual({
      codigo: 'FCPE-040',
      lineaAdicional: 'Rev. 01',
    });
  });

  it('para guardar: recorta y quita los tipos sin código', () => {
    expect(
      codigosParaGuardar({
        receta: { codigo: '  FCPE-030 ', lineaAdicional: ' ' },
        notaMedica: { codigo: '', lineaAdicional: 'Rev. 01' },
        aptitud: { codigo: 'FCPE  010', lineaAdicional: 'Revisión:  03' },
      }),
    ).toEqual({ receta: { codigo: 'FCPE-030' }, aptitud: { codigo: 'FCPE 010', lineaAdicional: 'Revisión: 03' } });
  });

  it('encabezado del formato impreso: el código va encima, sin quitar logo ni título', () => {
    const header = { columns: [{ text: 'logo' }, { text: 'TÍTULO' }] };
    expect(encabezadoConCodigoFormato(header as any, null)).toBe(header);
    const r = encabezadoConCodigoFormato(header as any, { codigo: 'FCPE-040', lineaAdicional: 'Rev. 01' }) as any[];
    expect(r[1]).toBe(header);
    expect(r[0]).toMatchObject({ absolutePosition: { x: 0, y: 12 }, fontSize: 8, alignment: 'right' });
    expect((bloqueCodigoFormato({ codigo: 'FCPE-040' }) as any).stack).toEqual([
      { text: 'FCPE-040', margin: [0, 0, 50, 0] },
    ]);
  });
});
