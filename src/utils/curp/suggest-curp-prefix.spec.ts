import { describe, expect, it } from 'vitest';
import { applyCurpPrefix16, suggestCurpPrefix16 } from './suggest-curp-prefix';

describe('suggestCurpPrefix16', () => {
  it('sugiere CXGE941130HJCRND para caso Coronel González Edgar', () => {
    const result = suggestCurpPrefix16({
      fechaNacimiento: '1994-11-30',
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    });

    expect(result?.prefix16).toBe('CXGE941130HJCRND');
    expect(result?.matchesCurrent).toBe(false);
  });

  it('marca matchesCurrent cuando la CURP ya empieza igual', () => {
    const result = suggestCurpPrefix16(
      {
        fechaNacimiento: '1994-11-30',
        sexo: 'Masculino',
        entidadNacimiento: '14',
        nombre: 'EDGAR OMAR',
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
      },
      'CXGE941130HJCRND07',
    );

    expect(result?.matchesCurrent).toBe(true);
  });

  it('retorna null si falta entidad o nombre', () => {
    expect(
      suggestCurpPrefix16({
        fechaNacimiento: '1990-05-15',
        sexo: 'Masculino',
        nombre: 'JUAN',
        primerApellido: 'GARCIA',
      }),
    ).toBeNull();
  });

  it.each(['0001-11-30', '0019-11-30', '0199-11-30'] as const)(
    'retorna null con año incompleto %s',
    (fechaNacimiento) => {
      expect(
        suggestCurpPrefix16({
          fechaNacimiento,
          sexo: 'Masculino',
          entidadNacimiento: 'JALISCO',
          nombre: 'EDGAR OMAR',
          primerApellido: 'CORONEL',
          segundoApellido: 'GONZALEZ',
        }),
      ).toBeNull();
    },
  );

  it('sugiere prefijo sin apellidos (sinApellidos)', () => {
    const result = suggestCurpPrefix16({
      fechaNacimiento: '1990-05-15',
      sexo: 'Masculino',
      entidadNacimiento: '09',
      nombre: 'JUAN',
    });

    expect(result?.prefix16).toBe('XXXJ900515HDFXXN');
    expect(result?.prefix16.startsWith('XXXJ')).toBe(true);
  });

  it('retorna null si hay segundoApellido sin primerApellido', () => {
    expect(
      suggestCurpPrefix16({
        fechaNacimiento: '1990-05-15',
        sexo: 'Masculino',
        entidadNacimiento: '09',
        nombre: 'JUAN',
        segundoApellido: 'LOPEZ',
      }),
    ).toBeNull();
  });

  it('usa X para intersexual', () => {
    const result = suggestCurpPrefix16({
      fechaNacimiento: '1990-05-15',
      sexo: 'Intersexual',
      entidadNacimiento: '09',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    });

    expect(result?.prefix16.charAt(10)).toBe('X');
  });

  it('sugiere NE en posiciones 12-13 con entidad 88 (nacimiento extranjero)', () => {
    const result = suggestCurpPrefix16({
      fechaNacimiento: '1990-05-15',
      sexo: 'Masculino',
      entidadNacimiento: '88',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    });

    expect(result?.prefix16).toBe('GALJ900515HNERPN');
    expect(result?.prefix16.substring(11, 13)).toBe('NE');
  });
});

describe('applyCurpPrefix16', () => {
  it('conserva posiciones 17–18 si existen', () => {
    expect(applyCurpPrefix16('AAAA000000AAAAAA99', 'CXGE941130HJCRND')).toBe(
      'CXGE941130HJCRND99',
    );
  });

  it('deja solo 16 si no había sufijo', () => {
    expect(applyCurpPrefix16('', 'CXGE941130HJCRND')).toBe('CXGE941130HJCRND');
  });
});
