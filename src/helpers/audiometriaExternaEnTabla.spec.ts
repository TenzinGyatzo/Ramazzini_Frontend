import { describe, expect, it } from 'vitest';
import { categoriaDeAudiometriaExterna, resultadoDeAudiometriaExterna } from './audiometriaExternaEnTabla';
import { mapTrabajadorParaExportExcel } from './mapTrabajadorParaExportExcel';

const externa = (resultadoGlobal: string, gradoHipoacusia: string | null = null) => ({
  metodoAudiometria: null,
  externa: { resultadoGlobal, gradoHipoacusia },
});

describe('audiometría externa en la tabla de trabajadores', () => {
  it('una audiometría capturada en Ramazzini no pasa por aquí', () => {
    expect(resultadoDeAudiometriaExterna({})).toBeNull();
    expect(categoriaDeAudiometriaExterna(null)).toBeNull();
  });

  it('usa las mismas palabras que los filtros de la tabla', () => {
    expect(resultadoDeAudiometriaExterna(externa('NORMAL'))).toBe('Normal');
    expect(resultadoDeAudiometriaExterna(externa('ANORMAL', 'LEVE'))).toBe('Anormal');
    expect(categoriaDeAudiometriaExterna(externa('NORMAL'))).toBe('Normal');
    expect(categoriaDeAudiometriaExterna(externa('ANORMAL', 'MODERADA_SEVERA'))).toBe('H. moderada-severa');
    // Anormal sin grado capturado: cuenta como anormal, sin categoría
    expect(categoriaDeAudiometriaExterna(externa('ANORMAL'))).toBe('-');
  });

  it('la exportación a Excel también la incluye', () => {
    const fila = mapTrabajadorParaExportExcel({ audiometriaResumen: externa('ANORMAL', 'LEVE') } as any) as any;
    expect(fila.audiometria).toBe('Anormal');
    expect(fila.categoriaAudiometria).toBe('Hipoacusia leve');
  });
});
