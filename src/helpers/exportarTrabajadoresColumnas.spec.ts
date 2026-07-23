import { describe, expect, it } from 'vitest';
import {
  collectKeysWithData,
  filterColumnKeysForRegime,
  getColumnasDisponibles,
  getDefaultColumnKeys,
  getPresetColumnKeys,
  isEmptyExportCell,
} from '@/helpers/exportarTrabajadoresColumnas';

describe('exportarTrabajadoresColumnas', () => {
  it('oculta columnas SIRES-only en SIN_REGIMEN', () => {
    const keys = getColumnasDisponibles(false).map((c) => c.key);
    expect(keys).not.toContain('entidadNacimiento');
    expect(keys).not.toContain('paisNacimiento');
    expect(keys).not.toContain('paisResidencia');
    expect(keys).not.toContain('folio');
    expect(keys).toContain('curp');
    expect(keys).toContain('nombre');
    expect(keys).toContain('aptitud');
  });

  it('incluye columnas de nacimiento/residencia y folio en SIRES', () => {
    const keys = getColumnasDisponibles(true).map((c) => c.key);
    expect(keys).toContain('entidadNacimiento');
    expect(keys).toContain('localidadResidencia');
    expect(keys).toContain('paisResidencia');
    expect(keys).toContain('folio');
    expect(keys).toContain('curp');
  });

  it('defaults Básico no incluyen nss, numeroEmpleado, curp ni geo SIRES', () => {
    const defaults = getDefaultColumnKeys(false);
    expect(defaults).toEqual([
      'primerApellido',
      'segundoApellido',
      'nombre',
      'edad',
      'sexo',
      'puesto',
      'antiguedad',
      'estadoLaboral',
      'consultas',
      'aptitud',
    ]);
  });

  it('filterColumnKeysForRegime descarta keys SIRES-only fuera de SIRES', () => {
    const filtered = filterColumnKeysForRegime(
      ['nombre', 'entidadNacimiento', 'folio', 'paisResidencia', 'aptitud', 'curp'],
      false,
    );
    expect(filtered).toEqual(['curp', 'nombre', 'aptitud']);
  });

  it('ordena CURP al inicio y país de residencia al final del catálogo SIRES', () => {
    const keys = getColumnasDisponibles(true).map((c) => c.key);
    expect(keys[0]).toBe('curp');
    const geoKeys = keys.filter((k) =>
      [
        'entidadNacimiento',
        'paisNacimiento',
        'entidadResidencia',
        'municipioResidencia',
        'localidadResidencia',
        'paisResidencia',
      ].includes(k),
    );
    expect(geoKeys[geoKeys.length - 1]).toBe('paisResidencia');
  });

  it('preset Clínico no incluye geo ni CURP/NSS/folio', () => {
    const keys = getPresetColumnKeys('clinico', true);
    expect(keys).toContain('imc');
    expect(keys).toContain('audiometria');
    expect(keys).toContain('aptitud');
    expect(keys).not.toContain('curp');
    expect(keys).not.toContain('nss');
    expect(keys).not.toContain('folio');
    expect(keys).not.toContain('entidadNacimiento');
    expect(keys).not.toContain('paisResidencia');
  });

  it('preset Identificación incluye folio solo en SIRES', () => {
    expect(getPresetColumnKeys('identificacion', true)).toContain('folio');
    expect(getPresetColumnKeys('identificacion', false)).not.toContain('folio');
    expect(getPresetColumnKeys('identificacion', false)).toContain('curp');
    expect(getPresetColumnKeys('identificacion', false)).toContain('nss');
  });

  it('isEmptyExportCell reconoce vacíos y guion', () => {
    expect(isEmptyExportCell('')).toBe(true);
    expect(isEmptyExportCell('-')).toBe(true);
    expect(isEmptyExportCell(null)).toBe(true);
    expect(isEmptyExportCell('Normal')).toBe(false);
  });

  it('collectKeysWithData solo incluye keys con valor no vacío', () => {
    const keys = collectKeysWithData(
      [
        { nombre: 'Ana', aptitud: '-', curp: '', nss: '-' },
        { nombre: 'Luis', aptitud: 'Apto', curp: '', nss: '-' },
      ],
      false,
    );
    expect(keys).toContain('nombre');
    expect(keys).toContain('aptitud');
    expect(keys).not.toContain('curp');
    expect(keys).not.toContain('nss');
  });
});
