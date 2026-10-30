import { describe, expect, it } from 'vitest';
import {
  filtrosParaLaTabla,
  filtrosVacios,
  chipsDeFiltros,
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

  it('una lista vacía no cuenta como filtro', () => {
    expect(hayFiltros(filtros({ puesto: [], edad: [] }))).toBe(false);
    expect(hayFiltros(filtros({ puesto: ['Soldador'] }))).toBe(true);
  });

  it('convierte los rangos en años cumplidos, aunque no se toquen entre sí', () => {
    expect(parametrosDeFiltros(filtros({ edad: ['hasta30'] }))).toEqual({ edadRango: ['-30'] });
    expect(parametrosDeFiltros(filtros({ edad: ['hasta30', 'de41a50', 'desde61'] }))).toEqual({
      edadRango: ['-30', '41-50', '61-'],
    });
    expect(parametrosDeFiltros(filtros({ antiguedad: ['menos1', 'desde10'] }))).toEqual({
      antiguedadRango: ['-0', '10-'],
    });
    // Una clave desconocida no manda nada
    expect(parametrosDeFiltros(filtros({ edad: ['otra'] }))).toEqual({});
  });

  it('manda juntos todos los filtros elegidos y los describe', () => {
    const elegidos = filtros({
      puesto: ['Soldador', 'Chofer'],
      sexo: 'Femenino',
      edad: ['de41a50'],
      antiguedad: ['de5a9', 'desde10'],
      agente: ['Ruido'],
    });
    expect(hayFiltros(elegidos)).toBe(true);
    expect(parametrosDeFiltros(elegidos)).toEqual({
      puesto: ['Soldador', 'Chofer'],
      sexo: 'Femenino',
      agente: ['Ruido'],
      edadRango: ['41-50'],
      antiguedadRango: ['5-9', '10-'],
    });
    expect(textoDeFiltros(elegidos)).toBe(
      'Puesto: Soldador, Chofer · Sexo: Femenino · De 41 a 50 años · Antigüedad: de 5 a 9 años, 10 años o más · Expuestos a: Ruido',
    );
  });

  it('los chips permiten quitar opción por opción; una lista larga va en uno solo', () => {
    expect(chipsDeFiltros(filtros())).toEqual([]);
    expect(
      chipsDeFiltros(filtros({ puesto: ['Soldador'], sexo: 'Femenino', edad: ['hasta30'], antiguedad: ['de1a4'], agente: ['Ruido'] })),
    ).toEqual([
      { filtro: 'puesto', valor: 'Soldador', texto: 'Soldador' },
      { filtro: 'sexo', texto: 'Femenino' },
      { filtro: 'edad', valor: 'hasta30', texto: 'Hasta 30 años' },
      { filtro: 'antiguedad', valor: 'de1a4', texto: 'Antigüedad: De 1 a 4 años' },
      { filtro: 'agente', valor: 'Ruido', texto: 'Expuestos a: Ruido' },
    ]);
    const puesto = Array.from({ length: 7 }, (_, i) => `P${i}`);
    expect(chipsDeFiltros(filtros({ puesto }))).toEqual([{ filtro: 'puesto', texto: '7 puestos' }]);
    expect(textoDeFiltros(filtros({ puesto }))).toBe(`Puesto: ${puesto.join(', ')}`);
  });

  it('lleva a la tabla de trabajadores lo que la tabla sabe filtrar, y dice qué no', () => {
    expect(filtrosParaLaTabla(filtros({ puesto: ['Soldador'], sexo: 'Masculino', agente: ['Polvos'] }))).toEqual({
      consulta: { puesto: 'Soldador', sexo: 'Masculino', exposicion: 'Polvos' },
      sinEquivalente: [],
    });
    expect(filtrosParaLaTabla(filtros({ edad: ['de31a40'], antiguedad: ['menos1'] }))).toEqual({
      consulta: {},
      sinEquivalente: ['edad', 'antigüedad'],
    });
    expect(filtrosParaLaTabla(filtros({ puesto: ['A', 'B'], agente: ['Ruido', 'Polvos'], sexo: 'Femenino' }))).toEqual({
      consulta: { sexo: 'Femenino' },
      sinEquivalente: ['varios puestos', 'varios agentes de riesgo'],
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
