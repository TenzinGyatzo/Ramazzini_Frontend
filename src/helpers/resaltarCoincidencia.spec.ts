import { describe, expect, it } from 'vitest';
import { tramosResaltados } from './resaltarCoincidencia';

const marcado = (texto: string, consulta: string) =>
  tramosResaltados(texto, consulta).map((t) => (t.coincide ? `[${t.texto}]` : t.texto)).join('');

describe('tramosResaltados', () => {
  it('resalta sin distinguir acentos ni mayúsculas y conserva el texto original', () => {
    expect(marcado('HIPERTENSIÓN ESENCIAL (PRIMARIA)', 'hipertension')).toBe('[HIPERTENSIÓN] ESENCIAL (PRIMARIA)');
    expect(marcado('ENFERMEDAD CARDÍACA HIPERTENSIVA CON INSUFICIENCIA CARDÍACA', 'cardiaca')).toBe(
      'ENFERMEDAD [CARDÍACA] HIPERTENSIVA CON INSUFICIENCIA [CARDÍACA]',
    );
    expect(marcado('I10X', 'i10')).toBe('[I10]X');
  });

  it('sin coincidencia o sin búsqueda devuelve el texto tal cual', () => {
    expect(marcado('HIPERPLASIA DE LA PRÓSTATA', 'diabetes')).toBe('HIPERPLASIA DE LA PRÓSTATA');
    expect(marcado('HIPERPLASIA DE LA PRÓSTATA', '  ')).toBe('HIPERPLASIA DE LA PRÓSTATA');
    expect(marcado('PRÓSTATA', 'prostata')).toBe('[PRÓSTATA]');
  });
});
