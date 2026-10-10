import { describe, expect, it } from 'vitest';
import {
  columnasDeCentros,
  comparar,
  compararCentros,
  diagnosticoPrincipal,
  indicadoresDelPeriodo,
  periodoDeReferencia,
  textoDeCambio,
  textoDeValor,
} from './dashboardComparativo';

const veces = <T,>(n: number, valor: T): T[] => Array.from({ length: n }, () => valor);
const centro = (campos: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(campos).map(([clave, lista]) => [clave, [lista]]));

const periodo = (sobrepeso: number, normales: number, aptos: number, noAptos: number, consultas: number) => [
  centro({
    imc: [...veces(sobrepeso, { categoriaIMC: 'Sobrepeso' }), ...veces(normales, { categoriaIMC: 'Normal' })],
    tensionArterial: [
      ...veces(2, { categoriaTensionArterial: 'Hipertensión grado 1' }),
      ...veces(8, { categoriaTensionArterial: 'Normal' }),
    ],
    circunferenciaCintura: [
      { categoriaCircunferenciaCintura: 'Alto Riesgo' },
      ...veces(3, { categoriaCircunferenciaCintura: 'Bajo Riesgo' }),
    ],
    aptitudes: [
      ...veces(aptos, { aptitudPuesto: 'Apto Sin Restricciones' }),
      ...veces(noAptos, { aptitudPuesto: 'No Apto' }),
    ],
    consultas: veces(consultas, { fechaNotaMedica: '2026-02-10T00:00:00.000Z' }),
    diagnosticos: veces(consultas, { clave: 'J00X', etiqueta: 'J00X - RINOFARINGITIS', principal: true, mes: '2026-02' }),
  }),
];

