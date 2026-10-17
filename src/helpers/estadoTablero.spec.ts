import { describe, expect, it, vi } from 'vitest';
import {
  CENTRO_TODOS,
  consultaAEstado,
  consultaTieneEstado,
  estadoAConsulta,
  mismaConsulta,
} from './estadoTablero';
import { filtrosVacios } from './dashboardFiltros';

const AGENTES = ['Ruido', 'Polvos', 'Biológicos Infecciosos'];

describe('estadoTablero', () => {
  it('lee periodo por nombre, filtros válidos y comparación', () => {
    const estado = consultaAEstado(
      {
        centro: 'c1',
        periodo: 'anio-anterior',
        sexo: 'Femenino',
        edad: 'de41a50',
        antiguedad: 'de1a4',
        puesto: 'Operador',
        agente: 'Ruido',
        comparar: 'anioAnterior',
      },
      AGENTES,
    );
    expect(estado).toEqual({
      centro: 'c1',
      periodo: 'Año anterior',
      filtros: { puesto: 'Operador', sexo: 'Femenino', edad: 'de41a50', antiguedad: 'de1a4', agente: 'Ruido' },
      comparar: 'anioAnterior',
    });
  });

  it('un rango propio guarda sus fechas; el periodo con nombre las ignora', () => {
    expect(consultaAEstado({ desde: '2026-01-15', hasta: '2026-03-31' }, AGENTES)).toMatchObject({
      desde: '2026-01-15',
      hasta: '2026-03-31',
    });
    const conNombre = consultaAEstado({ periodo: 'este-mes', desde: '2020-01-01' }, AGENTES);
    expect(conNombre.periodo).toBe('Este mes');
    expect(conNombre.desde).toBeUndefined();
  });

  it('ignora valores que no se reconocen', () => {
    const estado = consultaAEstado(
      {
        periodo: 'siglo-pasado',
        desde: '15/01/2026',
        hasta: '2026-13-45',
        sexo: 'Otro',
        edad: 'de1a2',
        antiguedad: 'x',
        agente: 'Inventado',
        comparar: 'siempre',
      },
      AGENTES,
    );
    expect(estado).toEqual({ filtros: filtrosVacios(), comparar: 'anterior' });
  });

  it('toma el primer valor si un parámetro viene repetido y recorta textos largos', () => {
    const estado = consultaAEstado({ puesto: ['A', 'B'], centro: 'x'.repeat(500) }, AGENTES);
    expect(estado.filtros.puesto).toBe('A');
    expect(estado.centro).toHaveLength(120);
  });

  it('escribe solo lo necesario: sin vacíos ni la comparación por omisión', () => {
    expect(
      estadoAConsulta({
        centro: CENTRO_TODOS,
        periodo: 'Este año',
        desde: '2026-01-01',
        filtros: { ...filtrosVacios(), sexo: 'Masculino' },
        comparar: 'anterior',
      }),
    ).toEqual({ centro: 'todos', periodo: 'este-anio', sexo: 'Masculino' });
  });

  it('ida y vuelta conserva el estado', () => {
    const consulta = { centro: 'c9', desde: '2026-02-01', hasta: '2026-02-28', agente: 'Biológicos Infecciosos', comparar: 'anioAnterior' };
    expect(estadoAConsulta(consultaAEstado(consulta, AGENTES))).toEqual(consulta);
  });

  it('distingue si la dirección trae estado además del centro', () => {
    expect(consultaTieneEstado({ centro: 'c1', informes: '1' })).toBe(false);
    expect(consultaTieneEstado({ centro: 'c1', sexo: 'Femenino' })).toBe(true);
  });

  it('compara consultas sin importar parámetros ajenos como informes', () => {
    expect(mismaConsulta({ centro: 'c1', sexo: 'Femenino', informes: '1' }, { centro: 'c1', sexo: 'Femenino' })).toBe(true);
    expect(mismaConsulta({ centro: 'c1', sexo: 'Femenino' }, { centro: 'c1' })).toBe(false);
  });
});

describe('vistas del tablero', () => {
  it('recuerda gráfica o tabla por sección e ignora valores extraños', async () => {
    const { guardarVista, leerVistasGuardadas } = await import('./estadoTablero');
    // El setup de pruebas usa un localStorage que no guarda; aquí uno en memoria
    const datos = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
      clear: () => datos.clear(),
    });
    guardarVista('vistaIMC', 'tabla');
    guardarVista('vistaSexo', 'grafico');
    guardarVista('vistaSexo', 'pastel');
    expect(leerVistasGuardadas()).toEqual({ vistaIMC: 'tabla', vistaSexo: 'grafico' });

    localStorage.setItem('ramazzini:tablero:vistas', '{"vistaIMC":"x","vistaAptitud":"tabla"}');
    expect(leerVistasGuardadas()).toEqual({ vistaAptitud: 'tabla' });
    vi.unstubAllGlobals();
  });
});
