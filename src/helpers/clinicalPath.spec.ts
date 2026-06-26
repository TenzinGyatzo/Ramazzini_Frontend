import { describe, expect, it } from 'vitest';
import {
  buildClinicalDirectoryPath,
  sanitizePathSegment,
} from './clinicalPath';

describe('clinicalPath', () => {
  it('sanitizePathSegment reemplaza barras por guiones', () => {
    expect(sanitizePathSegment('MEGA PRODUCTO / NUEVOS INGRESOS')).toBe(
      'MEGA PRODUCTO - NUEVOS INGRESOS',
    );
  });

  it('buildClinicalDirectoryPath sanitiza segmentos con barra', () => {
    expect(
      buildClinicalDirectoryPath(
        'ACEROS DE GUATEMALA',
        'MEGA PRODUCTO / NUEVOS INGRESOS',
        'JAIME EMANUEL',
        '6a3d25e4cd1e8332593053fc',
      ),
    ).toBe(
      'expedientes-medicos/ACEROS DE GUATEMALA/MEGA PRODUCTO - NUEVOS INGRESOS/JAIME EMANUEL_6a3d25e4cd1e8332593053fc',
    );
  });
});
