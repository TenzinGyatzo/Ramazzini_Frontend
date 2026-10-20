import { describe, expect, it } from 'vitest';
import {
  collectKeysWithData,
  filterColumnKeysForRegime,
  getColumnasDisponibles,
  getDefaultColumnKeys,
  getPresetColumnKeys,
  isEmptyExportCell,
  ordenarColumnasParaArchivo,
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

  const PLANTILLA_SIN_REGIMEN = [
    'numeroEmpleado',
    'nss',
    'primerApellido',
    'segundoApellido',
    'nombre',
    'fechaNacimiento',
    'sexo',
    'escolaridad',
    'puesto',
    'fechaIngreso',
    'telefono',
    'estadoCivil',
  ];

  it('preset Identificación en SIN_REGIMEN: columnas de la plantilla de importación', () => {
    const keys = getPresetColumnKeys('identificacion', false);
    expect(ordenarColumnasParaArchivo(keys, false)).toEqual(PLANTILLA_SIN_REGIMEN);
  });

  it('preset Identificación en SIRES suma CURP, folio y geo después de la plantilla', () => {
    const keys = getPresetColumnKeys('identificacion', true);
    expect(ordenarColumnasParaArchivo(keys, true)).toEqual([
      ...PLANTILLA_SIN_REGIMEN,
      'curp',
      'folio',
      'entidadNacimiento',
      'paisNacimiento',
      'entidadResidencia',
      'municipioResidencia',
      'localidadResidencia',
      'paisResidencia',
    ]);
  });

  it('el archivo usa el orden de la plantilla aunque se seleccionen en otro orden', () => {
    expect(
      ordenarColumnasParaArchivo(
        ['estadoCivil', 'nombre', 'fechaIngreso', 'nss', 'fechaNacimiento', 'numeroEmpleado'],
        false,
      ),
    ).toEqual(['numeroEmpleado', 'nss', 'nombre', 'fechaNacimiento', 'fechaIngreso', 'estadoCivil']);
  });

  it('el preset Básico conserva su orden en el archivo', () => {
    expect(ordenarColumnasParaArchivo(getDefaultColumnKeys(false), false)).toEqual([
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

  it('edad y antigüedad van junto a su fecha; el resto, en orden del catálogo', () => {
    expect(
      ordenarColumnasParaArchivo(
        ['aptitud', 'antiguedad', 'fechaIngreso', 'edad', 'fechaNacimiento', 'imc', 'nombre'],
        false,
      ),
    ).toEqual(['nombre', 'fechaNacimiento', 'edad', 'fechaIngreso', 'antiguedad', 'imc', 'aptitud']);
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
