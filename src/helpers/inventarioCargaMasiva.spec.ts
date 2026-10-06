import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  ENCABEZADOS_PLANTILLA,
  filasDePlantilla,
  leerFilasDePlantilla,
  serialExcelAFecha,
} from './inventarioCargaMasiva';
import type { Insumo } from '@/interfaces/inventario.interface';

const insumo = (campos: Partial<Insumo>): Insumo => ({
  _id: 'x',
  nombre: 'Insumo',
  categoria: 'MEDICAMENTO',
  unidad: 'tableta',
  unidadesPorPresentacion: 1,
  stockMinimo: 0,
  controlaLote: false,
  controlaCaducidad: false,
  activo: true,
  ...campos,
});

describe('plantilla de carga masiva', () => {
  it('arma la plantilla con los insumos activos y las columnas de captura vacías', () => {
    const filas = filasDePlantilla([
      insumo({
        nombre: 'Paracetamol 500 mg',
        presentacion: 'Caja con 20',
        unidadesPorPresentacion: 20,
        controlaLote: true,
        controlaCaducidad: true,
      }),
      insumo({ nombre: 'Retirado', activo: false }),
    ]);
    expect(filas).toEqual([
      [...ENCABEZADOS_PLANTILLA],
      ['Paracetamol 500 mg', 'tableta', 'Caja con 20', 20, 'Sí', 'Sí', '', '', '', ''],
    ]);
  });

  it('convierte el número de serie de Excel sin recorrer el día', () => {
    expect(serialExcelAFecha(46538)).toBe('2027-05-31');
    expect(serialExcelAFecha(46538.75)).toBe('2027-05-31');
    expect(serialExcelAFecha(45292)).toBe('2024-01-01');
  });

  it('lee los renglones con datos, con su número de renglón, sin importar el orden de las columnas', () => {
    const { filas, error } = leerFilasDePlantilla([
      ['Lote', 'Insumo', 'Caducidad (DD/MM/AAAA)', 'Cantidad (unidades)', 'Cantidad (presentaciones)'],
      ['abc 123', 'Paracetamol 500 mg', 46538, 5, 2],
      ['', '', '', '', ''],
      [240731, 'Ibuprofeno 400 mg', '31/05/2027', '', 1],
      ['', 'Gasa estéril', '', '', ''],
    ]);
    expect(error).toBeUndefined();
    expect(filas).toEqual([
      {
        fila: 2,
        insumo: 'Paracetamol 500 mg',
        cantidad: '5',
        presentaciones: '2',
        lote: 'abc 123',
        caducidad: '2027-05-31',
      },
      {
        fila: 4,
        insumo: 'Ibuprofeno 400 mg',
        cantidad: '',
        presentaciones: '1',
        lote: '240731',
        caducidad: '31/05/2027',
      },
      {
        fila: 5,
        insumo: 'Gasa estéril',
        cantidad: '',
        presentaciones: '',
        lote: '',
        caducidad: '',
      },
    ]);
  });

  it('acepta renglones de título antes del encabezado', () => {
    const { filas } = leerFilasDePlantilla([
      ['Entradas de octubre'],
      [],
      ['Insumo', 'Cantidad (unidades)'],
      ['Gasa estéril', 10],
    ]);
    expect(filas).toEqual([
      {
        fila: 4,
        insumo: 'Gasa estéril',
        cantidad: '10',
        presentaciones: '',
        lote: '',
        caducidad: '',
      },
    ]);
  });

  it('ida y vuelta con un archivo de Excel real: fecha con formato y lote con ceros', () => {
    const plantilla = filasDePlantilla([
      insumo({ nombre: 'Paracetamol 500 mg', controlaLote: true, controlaCaducidad: true }),
      insumo({ nombre: 'Gasa estéril' }),
    ]);
    const hoja = XLSX.utils.aoa_to_sheet(plantilla);
    // Lo que el usuario captura en Excel sobre el renglón del paracetamol
    const celda = (columna: string, valor: XLSX.CellObject) => {
      hoja[
        XLSX.utils.encode_cell({
          r: 1,
          c: (ENCABEZADOS_PLANTILLA as readonly string[]).indexOf(columna),
        })
      ] = valor;
    };
    celda('Cantidad (presentaciones)', { t: 'n', v: 5 });
    celda('Lote', { t: 's', v: '00731', z: '@' });
    celda('Caducidad (DD/MM/AAAA)', { t: 'n', v: 46538, z: 'dd/mm/yyyy' });
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Entradas');

    const leido = XLSX.read(XLSX.write(libro, { type: 'array', bookType: 'xlsx' }), {
      type: 'array',
    });
    const renglones = XLSX.utils.sheet_to_json<unknown[]>(leido.Sheets['Entradas'], {
      header: 1,
      raw: true,
      defval: '',
    });
    expect(leerFilasDePlantilla(renglones).filas).toEqual([
      {
        fila: 2,
        insumo: 'Paracetamol 500 mg',
        cantidad: '',
        presentaciones: '5',
        lote: '00731',
        caducidad: '2027-05-31',
      },
      {
        fila: 3,
        insumo: 'Gasa estéril',
        cantidad: '',
        presentaciones: '',
        lote: '',
        caducidad: '',
      },
    ]);
  });

  it('rechaza un archivo que no es la plantilla o que rebasa el máximo', () => {
    expect(leerFilasDePlantilla([['Nombre', 'Edad'], ['Ana', 30]]).error).toContain(
      '«Insumo»',
    );
    expect(leerFilasDePlantilla([['Insumo', 'Notas'], ['Gasa', 'x']]).error).toContain(
      'cantidad',
    );
    const muchas = [
      ['Insumo', 'Cantidad (unidades)'],
      ...Array.from({ length: 501 }, (_, i) => [`Insumo ${i}`, 1]),
    ];
    expect(leerFilasDePlantilla(muchas).error).toContain('501');
  });
});
