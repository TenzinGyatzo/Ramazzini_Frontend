import { describe, expect, it } from 'vitest';
import {
  cantidadConSigno,
  cantidadConUnidad,
  consumoACsv,
  filtrarExistencias,
  formatearCaducidad,
  periodoMesEnCurso,
  textoAvisoInventario,
} from './inventario';
import type { FilaExistencia } from '@/interfaces/inventario.interface';

const fila = ({
  nombre,
  categoria = 'MEDICAMENTO',
  ...resumen
}: Partial<FilaExistencia> & {
  nombre: string;
  categoria?: FilaExistencia['insumo']['categoria'];
}): FilaExistencia => ({
  existencia: 10,
  estado: 'DISPONIBLE',
  caducidadProxima: null,
  lotesPorCaducar: 0,
  lotesCaducados: 0,
  ...resumen,
  insumo: {
    _id: nombre,
    nombre,
    categoria,
    unidad: 'tableta',
    unidadesPorPresentacion: 1,
    stockMinimo: 0,
    controlaLote: false,
    controlaCaducidad: false,
    activo: true,
  },
});

describe('helpers de inventario', () => {
  it('muestra siempre el signo de la cantidad', () => {
    expect(cantidadConSigno(100)).toBe('+100');
    expect(cantidadConSigno(-2)).toBe('−2');
  });

  it('formatea la caducidad sin desplazarla por zona horaria', () => {
    expect(formatearCaducidad('2027-05-31T00:00:00.000Z')).toBe('31/05/2027');
    expect(formatearCaducidad(null)).toBe('—');
  });

  it('resume el aviso de inventario de un centro', () => {
    expect(
      textoAvisoInventario({
        insumosBajoStock: 3,
        lotesPorCaducar: 1,
        lotesCaducados: 2,
      }),
    ).toBe(
      '3 insumos agotados o con stock bajo · 2 lotes caducados · 1 lote por caducar',
    );
    expect(
      textoAvisoInventario({
        insumosBajoStock: 1,
        lotesPorCaducar: 0,
        lotesCaducados: 0,
      }),
    ).toBe('1 insumo agotado o con stock bajo');
  });

  it('el periodo por defecto va del día 1 del mes a hoy', () => {
    expect(periodoMesEnCurso(new Date(2026, 9, 5))).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-05',
    });
  });

  it('exporta el consumo a CSV con comillas donde hacen falta', () => {
    const csv = consumoACsv([
      {
        insumo: {
          nombre: 'Gasa estéril 10 × 10, paquete',
          unidad: 'pieza',
          categoria: 'MATERIAL_CURACION',
        },
        entradas: 100,
        consumo: 12,
        administrado: 4,
        entregado: 8,
        bajas: 0,
        ajustes: -3,
      },
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv.split('\r\n')).toEqual([
      '\uFEFFInsumo,Categoría,Unidad,Consumo,Administrado,Entregado,Entradas,Bajas,Ajustes',
      '"Gasa estéril 10 × 10, paquete",Material de curación,pieza,12,4,8,100,0,-3',
    ]);
  });

  it('pluraliza la unidad', () => {
    expect(cantidadConUnidad(1, 'tableta')).toBe('1 tableta');
    expect(cantidadConUnidad(97, 'tableta')).toBe('97 tabletas');
    expect(cantidadConUnidad(3, 'par')).toBe('3 pares');
    expect(cantidadConUnidad(0, 'piezas')).toBe('0 piezas');
  });

  it('filtra por texto, categoría, stock y caducidad', () => {
    const filas = [
      fila({ nombre: 'Paracetamol 500 mg' }),
      fila({ nombre: 'Ibuprofeno 400 mg', estado: 'BAJO' }),
      fila({ nombre: 'Ketorolaco 30 mg', estado: 'AGOTADO', lotesCaducados: 1 }),
      fila({
        nombre: 'Gasa estéril',
        categoria: 'MATERIAL_CURACION',
        lotesPorCaducar: 1,
      }),
    ];
    const nombres = (resultado: FilaExistencia[]) =>
      resultado.map((f) => f.insumo.nombre);

    expect(nombres(filtrarExistencias(filas, 'TODOS', 'para'))).toEqual([
      'Paracetamol 500 mg',
    ]);
    expect(nombres(filtrarExistencias(filas, 'BAJO_STOCK', ''))).toEqual([
      'Ibuprofeno 400 mg',
      'Ketorolaco 30 mg',
    ]);
    expect(nombres(filtrarExistencias(filas, 'POR_CADUCAR', ''))).toEqual([
      'Ketorolaco 30 mg',
      'Gasa estéril',
    ]);
    expect(nombres(filtrarExistencias(filas, 'MATERIAL_CURACION', ''))).toEqual([
      'Gasa estéril',
    ]);
  });
});
