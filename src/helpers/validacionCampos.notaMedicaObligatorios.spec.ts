import { describe, expect, it } from 'vitest';
import { validarCamposRequeridos } from './validacionCampos';

const completa = {
  fechaNotaMedica: '2026-11-11',
  motivoConsulta: 'Consulta',
  codigoCIE10Principal: 'E119',
  relacionTemporal: 0,
  genero: 1,
  derechohabiencia: '2',
  peso: 70,
  talla: 170,
};
const sires = { showSiresUI: true, cie10Required: true, esMujer: false };
const faltantes = (datos: Record<string, unknown>, opciones = sires) =>
  validarCamposRequeridos('notaMedica', datos, opciones).camposFaltantes;

describe('nota médica: género, derechohabiencia, peso y talla obligatorios (cumplimiento normativo)', () => {
  it('completa se puede guardar', () => {
    expect(faltantes(completa)).toEqual([]);
  });

  it('género: sin elegir no; «No especificado» (0) sí', () => {
    expect(faltantes({ ...completa, genero: null }).map((c) => c.nombre)).toEqual(['Género']);
    expect(faltantes({ ...completa, genero: 0 })).toEqual([]);
  });

  it('derechohabiencia: sin marcar no; «No especificado» (0) sí', () => {
    expect(faltantes({ ...completa, derechohabiencia: null }).map((c) => c.nombre)).toEqual([
      'Derechohabiencia',
    ]);
    expect(faltantes({ ...completa, derechohabiencia: '0' })).toEqual([]);
  });

  it('peso y talla: vacío no; «Se desconoce» marcado sí; llevan al paso de somatometría', () => {
    const sinNada = faltantes({ ...completa, peso: null, talla: null });
    expect(sinNada.map((c) => c.nombre)).toEqual([
      'Peso (valor o «Se desconoce»)',
      'Talla (valor o «Se desconoce»)',
    ]);
    expect(sinNada.every((c) => c.paso === 7)).toBe(true);
    expect(
      faltantes({ ...completa, peso: null, talla: null, pesoSeDesconoce: true, tallaSeDesconoce: true }),
    ).toEqual([]);
  });

  it('género y derechohabiencia llevan al paso 3', () => {
    const r = faltantes({ ...completa, genero: null, derechohabiencia: null });
    expect(r.every((c) => c.paso === 3)).toBe(true);
  });

  it('sin régimen no se piden', () => {
    expect(
      faltantes(
        { fechaNotaMedica: '2026-11-11', motivoConsulta: 'Consulta', codigoCIE10Principal: 'E119' },
        { showSiresUI: false, cie10Required: true, esMujer: false },
      ),
    ).toEqual([]);
  });
});
