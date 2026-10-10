import { describe, expect, it } from 'vitest';
import {
  filtrosParaLaTabla,
  filtrosVacios,
  hayFiltros,
  parametrosDeFiltros,
  puestosDisponibles,
  textoDeFiltros,
} from './dashboardFiltros';

const filtros = (cambios = {}) => ({ ...filtrosVacios(), ...cambios });

describe('filtros de población del tablero de salud', () => {
  it('sin filtros no manda parámetros ni texto', () => {
    expect(hayFiltros(filtros())).toBe(false);
    expect(parametrosDeFiltros(filtros())).toEqual({});
    expect(textoDeFiltros(filtros())).toBe('');
  });

  it('convierte los rangos en mínimos y máximos de años cumplidos', () => {
    expect(parametrosDeFiltros(filtros({ edad: 'menos30' }))).toEqual({ edadMax: 29 });
    expect(parametrosDeFiltros(filtros({ edad: 'de40a49' }))).toEqual({ edadMin: 40, edadMax: 49 });
    expect(parametrosDeFiltros(filtros({ edad: 'desde60' }))).toEqual({ edadMin: 60 });
    expect(parametrosDeFiltros(filtros({ antiguedad: 'menos1' }))).toEqual({ antiguedadMax: 0 });
    expect(parametrosDeFiltros(filtros({ antiguedad: 'desde10' }))).toEqual({ antiguedadMin: 10 });
    // Una clave desconocida no manda nada
    expect(parametrosDeFiltros(filtros({ edad: 'otra' }))).toEqual({});
  });

  it('manda juntos todos los filtros elegidos y los describe', () => {
    const elegidos = filtros({
      puesto: 'Soldador',
      sexo: 'Femenino',
      edad: 'de40a49',
      antiguedad: 'de5a9',
      agente: 'Ruido',
    });
    expect(hayFiltros(elegidos)).toBe(true);
    expect(parametrosDeFiltros(elegidos)).toEqual({
      puesto: 'Soldador',
      sexo: 'Femenino',
      agente: 'Ruido',
      edadMin: 40,
      edadMax: 49,
      antiguedadMin: 5,
      antiguedadMax: 9,
    });
    expect(textoDeFiltros(elegidos)).toBe(
      'Puesto: Soldador · Sexo: Femenino · De 40 a 49 años · Antigüedad: de 5 a 9 años · Expuestos a: Ruido',
    );
  });

  it('lleva a la tabla de trabajadores lo que la tabla sabe filtrar, y dice qué no', () => {
    expect(filtrosParaLaTabla(filtros({ puesto: 'Soldador', sexo: 'Masculino', agente: 'Polvos' }))).toEqual({
      consulta: { puesto: 'Soldador', sexo: 'Masculino', exposicion: 'Polvos' },
      sinEquivalente: [],
    });
    expect(filtrosParaLaTabla(filtros({ edad: 'de30a39', antiguedad: 'menos1' }))).toEqual({
      consulta: {},
      sinEquivalente: ['edad', 'antigüedad'],
    });
  });

  it('junta los puestos de los centros visibles, sin repetir', () => {
    const datos = [{ puestos: ['Soldador', 'Chofer'] }, { puestos: ['soldador', 'Almacenista'] }, undefined];
    expect(puestosDisponibles(datos, null)).toEqual(['Almacenista', 'Chofer', 'Soldador']);
    expect(puestosDisponibles(datos, 1)).toEqual(['Almacenista', 'soldador']);
    // Un servidor sin actualizar no manda puestos
    expect(puestosDisponibles([{}], null)).toEqual([]);
  });
});
