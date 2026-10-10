import { describe, expect, it } from 'vitest';
import { alertasDeExistencias, hayAlertas, periodoDeInventario, sumarConsumo } from './dashboardInventario';

const insumo = (id: string, nombre: string, stockMinimo = 0) =>
  ({ _id: id, nombre, unidad: 'tableta', categoria: 'MEDICAMENTO', stockMinimo }) as any;

const fila = (id: string, nombre: string, campos: Record<string, number>) => ({
  insumo: insumo(id, nombre),
  entradas: 0,
  consumo: 0,
  administrado: 0,
  entregado: 0,
  bajas: 0,
  ajustes: 0,
  ...campos,
});

const existencia = (id: string, campos: Record<string, unknown>, stockMinimo = 0) =>
  ({
    insumo: insumo(id, id, stockMinimo),
    existencia: 0,
    estado: 'DISPONIBLE',
    caducidadProxima: null,
    lotesPorCaducar: 0,
    lotesCaducados: 0,
    ...campos,
  }) as any;

describe('inventario en el tablero de salud', () => {
  it('usa el periodo elegido; sin periodo, el año en curso hasta hoy', () => {
    expect(periodoDeInventario('2026-03-01', '2026-03-31', '2026-10-10')).toEqual({
      desde: '2026-03-01',
      hasta: '2026-03-31',
      porDefecto: false,
    });
    expect(periodoDeInventario(null, null, '2026-10-10')).toEqual({
      desde: '2026-01-01',
      hasta: '2026-10-10',
      porDefecto: true,
    });
    // Un rango invertido no se manda al servidor
    expect(periodoDeInventario('2026-05-01', '2026-04-01', '2026-10-10').porDefecto).toBe(true);
  });

  it('suma el consumo de varios centros por insumo, del más al menos consumido', () => {
    const norte = {
      desde: '',
      hasta: '',
      filas: [
        fila('p', 'Paracetamol', { consumo: 30, administrado: 10, entregado: 20, entradas: 100 }),
        fila('g', 'Gasas', { consumo: 5, administrado: 5, bajas: 2 }),
      ],
    };
    const sur = {
      desde: '',
      hasta: '',
      filas: [
        fila('p', 'Paracetamol', { consumo: 12, entregado: 12, ajustes: -1 }),
        fila('i', 'Ibuprofeno', { consumo: 40, entregado: 40 }),
      ],
    };
    const suma = sumarConsumo([norte, sur, null]);
    expect(suma.map((f) => [f.insumo.nombre, f.consumo])).toEqual([
      ['Paracetamol', 42],
      ['Ibuprofeno', 40],
      ['Gasas', 5],
    ]);
    expect(suma[0]).toMatchObject({ administrado: 10, entregado: 32, entradas: 100, ajustes: -1 });
    expect(suma[2].bajas).toBe(2);
    expect(sumarConsumo([])).toEqual([]);
  });

  it('cuenta las alertas de existencias de los centros visibles', () => {
    const norte = [
      existencia('p', { existencia: 0, estado: 'AGOTADO' }, 20),
      existencia('g', { existencia: 3, estado: 'BAJO', lotesPorCaducar: 1 }, 10),
      existencia('i', { existencia: 50, lotesCaducados: 2 }),
      // En cero y sin mínimo: ese centro no lo maneja, no es alerta
      existencia('x', { existencia: 0, estado: 'AGOTADO' }),
    ];
    const sur = [existencia('p', { existencia: 0, estado: 'AGOTADO' }, 20), existencia('i', { existencia: 8 })];

    const alertas = alertasDeExistencias([norte, sur, undefined]);
    expect(alertas).toEqual({
      agotados: 2,
      bajoMinimo: 1,
      lotesPorCaducar: 1,
      lotesCaducados: 2,
      conExistencia: 2,
    });
    expect(hayAlertas(alertas)).toBe(true);
    expect(hayAlertas(alertasDeExistencias([[existencia('i', { existencia: 8 })]]))).toBe(false);
  });
});
