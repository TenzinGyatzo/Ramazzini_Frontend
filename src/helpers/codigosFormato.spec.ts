import { describe, expect, it } from 'vitest';
import {
  DOCUMENTOS_CON_CODIGO_FORMATO,
  bloqueCodigoFormato,
  codigoFormatoVigente,
  codigosParaGuardar,
  conCodigoFormato,
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

  it('formato impreso: el código va en el fondo de la página y el encabezado (logotipo) no se toca', () => {
    const definicion = { header: { columns: [{ text: 'logo' }, { text: 'TÍTULO' }] }, content: [] } as any;
    expect(conCodigoFormato(definicion, null)).toBe(definicion);
    const r = conCodigoFormato(definicion, { codigo: 'FCPE-040', lineaAdicional: 'Rev. 01' });
    expect(r.header).toBe(definicion.header);
    const fondo = (r.background as any)(1, { width: 612, height: 792 });
    expect(fondo).toMatchObject({ margin: [0, 12, 0, 0], fontSize: 8, alignment: 'right' });
    expect((bloqueCodigoFormato({ codigo: 'FCPE-040' }) as any).stack).toEqual([
      { text: 'FCPE-040', margin: [0, 0, 50, 0] },
    ]);
  });
});
