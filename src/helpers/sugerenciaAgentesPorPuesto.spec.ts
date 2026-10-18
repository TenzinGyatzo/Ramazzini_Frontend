import { describe, expect, it } from 'vitest';
import {
  mismosAgentes,
  normalizarPuesto,
  sugerirAgentesPorPuesto,
  textoSugerenciaAgentes,
} from './sugerenciaAgentesPorPuesto';

const ORDEN = ['Ruido', 'Vibraciones', 'Temperaturas elevadas', 'Polvos', 'Químicos'];
const t = (id: string, puesto: string, agentes: string[], extra: Record<string, unknown> = {}) => ({
  _id: id,
  puesto,
  estadoLaboral: 'Activo',
  agentesRiesgoActuales: agentes,
  ...extra,
});

describe('sugerencia de agentes de riesgo por puesto', () => {
  it('el puesto se compara sin mayúsculas, acentos ni espacios de más', () => {
    expect(normalizarPuesto('  Sóldador  de   Planta ')).toBe('soldador de planta');
  });

  it('propone la combinación más frecuente entre los compañeros del mismo puesto, en el orden del catálogo', () => {
    const nuevo = t('n', 'Soldador', []);
    const lista = [
      nuevo,
      t('1', 'SOLDADOR', ['Químicos', 'Ruido']),
      t('2', 'soldador', ['Ruido', 'Químicos']),
      t('3', 'Soldador', ['Ruido']),
      t('4', 'Almacenista', ['Polvos']),
    ];
    expect(sugerirAgentesPorPuesto(nuevo, lista, ORDEN)).toEqual({
      agentes: ['Ruido', 'Químicos'],
      coinciden: 2,
      total: 3,
    });
  });

  it('no cuenta al propio trabajador, a los dados de baja ni a quienes no tienen agentes', () => {
    const yo = t('n', 'Soldador', ['Polvos']);
    const lista = [
      yo,
      t('1', 'Soldador', ['Ruido']),
      t('2', 'Soldador', ['Vibraciones'], { estadoLaboral: 'Inactivo' }),
      t('3', 'Soldador', []),
    ];
    expect(sugerirAgentesPorPuesto(yo, lista, ORDEN)).toEqual({ agentes: ['Ruido'], coinciden: 1, total: 1 });
  });

  it('ante empate prefiere la combinación con más agentes', () => {
    const nuevo = t('n', 'Soldador', []);
    const lista = [t('1', 'Soldador', ['Ruido']), t('2', 'Soldador', ['Ruido', 'Polvos'])];
    expect(sugerirAgentesPorPuesto(nuevo, lista, ORDEN)?.agentes).toEqual(['Ruido', 'Polvos']);
  });

  it('sin puesto, sin compañeros o sin agentes capturados no hay sugerencia', () => {
    expect(sugerirAgentesPorPuesto(t('n', '', []), [t('1', '', ['Ruido'])], ORDEN)).toBeNull();
    expect(sugerirAgentesPorPuesto(t('n', 'Soldador', []), [t('n', 'Soldador', [])], ORDEN)).toBeNull();
    expect(sugerirAgentesPorPuesto(t('n', 'Soldador', []), [t('1', 'Soldador', [])], ORDEN)).toBeNull();
    expect(sugerirAgentesPorPuesto(t('n', 'Soldador', []), null, ORDEN)).toBeNull();
  });

  it('el texto dice cuántos coinciden', () => {
    expect(textoSugerenciaAgentes({ agentes: ['Ruido'], coinciden: 1, total: 1 }, 'SOLDADOR')).toBe(
      'El otro trabajador con el puesto SOLDADOR tiene:',
    );
    expect(textoSugerenciaAgentes({ agentes: ['Ruido'], coinciden: 12, total: 12 }, 'SOLDADOR')).toBe(
      'Los otros 12 trabajadores con el puesto SOLDADOR tienen:',
    );
    expect(textoSugerenciaAgentes({ agentes: ['Ruido'], coinciden: 8, total: 12 }, 'SOLDADOR')).toBe(
      '8 de los 12 trabajadores con el puesto SOLDADOR tienen:',
    );
  });

  it('mismosAgentes no depende del orden', () => {
    expect(mismosAgentes(['Ruido', 'Polvos'], ['Polvos', 'Ruido'])).toBe(true);
    expect(mismosAgentes(['Ruido'], ['Ruido', 'Polvos'])).toBe(false);
  });
});
