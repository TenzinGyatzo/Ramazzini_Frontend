import { describe, expect, it } from 'vitest';
import { getPlantillaImportacionTrabajadores } from './plantillaImportacionTrabajadores';

describe('plantillaImportacionTrabajadores', () => {
  it('devuelve plantilla SIN_REGIMEN por defecto', () => {
    const plantilla = getPlantillaImportacionTrabajadores('SIN_REGIMEN');
    expect(plantilla.href).toContain('Plantilla para Importar Trabajadores.xlsx');
    expect(plantilla.downloadName).toBe('Plantilla para Importar Trabajadores.xlsx');
  });

  it('devuelve plantilla SIRES_NOM024 con un nombre que no menciona el régimen', () => {
    const plantilla = getPlantillaImportacionTrabajadores('SIRES_NOM024');
    expect(plantilla.href).toContain('(con CURP y residencia).xlsx');
    expect(plantilla.downloadName).toBe('Plantilla para Importar Trabajadores (con CURP y residencia).xlsx');
    expect(plantilla.downloadName).not.toMatch(/SIRES|NOM/i);
  });
});
