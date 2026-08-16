import { describe, expect, it } from 'vitest';
import { validateCURPCrossCheck } from './curp-validator';
import { validateCurpLive } from './validate-curp-live';

describe('validateCurpLive', () => {
  const demo = {
    fechaNacimiento: '1990-05-15',
    sexo: 'Masculino',
    entidadNacimiento: '09',
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
  };

  it('no marca error de longitud mientras la CURP está incompleta sin charset malo', () => {
    const result = validateCurpLive('GALJ', demo, { allowGenericCurp: true });
    expect(result.hasBlockingErrors).toBe(false);
    expect(result.issues.find((i) => i.code === 'CURP_LENGTH')).toBeUndefined();
  });

  it('marca error en posición 11 cuando el sexo del segmento es inválido', () => {
    const result = validateCurpLive('GALJ900515Z', demo, {
      allowGenericCurp: true,
    });
    expect(result.invalidPositions).toContain(11);
    expect(
      result.issues.some(
        (i) =>
          i.positions.includes(11) &&
          (i.code === 'CURP_CHARSET_SEXO' || i.code === 'CURP_CROSS_SEXO'),
      ),
    ).toBe(true);
  });

  it('acepta CURP genérica para trabajadores', () => {
    const result = validateCurpLive('XXXX999999XXXXXX99', demo, {
      allowGenericCurp: true,
    });
    expect(result.hasBlockingErrors).toBe(false);
  });

  it('rechaza CURP genérica para firmantes', () => {
    const result = validateCurpLive('XXXX999999XXXXXX99', demo, {
      allowGenericCurp: false,
    });
    expect(result.issues.some((i) => i.code === 'CURP_GENERIC_NOT_ALLOWED')).toBe(
      true,
    );
  });

  it('detecta cruce de iniciales con posiciones granulares', () => {
    const result = validateCurpLive('XXXX900515HDFRPN08', demo, {
      allowGenericCurp: true,
    });
    // XXXX vs GALJ → posiciones 1-4 distintas
    const iniciales = result.issues.filter((i) => i.code === 'CURP_CROSS_INICIALES');
    expect(iniciales.length).toBeGreaterThan(0);
    expect(iniciales.every((i) => i.positions.length === 1)).toBe(true);
    expect(result.invalidPositions).toEqual(
      expect.arrayContaining(iniciales.flatMap((i) => i.positions)),
    );
    expect(iniciales[0].message).toMatch(/^Pos\. \d+/);
  });

  it('valida homoclave pos 17: dígito 0-9 si nacido antes del 2000', () => {
    const result = validateCurpLive(
      'CXGE941130HJCRNDP0',
      {
        fechaNacimiento: '1994-11-30',
        sexo: 'Masculino',
        entidadNacimiento: 'JALISCO',
        nombre: 'EDGAR',
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
      },
      { allowGenericCurp: true },
    );

    const homo = result.issues.filter((i) => i.positions.includes(17));
    expect(homo).toHaveLength(1);
    expect(homo[0].code).toBe('CURP_CROSS_HOMOCLAVE');
    expect(homo[0].message).toContain('0-9');
    expect(result.invalidPositions).toContain(17);
  });

  it('valida homoclave pos 17: letra A-J si nacido desde 2000', () => {
    const result = validateCurpLive(
      'CXGE001130HJCRND90',
      {
        fechaNacimiento: '2000-11-30',
        sexo: 'Masculino',
        entidadNacimiento: 'JALISCO',
        nombre: 'EDGAR',
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
      },
      { allowGenericCurp: true },
    );

    const homo = result.issues.filter((i) => i.positions.includes(17));
    expect(homo.length).toBeGreaterThanOrEqual(1);
    expect(homo.some((i) => i.message.includes('A-J'))).toBe(true);
  });

  it('ordena mensajes por posición incremental', () => {
    const result = validateCurpLive(
      'ABCDEFGHIJKLMNOPQR',
      {
        fechaNacimiento: '1994-11-30',
        sexo: 'Masculino',
        entidadNacimiento: 'JALISCO',
        nombre: 'EDGAR',
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
      },
      { allowGenericCurp: true },
    );

    const positions = result.issues
      .filter((i) => i.positions.length)
      .map((i) => Math.min(...i.positions));
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions).toEqual(sorted);
  });

  it('marca iniciales erróneas en CURP incompleta (PODK vs COGE/CXGE)', () => {
    const result = validateCurpLive(
      'PODK',
      {
        fechaNacimiento: '1994-11-30',
        sexo: 'Masculino',
        entidadNacimiento: 'JALISCO',
        nombre: 'EDGAR',
        primerApellido: 'CORONEL',
        segundoApellido: 'GONZALEZ',
      },
      { allowGenericCurp: true },
    );

    const iniciales = result.issues.filter((i) => i.code === 'CURP_CROSS_INICIALES');
    expect(iniciales).toHaveLength(3);
    expect(result.invalidPositions).toEqual([1, 3, 4]);
    expect(iniciales[0].message).toContain('Pos. 1');
  });

  it('acepta iniciales COGE o CXGE cuando los datos derivan palabra inconveniente', () => {
    const demographics = {
      fechaNacimiento: '1994-11-30',
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };

    const resultCoge = validateCurpLive(
      'COGE941130HJCRND07',
      demographics,
      { allowGenericCurp: true },
    );
    const inicialesCoge = resultCoge.issues.filter((i) => i.code === 'CURP_CROSS_INICIALES');
    expect(inicialesCoge).toHaveLength(0);
    expect(resultCoge.invalidPositions).not.toContain(2);
    expect(resultCoge.validPositions).toContain(2);

    const resultCxge = validateCurpLive(
      'CXGE941130HJCRND07',
      demographics,
      { allowGenericCurp: true },
    );
    const inicialesCxge = resultCxge.issues.filter((i) => i.code === 'CURP_CROSS_INICIALES');
    expect(inicialesCxge).toHaveLength(0);
    expect(resultCxge.validPositions).toContain(2);
  });

  it('marca posición 18 en verde cuando el checksum RENAPO coincide', () => {
    const result = validateCurpLive('CXGE941130HJCRND07', {
      fechaNacimiento: '1994-11-30',
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    }, { allowGenericCurp: true });

    expect(result.validPositions).toContain(18);
  });

  it('no marca verde sin datos demográficos para cruce (excepto checksum)', () => {
    const result = validateCurpLive('CXGE941130HJCRND07', {}, {
      allowGenericCurp: true,
    });
    expect(result.validPositions).toEqual([18]);
  });

  describe('gate fecha lista para cruce (year >= 1900)', () => {
    const curp = 'CXGE941130HJCRND07';
    const baseDemo = {
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };

    it.each(['0001-11-30', '0019-11-30', '0199-11-30'] as const)(
      'no cruza pos. 5–10 ni homoclave con año incompleto %s',
      (fechaNacimiento) => {
        const result = validateCurpLive(
          curp,
          { ...baseDemo, fechaNacimiento },
          { allowGenericCurp: true },
        );

        expect(
          result.issues.some((i) => i.code === 'CURP_CROSS_FECHA'),
        ).toBe(false);
        expect(
          result.issues.some((i) => i.code === 'CURP_CROSS_HOMOCLAVE'),
        ).toBe(false);
        expect(result.relatedFieldMessages.fechaNacimiento ?? []).toEqual([]);
        for (const pos of [5, 6, 7, 8, 9, 10, 17]) {
          expect(result.validPositions).not.toContain(pos);
        }
      },
    );

    it('sí cruza fecha cuando el año está completo y no coincide', () => {
      const result = validateCurpLive(
        curp,
        { ...baseDemo, fechaNacimiento: '1995-11-30' },
        { allowGenericCurp: true },
      );

      const fechaIssues = result.issues.filter(
        (i) => i.code === 'CURP_CROSS_FECHA',
      );
      expect(fechaIssues.length).toBeGreaterThan(0);
      expect(result.relatedFieldMessages.fechaNacimiento?.length).toBeGreaterThan(
        0,
      );
      expect(result.invalidPositions).toEqual(
        expect.arrayContaining(fechaIssues.flatMap((i) => i.positions)),
      );
    });

    it('aplica homoclave/siglo solo con año completo', () => {
      const incomplete = validateCurpLive(
        'CXGE941130HJCRNDP0',
        { ...baseDemo, fechaNacimiento: '0001-11-30' },
        { allowGenericCurp: true },
      );
      expect(
        incomplete.issues.some((i) => i.code === 'CURP_CROSS_HOMOCLAVE'),
      ).toBe(false);

      const complete = validateCurpLive(
        'CXGE941130HJCRNDP0',
        { ...baseDemo, fechaNacimiento: '1994-11-30' },
        { allowGenericCurp: true },
      );
      expect(
        complete.issues.some((i) => i.code === 'CURP_CROSS_HOMOCLAVE'),
      ).toBe(true);
    });
  });

  it('marca rojo por charset aunque no haya datos demográficos', () => {
    const result = validateCurpLive('1234', {}, { allowGenericCurp: true });
    expect(result.invalidPositions.length).toBeGreaterThan(0);
    expect(result.validPositions).toEqual([]);
  });

  it('marca posiciones válidas en CURP completa sin errores', () => {
    const result = validateCurpLive('CXGE941130HJCRND07', {
      fechaNacimiento: '1994-11-30',
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    }, { allowGenericCurp: true });

    const blocking = result.issues.filter((i) => i.severity === 'error');
    expect(blocking).toHaveLength(0);
    expect(result.validPositions).toEqual(
      expect.arrayContaining([1, 2, 3, 4, 5, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
    );
  });

  it('valida pos 1–2 con solo primer apellido (CORONEL vs CXGE…)', () => {
    const result = validateCurpLive(
      'CXGE941130HJCRND07',
      {
        primerApellido: 'CORONEL',
      },
      { allowGenericCurp: true },
    );

    const iniciales = result.issues.filter((i) => i.code === 'CURP_CROSS_INICIALES');
    expect(iniciales).toHaveLength(1);
    expect(iniciales[0].positions).toEqual([2]);
    expect(result.invalidPositions).toEqual([2]);
  });

  describe('heurística tardía sinApellidos', () => {
    const sinApellidosDemo = {
      fechaNacimiento: '1990-05-15',
      sexo: 'Masculino',
      entidadNacimiento: '09',
      nombre: 'JUAN',
    };

    it('no exige X en 1–2–3–14–15 solo con nombre (umbral no alcanzado)', () => {
      const result = validateCurpLive(
        'GALJ900515HDFRPN08',
        { nombre: 'JUAN' },
        { allowGenericCurp: true },
      );

      // Letras de apellido en CURP no se castigan aún: falta demografía/CURP umbral
      expect(result.invalidPositions).not.toContain(1);
      expect(result.invalidPositions).not.toContain(2);
      expect(result.invalidPositions).not.toContain(3);
      expect(result.invalidPositions).not.toContain(14);
      expect(result.invalidPositions).not.toContain(15);
      // Pos. 4 del nombre sí se cruza (JUAN → J; aquí coincide con GALJ)
      expect(result.validPositions).toContain(4);
    });

    it('con demografía completa y CURP ≥ 16 acepta XXX…XX… alineada al nombre', () => {
      const result = validateCurpLive('XXXJ900515HDFXXN08', sinApellidosDemo, {
        allowGenericCurp: true,
      });

      expect(result.invalidPositions).not.toContain(1);
      expect(result.invalidPositions).not.toContain(2);
      expect(result.invalidPositions).not.toContain(3);
      expect(result.invalidPositions).not.toContain(14);
      expect(result.invalidPositions).not.toContain(15);
      expect(result.validPositions).toEqual(
        expect.arrayContaining([1, 2, 3, 4, 14, 15, 16]),
      );
    });

    it('con demografía completa y CURP ≥ 16 marca error si hay letras de apellido', () => {
      const result = validateCurpLive('GALJ900515HDFRPN08', sinApellidosDemo, {
        allowGenericCurp: true,
      });

      expect(result.invalidPositions).toEqual(
        expect.arrayContaining([1, 2, 3, 14, 15]),
      );
    });

    it('al capturar primer apellido deja de aplicar modo sinApellidos', () => {
      const result = validateCurpLive(
        'XXXJ900515HDFXXN08',
        {
          ...sinApellidosDemo,
          primerApellido: 'GARCIA',
        },
        { allowGenericCurp: true },
      );

      // Ya no espera X en 1–2–14; espera segmentos de GARCIA + X en 3/15
      expect(result.invalidPositions).toEqual(
        expect.arrayContaining([1, 2, 14]),
      );
      expect(result.validPositions).toEqual(
        expect.arrayContaining([3, 15]),
      );
    });

    it('caso captura HEMENEGILDO: valida X en posiciones de apellido', () => {
      const result = validateCurpLive(
        'XXXH980808HASXXM91',
        {
          fechaNacimiento: '1998-08-08',
          sexo: 'Masculino',
          sexoCURP: 1,
          useSexoCurpForValidation: true,
          entidadNacimiento: 'AGUASCALIENTES',
          nombre: 'HEMENEGILDO',
        },
        { allowGenericCurp: true },
      );

      expect(result.invalidPositions).not.toContain(1);
      expect(result.invalidPositions).not.toContain(2);
      expect(result.invalidPositions).not.toContain(3);
      expect(result.invalidPositions).not.toContain(14);
      expect(result.invalidPositions).not.toContain(15);
      expect(result.validPositions).toEqual(
        expect.arrayContaining([1, 2, 3, 4, 14, 15, 16]),
      );
    });
  });

  it('valida iniciales, sexo y consonantes sin fecha ni entidad', () => {
    const result = validateCurpLive(
      'CXGE941130HJCRND07',
      {
        sexo: 'Masculino',
        nombre: 'EDGAR',
        primerApellido: 'PEREZ',
        segundoApellido: 'CORONEL',
      },
      { allowGenericCurp: true },
    );

    expect(
      result.issues.some((i) => i.positions.some((p) => p >= 5 && p <= 10)),
    ).toBe(false);
    expect(
      result.issues.some((i) => i.positions.some((p) => p >= 12 && p <= 13)),
    ).toBe(false);
    expect(result.issues.some((i) => i.code === 'CURP_CROSS_INICIALES')).toBe(
      true,
    );
    expect(result.issues.some((i) => i.code === 'CURP_CROSS_CONSONANTES')).toBe(
      true,
    );
    expect(result.issues.some((i) => i.code === 'CURP_CROSS_SEXO')).toBe(
      false,
    );
  });

  it('emite advertencia de checksum en posición 18 sin bloquear submit', () => {
    const curpBadCheck = 'GALJ900515HDFRPN00';
    const result = validateCurpLive(curpBadCheck, demo, {
      allowGenericCurp: true,
    });
    const checksum = result.issues.find((i) => i.code === 'CURP_CHECKSUM');
    expect(checksum).toBeDefined();
    expect(checksum?.severity).toBe('warning');
    expect(checksum?.positions).toEqual([18]);
    expect(result.hasBlockingErrors).toBe(false);
  });

  it('required genera CURP_EMPTY', () => {
    const result = validateCurpLive('', demo, {
      allowGenericCurp: true,
      required: true,
    });
    expect(result.issues.some((i) => i.code === 'CURP_EMPTY')).toBe(true);
  });

  it('SIRES: sexoCURP=3 exige X en posición 11', () => {
    const result = validateCurpLive('GALJ900515HDFRPN08', {
      ...demo,
      sexoCURP: 3,
      useSexoCurpForValidation: true,
    }, { allowGenericCurp: true });

    expect(result.issues.some((i) => i.code === 'CURP_CROSS_SEXO')).toBe(true);
    expect(result.relatedFieldMessages.sexoCURP?.length).toBeGreaterThan(0);
    expect(result.relatedFieldMessages.sexo).toBeUndefined();
  });

  it('SIN_REGIMEN: Intersexual omite cruce de sexo en posición 11', () => {
    const result = validateCurpLive('GALJ900515HDFRPN08', {
      ...demo,
      sexo: 'Intersexual',
      useSexoCurpForValidation: false,
    }, { allowGenericCurp: true });

    expect(result.issues.some((i) => i.code === 'CURP_CROSS_SEXO')).toBe(
      false,
    );
  });
});

describe('requireGenericCurp (entidad 00/99)', () => {
  const demo = {
    fechaNacimiento: '1990-05-15',
    sexo: 'Masculino',
    entidadNacimiento: '00',
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
  };

  it('rechaza CURP real cuando requireGenericCurp', () => {
    const result = validateCurpLive('GALJ900515HDFRPN08', demo, {
      allowGenericCurp: true,
      requireGenericCurp: true,
    });
    expect(result.hasBlockingErrors).toBe(true);
    expect(
      result.issues.some((i) => i.code === 'CURP_GENERIC_REQUIRED'),
    ).toBe(true);
  });

  it('acepta CURP genérica cuando requireGenericCurp', () => {
    const result = validateCurpLive('XXXX999999XXXXXX99', demo, {
      allowGenericCurp: true,
      requireGenericCurp: true,
    });
    expect(result.hasBlockingErrors).toBe(false);
    expect(
      result.issues.filter((i) => i.code === 'CURP_GENERIC_REQUIRED'),
    ).toHaveLength(0);
  });

  it('marca CURP_GENERIC_REQUIRED en CURP incompleta', () => {
    const result = validateCurpLive('GALJ', demo, {
      allowGenericCurp: true,
      requireGenericCurp: true,
    });
    expect(
      result.issues.some((i) => i.code === 'CURP_GENERIC_REQUIRED'),
    ).toBe(true);
  });
});

describe('nacimiento extranjero (entidad 88 → NE)', () => {
  const demoExtranjero = {
    fechaNacimiento: '1990-05-15',
    sexo: 'Masculino',
    entidadNacimiento: '88',
    nombre: 'JUAN',
    primerApellido: 'GARCIA',
    segundoApellido: 'LOPEZ',
  };

  it('marca error en pos. 12-13 si CURP real no tiene NE', () => {
    const result = validateCurpLive('GALJ900515HDFRPN08', demoExtranjero, {
      allowGenericCurp: true,
    });
    expect(result.invalidPositions).toEqual(
      expect.arrayContaining([12, 13]),
    );
    expect(
      result.issues.some((i) => i.code === 'CURP_CROSS_ENTIDAD'),
    ).toBe(true);
  });

  it('acepta CURP real con NE en posiciones 12-13', () => {
    const result = validateCurpLive('GALJ900515HNERPN08', demoExtranjero, {
      allowGenericCurp: true,
    });
    expect(
      result.issues.filter((i) => i.code === 'CURP_CROSS_ENTIDAD'),
    ).toHaveLength(0);
    expect(result.validPositions).toEqual(expect.arrayContaining([12, 13]));
  });

  it('acepta CURP genérica sin cruce de entidad', () => {
    const result = validateCurpLive('XXXX999999XXXXXX99', demoExtranjero, {
      allowGenericCurp: true,
    });
    expect(result.hasBlockingErrors).toBe(false);
    expect(
      result.issues.filter((i) => i.code === 'CURP_CROSS_ENTIDAD'),
    ).toHaveLength(0);
  });
});

describe('validateCURPCrossCheck (paridad BE)', () => {
  it('debe pasar para GARCIA LOPEZ JUAN', () => {
    const result = validateCURPCrossCheck('GALJ900515HDFRPN08', {
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '09',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    });
    expect(result.isValid).toBe(true);
  });

  it('debe exigir NE con entidad 88 y aceptar CURP con NE', () => {
    const data = {
      fechaNacimiento: new Date('1990-05-15'),
      sexo: 'Masculino',
      entidadNacimiento: '88',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    };
    const mismatch = validateCURPCrossCheck('GALJ900515HDFRPN08', data);
    expect(
      mismatch.discrepancies.find((d) => d.field === 'entidadNacimiento'),
    ).toMatchObject({ expected: 'NE', gotFromCurp: 'DF' });

    const match = validateCURPCrossCheck('GALJ900515HNERPN08', data);
    expect(
      match.discrepancies.filter((d) => d.field === 'entidadNacimiento'),
    ).toHaveLength(0);
  });

  it('debe aceptar iniciales COGE o CXGE con palabra inconveniente', () => {
    const data = {
      fechaNacimiento: '1994-11-30',
      sexo: 'Masculino',
      entidadNacimiento: 'JALISCO',
      nombre: 'EDGAR OMAR',
      primerApellido: 'CORONEL',
      segundoApellido: 'GONZALEZ',
    };
    expect(validateCURPCrossCheck('COGE941130HJCRND07', data).isValid).toBe(true);
    expect(validateCURPCrossCheck('CXGE941130HJCRND07', data).isValid).toBe(true);
  });

  it('sexoCURP=3 exige X en posición 11', () => {
    const result = validateCURPCrossCheck('GALJ900515HDFRPN08', {
      fechaNacimiento: new Date('1990-05-15'),
      sexoCURP: 3,
      entidadNacimiento: '09',
      nombre: 'JUAN',
      primerApellido: 'GARCIA',
      segundoApellido: 'LOPEZ',
    });
    expect(result.isValid).toBe(false);
    expect(result.discrepancies.find((d) => d.field === 'sexo')?.expected).toBe(
      'X',
    );
  });
});
