import { describe, expect, it } from 'vitest';
import {
  COLOR_DE_TONO,
  FILAS_POR_GRAFICA,
  configDeGrafica,
  graficasAntidoping,
  graficasDiagnosticos,
  graficasNordico,
  graficasOtologica,
  medidasDe,
  partirEtiqueta,
} from './dashboardGraficasInforme';

const conteo = (clave: string, cantidad: number) => ({ clave, etiqueta: clave, cantidad });

describe('gráficas de las secciones nuevas del informe completo', () => {
  it('Nórdico: dona del resultado con los colores de la pantalla y barras de zonas', () => {
    const graficas = graficasNordico({
      evaluados: 20,
      semaforo: [conteo('verde', 12), conteo('amarillo', 5), conteo('rojo', 3)],
      zonas12Meses: [conteo('Espalda baja', 6), conteo('Cuello', 0)],
    } as any);
    expect(graficas.map((g) => g.tipo)).toEqual(['dona', 'barras']);
    const [dona, barras] = graficas as any[];
    expect(dona.segmentos).toEqual([
      { etiqueta: 'Requieren seguimiento', cantidad: 3, color: COLOR_DE_TONO.riesgo },
      { etiqueta: 'Con molestias', cantidad: 5, color: COLOR_DE_TONO.atencion },
      { etiqueta: 'Sin molestias', cantidad: 12, color: COLOR_DE_TONO.resto },
    ]);
    expect(dona.total).toBe(20);
    // Las zonas sin casos no se dibujan; el porcentaje es sobre los evaluados
    expect(barras.filas).toEqual([{ etiqueta: 'Espalda baja', cantidad: 6, total: 20, color: COLOR_DE_TONO.neutro }]);
  });

  it('sin datos no hay gráfica: nunca se dibuja algo vacío', () => {
    expect(
      graficasOtologica({ evaluados: 3, respuestas: [], proteccion: [], expuestosConRespuesta: 0 } as any),
    ).toEqual([]);
    expect(graficasDiagnosticos({ total: 0, porCodigo: [], porCapitulo: [], primeraVez: 0, subsecuentes: 0 })).toEqual([]);
  });

  it('antidoping: columnas por mes solo con más de un mes', () => {
    const base = { pruebas: 10, trabajadores: 10, pruebasPositivas: 1, trabajadoresConPositivo: 1, porSustancia: [] };
    const unMes = graficasAntidoping({ ...base, porMes: [{ clave: '2026-01', etiqueta: 'ene 26', pruebas: 10, positivas: 1 }] });
    expect(unMes.map((g) => g.tipo)).toEqual(['dona']);
    const dosMeses = graficasAntidoping({
      ...base,
      porMes: [
        { clave: '2026-01', etiqueta: 'ene 26', pruebas: 6, positivas: 1 },
        { clave: '2026-02', etiqueta: 'feb 26', pruebas: 4, positivas: 0 },
      ],
    });
    const columnas = dosMeses.find((g) => g.tipo === 'columnas') as any;
    expect(columnas.series.map((s: any) => s.valores)).toEqual([
      [1, 0],
      [5, 4],
    ]);
  });

  it('diagnósticos: los grupos más frecuentes, con aviso si hay más que los que caben', () => {
    const porCapitulo = Array.from({ length: 12 }, (_, i) => conteo(`Grupo ${i + 1}`, 12 - i));
    const [barras] = graficasDiagnosticos({ total: 78, porCodigo: [], porCapitulo, primeraVez: 0, subsecuentes: 0 }) as any[];
    expect(barras.filas).toHaveLength(FILAS_POR_GRAFICA);
    expect(barras.nota).toContain('todos están en la tabla');
  });

  it('las etiquetas largas se parten en dos líneas como máximo, y la gráfica crece con ellas', () => {
    expect(partirEtiqueta('Cuello')).toBe('Cuello');
    const larga = partirEtiqueta('Traumatismos, envenenamientos y algunas otras consecuencias de causas externas');
    expect(larga).toEqual(['Traumatismos, envenenamientos y algunas', 'otras consecuencias de causas externas']);
    const muyLarga = partirEtiqueta('a '.repeat(60).trim()) as string[];
    expect(muyLarga).toHaveLength(2);
    expect(muyLarga[1].endsWith('…')).toBe(true);

    const fila = (etiqueta: string) => ({ etiqueta, cantidad: 1, total: 2, color: '#000' });
    const [, altoCorto] = medidasDe({ tipo: 'barras', titulo: '', filas: [fila('Cuello')] });
    const [, altoLargo] = medidasDe({ tipo: 'barras', titulo: '', filas: [fila('Traumatismos, envenenamientos y algunas otras')] });
    expect(altoLargo).toBeGreaterThan(altoCorto);
  });

  it('las barras dicen cantidad y porcentaje sobre el total de cada fila, sin omitir etiquetas', () => {
    const config = configDeGrafica({
      tipo: 'barras',
      titulo: '',
      filas: [{ etiqueta: 'Tabaquismo', cantidad: 3, total: 12, color: '#F59E0B' }],
    });
    expect(config.options.plugins.datalabels.formatter(3, { dataIndex: 0 })).toBe('3 (25 %)');
    expect(config.options.scales.y.ticks.autoSkip).toBe(false);
  });
});