describe('comparativo entre periodos del tablero de salud', () => {
  it('el periodo anterior dura lo mismo y termina el día previo', () => {
    expect(periodoDeReferencia('2026-03-01', '2026-03-31', 'anterior')).toEqual({
      desde: '2026-01-29',
      hasta: '2026-02-28',
    });
    expect(periodoDeReferencia('2026-01-01', '2026-12-31', 'anterior')).toEqual({
      desde: '2025-01-01',
      hasta: '2025-12-31',
    });
    expect(periodoDeReferencia('2026-10-10', '2026-10-10', 'anterior')).toEqual({
      desde: '2026-10-09',
      hasta: '2026-10-09',
    });
  });

  it('el mismo periodo del año anterior conserva las fechas', () => {
    expect(periodoDeReferencia('2026-03-01', '2026-03-31', 'anioAnterior')).toEqual({
      desde: '2025-03-01',
      hasta: '2025-03-31',
    });
    // 29 de febrero de un año bisiesto
    expect(periodoDeReferencia('2028-02-01', '2028-02-29', 'anioAnterior')).toEqual({
      desde: '2027-02-01',
      hasta: '2027-02-28',
    });
  });

  it('sin un periodo válido no hay contra qué comparar', () => {
    expect(periodoDeReferencia(null, null, 'anterior')).toBeNull();
    expect(periodoDeReferencia('2026-03-31', '2026-03-01', 'anterior')).toBeNull();
    expect(periodoDeReferencia('no', 'fecha', 'anterior')).toBeNull();
  });

  it('calcula los indicadores de un periodo', () => {
    const indicadores = indicadoresDelPeriodo(periodo(4, 6, 9, 1, 12), null);
    expect(indicadores.map((i) => [i.clave, i.valor])).toEqual([
      ['exploraciones', 10],
      ['sobrepeso', 40],
      ['presion', 20],
      ['cintura', 25],
      ['aptitudes', 10],
      ['aptos', 90],
      ['consultas', 12],
    ]);
  });

  it('sin registros las proporciones quedan sin valor, no en cero', () => {
    const indicadores = indicadoresDelPeriodo([], null);
    expect(indicadores.find((i) => i.clave === 'sobrepeso')?.valor).toBeNull();
    expect(indicadores.find((i) => i.clave === 'consultas')?.valor).toBe(0);
  });

  it('compara dos periodos y califica el cambio según el indicador', () => {
    const anterior = indicadoresDelPeriodo(periodo(3, 7, 8, 2, 20), null);
    const actual = indicadoresDelPeriodo(periodo(5, 5, 9, 1, 12), null);
    const filas = comparar(actual, anterior);
    const fila = (clave: string) => filas.find((f) => f.clave === clave)!;

    // Más sobrepeso es desfavorable
    expect(fila('sobrepeso')).toMatchObject({ referencia: 30, actual: 50, cambio: 20, sentido: 'sube', lectura: 'desfavorable' });
    expect(textoDeCambio(fila('sobrepeso'))).toBe('+20 pp');
    // Más aptos es favorable
    expect(fila('aptos')).toMatchObject({ referencia: 80, actual: 90, cambio: 10, lectura: 'favorable' });
    // Las consultas no se califican
    expect(fila('consultas')).toMatchObject({ cambio: -8, sentido: 'baja', lectura: 'neutra' });
    expect(textoDeCambio(fila('consultas'))).toBe('−8');
    // Lo que no cambió
    expect(fila('presion')).toMatchObject({ cambio: 0, sentido: 'igual', lectura: 'neutra' });
    expect(textoDeCambio(fila('presion'))).toBe('Sin cambio');
  });

  it('si un periodo no tiene datos, no calcula el cambio', () => {
    const actual = indicadoresDelPeriodo(periodo(5, 5, 9, 1, 12), null);
    const filas = comparar(actual, indicadoresDelPeriodo([], null));
    const sobrepeso = filas.find((f) => f.clave === 'sobrepeso')!;
    expect(sobrepeso).toMatchObject({ referencia: null, actual: 50, cambio: null, sentido: null, lectura: 'neutra' });
    expect(textoDeCambio(sobrepeso)).toBe('—');
    expect(textoDeValor(null, '%')).toBe('—');
    expect(textoDeValor(50, '%')).toBe('50 %');
    expect(textoDeValor(12, '')).toBe('12');
  });

  it('dice el diagnóstico más frecuente de cada periodo', () => {
    expect(diagnosticoPrincipal(periodo(1, 1, 1, 0, 3), null)).toBe('J00X - RINOFARINGITIS (3)');
    expect(diagnosticoPrincipal([], null)).toBe('');
  });

  describe('entre centros de trabajo', () => {
    const conPlantilla = (datosDeCentro: Record<string, unknown>[], activos: number) => [
      { ...datosDeCentro[0], grupoEtario: [veces(activos, {})] },
    ];
    const norte = conPlantilla(periodo(2, 8, 9, 1, 30), 40)[0];
    const sur = conPlantilla(periodo(6, 4, 7, 3, 12), 25)[0];
    const centros = [
      { _id: 'c1', nombreCentro: 'Planta Norte' },
      { _id: 'c2', nombreCentro: 'Planta Sur' },
    ];

    it('calcula los mismos indicadores para cada centro', () => {
      const { filas } = compararCentros([norte, sur], centros);
      expect(filas.map((f) => [f.nombre, f.activos])).toEqual([
        ['Planta Norte', 40],
        ['Planta Sur', 25],
      ]);
      const valor = (i: number, clave: string) => filas[i].indicadores.find((x) => x.clave === clave)?.valor;
      expect(valor(0, 'sobrepeso')).toBe(20);
      expect(valor(1, 'sobrepeso')).toBe(60);
      expect(valor(0, 'aptos')).toBe(90);
      expect(valor(1, 'aptos')).toBe(70);
      expect(valor(1, 'consultas')).toBe(12);
    });

    it('señala el centro menos favorable solo donde hay una lectura clara', () => {
      const { menosFavorable } = compararCentros([norte, sur], centros);
      // Más sobrepeso y menos aptos: Planta Sur
      expect(menosFavorable.sobrepeso).toBe('c2');
      expect(menosFavorable.aptos).toBe('c2');
      // Presión y cintura están empatadas; los conteos no se califican
      expect(menosFavorable.presion).toBeUndefined();
      expect(menosFavorable.cintura).toBeUndefined();
      expect(menosFavorable.consultas).toBeUndefined();
    });

    it('con un solo centro con datos no señala a ninguno', () => {
      const { menosFavorable, filas } = compararCentros([norte, {}], centros);
      expect(menosFavorable).toEqual({});
      expect(filas[1].activos).toBe(0);
      expect(filas[1].indicadores.find((i) => i.clave === 'sobrepeso')?.valor).toBeNull();
    });

    it('arma las columnas de la tabla', () => {
      expect(columnasDeCentros(compararCentros([norte, sur], centros))).toEqual([
        'Centro de trabajo',
        'Trabajadores activos',
        'Trabajadores con exploración física',
        'Con sobrepeso u obesidad',
        'Con presión arterial alta o hipertensión',
        'Con cintura de alto riesgo',
        'Trabajadores con aptitud evaluada',
        'Aptos sin restricciones',
        'Consultas médicas',
      ]);
    });
  });
});
