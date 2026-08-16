import { describe, expect, it } from 'vitest';
import {
  filterEntidadCatalogEntries,
  filterLocalidadCatalogEntries,
  filterMunicipioCatalogEntries,
  getAllowedEntidadCodesForPaisNacimiento,
  getAllowedEntidadCodesForPaisResidencia,
  getExcludedEntidadCodes,
  getExcludedPaisCodes,
  getMexicoEntidadResidenciaAllowedCodes,
  getMunicipioSentinelCodesForSelector,
  getNonMexicoEntidadCodes,
  isEntidadAllowedForPais,
  isEntidadAllowedForPaisNacimiento,
  PAIS_MEXICO,
  validatePaisEntidadCoherence,
} from './geoSelectorRules';
import { applyResidenciaCoherence, getResidenciaUiState } from './residenciaGeoRules';

describe('geoSelectorRules nacimiento', () => {
  it('México nacimiento trabajador permite 00, 99 y 01-32', () => {
    const allowed = getAllowedEntidadCodesForPaisNacimiento(PAIS_MEXICO, 'trabajador');
    expect(allowed).toContain('00');
    expect(allowed).toContain('99');
    expect(allowed).toContain('09');
    expect(allowed).toHaveLength(34);
    expect(allowed).not.toContain('NE');
    expect(allowed).not.toContain('88');
  });

  it('México nacimiento firmante permite solo entidades 01-32', () => {
    const allowed = getAllowedEntidadCodesForPaisNacimiento(PAIS_MEXICO, 'firmante');
    expect(allowed).toHaveLength(32);
    expect(allowed).not.toContain('00');
    expect(allowed).not.toContain('99');
  });

  it('valida coherencia nacimiento México + entidad 00/99 para trabajador', () => {
    expect(
      validatePaisEntidadCoherence(142, '00', 'trabajador', 'nacimiento'),
    ).toEqual([]);
    expect(
      validatePaisEntidadCoherence(142, '99', 'trabajador', 'nacimiento'),
    ).toEqual([]);
  });

  it('país extranjero nacimiento solo permite 88 (NO APLICA) para trabajador y firmante', () => {
    expect(getNonMexicoEntidadCodes('trabajador')).toEqual(['88']);
    expect(getNonMexicoEntidadCodes('firmante')).toEqual(['88']);
    expect(getAllowedEntidadCodesForPaisNacimiento(228, 'trabajador')).toEqual([
      '88',
    ]);
    expect(getAllowedEntidadCodesForPaisNacimiento(246, 'firmante')).toEqual([
      '88',
    ]);
  });
});

describe('geoSelectorRules residencia', () => {
  it('México residencia trabajador permite 00, 99 y 01-32', () => {
    const allowed = getAllowedEntidadCodesForPaisResidencia(PAIS_MEXICO, 'trabajador');
    expect(allowed).toContain('00');
    expect(allowed).toContain('99');
    expect(allowed).toContain('09');
    expect(allowed).not.toContain('NE');
    expect(allowed).not.toContain('88');
  });

  it('extranjero residencia solo permite entidad 88', () => {
    expect(getAllowedEntidadCodesForPaisResidencia(228, 'trabajador')).toEqual(['88']);
    expect(getAllowedEntidadCodesForPaisResidencia(246, 'trabajador')).toEqual(['88']);
  });

  it('trabajador muestra centinelas de municipio con entidad estatal', () => {
    expect(
      getMunicipioSentinelCodesForSelector('trabajador', '09', PAIS_MEXICO),
    ).toEqual(['999', '998']);
  });
});

describe('geoSelectorRules general', () => {
  it('firmante excluye países 247 y 248', () => {
    expect(getExcludedPaisCodes('firmante')).toEqual(['247', '248']);
    expect(getExcludedPaisCodes('trabajador')).toEqual([]);
  });

  it('firmante excluye entidades 00 y 99 aunque no haya país', () => {
    expect(getExcludedEntidadCodes('firmante')).toEqual(['00', '99']);
    expect(isEntidadAllowedForPaisNacimiento('00', null, 'firmante')).toBe(false);
    expect(isEntidadAllowedForPaisNacimiento('99', null, 'firmante')).toBe(false);
    expect(isEntidadAllowedForPaisNacimiento('09', null, 'firmante')).toBe(true);

    const filtered = filterEntidadCatalogEntries(
      [
        { code: '00', description: 'NO ESPECIFICADO' },
        { code: '09', description: 'CIUDAD DE MEXICO' },
        { code: '99', description: 'SE IGNORA' },
        { code: '88', description: 'NO APLICA' },
      ],
      'firmante',
    );
    expect(filtered.map((e) => e.code)).toEqual(['09', '88']);
  });

  it('firmante excluye municipios/localidades SE IGNORA y NO ESPECIFICADO del catálogo', () => {
    expect(
      filterMunicipioCatalogEntries(
        [
          { code: '09-001', municipioCode: '001', description: 'Alvaro Obregon' },
          { code: '09-998', municipioCode: '998', description: 'SE IGNORA' },
          { code: '09-999', municipioCode: '999', description: 'NO ESPECIFICADO' },
        ],
        'firmante',
      ).map((e) => e.municipioCode),
    ).toEqual(['001']);

    expect(
      filterLocalidadCatalogEntries(
        [
          { code: '09-001-0001', description: 'Colonia' },
          { code: '9998', description: 'SE IGNORA' },
          { code: '09-001-9999', description: 'NO ESPECIFICADO' },
        ],
        'firmante',
      ).map((e) => e.code),
    ).toEqual(['09-001-0001']);
  });

  it('trabajador conserva SE IGNORA y NO ESPECIFICADO en filtros de catálogo', () => {
    expect(
      filterEntidadCatalogEntries(
        [
          { code: '00', description: 'NO ESPECIFICADO' },
          { code: '99', description: 'SE IGNORA' },
        ],
        'trabajador',
      ),
    ).toHaveLength(2);
  });

  it('valida coherencia nacimiento México + entidad estatal', () => {
    expect(
      validatePaisEntidadCoherence(142, '09', 'trabajador', 'nacimiento'),
    ).toEqual([]);
  });

  it('valida coherencia residencia México + entidad 00', () => {
    expect(
      validatePaisEntidadCoherence(142, '00', 'trabajador', 'residencia'),
    ).toEqual([]);
  });

  it('rechaza residencia extranjera sin entidad 88', () => {
    const errors = validatePaisEntidadCoherence(
      246,
      'NE',
      'trabajador',
      'residencia',
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('residenciaGeoRules', () => {
  it('país extranjero bloquea entidad/municipio/localidad en NO APLICA', () => {
    const state = getResidenciaUiState(
      {
        paisResidencia: 246,
        entidadResidencia: '',
        municipioResidencia: '',
        localidadResidencia: '',
      },
      'trabajador',
    );
    expect(state.entidad.locked).toBe(true);
    expect(state.entidad.forcedValue).toBe('88');
    expect(state.municipio.forcedValue).toBe('997');
    expect(state.localidad.forcedValue).toBe('9997');
  });

  it('México residencia permite 00 y 99 en selector', () => {
    const state = getResidenciaUiState(
      {
        paisResidencia: 142,
        entidadResidencia: '',
        municipioResidencia: '',
        localidadResidencia: '',
      },
      'trabajador',
    );
    expect(state.entidad.allowedEntidadCodes).toEqual(
      getMexicoEntidadResidenciaAllowedCodes('trabajador'),
    );
  });

  it('cambio a país extranjero fuerza 88/997/9997', () => {
    const form = {
      paisResidencia: 142,
      entidadResidencia: '09',
      municipioResidencia: '001',
      localidadResidencia: '0001',
    };
    form.paisResidencia = 246;
    applyResidenciaCoherence(form, 'pais', 'trabajador');
    expect(form.entidadResidencia).toBe('88');
    expect(form.municipioResidencia).toBe('997');
    expect(form.localidadResidencia).toBe('9997');
  });

  it('entidad estatal sincroniza país a México cuando país está vacío', () => {
    const form = {
      paisResidencia: '',
      entidadResidencia: '14',
      municipioResidencia: '',
      localidadResidencia: '',
    };
    applyResidenciaCoherence(form, 'entidad', 'trabajador');
    expect(form.paisResidencia).toBe(PAIS_MEXICO);
  });

  it('firmante limpia entidad 00/99 en init aunque país esté vacío', () => {
    const form = {
      paisResidencia: '',
      entidadResidencia: '00',
      municipioResidencia: '999',
      localidadResidencia: '9999',
    };
    applyResidenciaCoherence(form, 'init', 'firmante');
    expect(form.entidadResidencia).toBe('');
    expect(form.municipioResidencia).toBe('');
    expect(form.localidadResidencia).toBe('');
  });
});

describe('isEntidadAllowedForPais nacimiento', () => {
  it('OTRO 246 nacimiento solo permite 88 y rechaza NE', () => {
    expect(isEntidadAllowedForPais('88', 246, 'trabajador')).toBe(true);
    expect(isEntidadAllowedForPais('NE', 246, 'trabajador')).toBe(false);
    expect(isEntidadAllowedForPais('88', 246, 'firmante')).toBe(true);
    expect(isEntidadAllowedForPais('NE', 246, 'firmante')).toBe(false);
  });
});
