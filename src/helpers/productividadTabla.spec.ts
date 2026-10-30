import { describe, expect, it } from 'vitest';
import {
  REGLAS_POR_DEFECTO,
  armarFilas,
  calcularPuntuacion,
  filasParaExcel,
  ordenarFilas,
  textoDeDiferencia,
  tiempoTranscurrido,
} from './productividadTabla';

const usuario = (id: string, username: string, productividad: Record<string, any>) => ({
  _id: id,
  username,
  email: `${id}@x`,
  role: 'Médico',
  productividad,
});

const ana = usuario('a', 'Ana', { totalAptitudes: 2, totalDocumentos: 2, ultimoInforme: '2026-10-20T15:00:00Z' });
const beto = usuario('b', 'Beto', { totalAptitudes: 1, totalOtrosDocumentos: 5, totalDocumentos: 6 });

describe('calcularPuntuacion', () => {
  it('aplica las reglas, incluida «Otros»', () => {
    expect(calcularPuntuacion(beto.productividad, REGLAS_POR_DEFECTO)).toBe(8);
  });

  it('una regla ausente no da NaN', () => {
    const { otros, ...sinOtros } = REGLAS_POR_DEFECTO;
    expect(calcularPuntuacion(beto.productividad, sinOtros as typeof REGLAS_POR_DEFECTO)).toBe(3);
    expect(otros).toBe(1);
  });
});

describe('armarFilas', () => {
  it('sin periodo anterior no hay diferencia', () => {
    const [fila] = armarFilas([ana], REGLAS_POR_DEFECTO, null);
    expect(fila.anterior).toBeNull();
    expect(fila.diferencia).toBeNull();
  });

  it('quien no tuvo actividad antes compara contra cero', () => {
    const [fila] = armarFilas([ana], REGLAS_POR_DEFECTO, new Map([['z', 9]]));
    expect(fila.anterior).toBe(0);
    expect(fila.diferencia).toBe(2);
  });
});

describe('ordenarFilas', () => {
  const filas = armarFilas([ana, beto], REGLAS_POR_DEFECTO, null);
  const nombres = (clave: string, desc: boolean) => ordenarFilas(filas, clave, desc).map((f) => f.username);

  it('ordena por puntos, por documentos y por nombre', () => {
    expect(nombres('puntos', true)).toEqual(['Beto', 'Ana']);
    expect(nombres('totalAptitudes', true)).toEqual(['Ana', 'Beto']);
    expect(nombres('usuario', false)).toEqual(['Ana', 'Beto']);
  });

  it('sin fecha de informe queda al final', () => {
    expect(nombres('ultimoInforme', true)).toEqual(['Ana', 'Beto']);
  });
});

describe('textos', () => {
  it('diferencia', () => {
    expect(textoDeDiferencia(3)).toBe('+3');
    expect(textoDeDiferencia(-2)).toBe('−2');
    expect(textoDeDiferencia(0)).toBe('Sin cambio');
    expect(textoDeDiferencia(null)).toBe('—');
  });

  it('tiempo transcurrido', () => {
    const ahora = new Date('2026-10-30T12:00:00Z');
    expect(tiempoTranscurrido(null, ahora)).toBe('Sin actividad');
    expect(tiempoTranscurrido('2026-10-30T09:00:00Z', ahora)).toBe('Hace 3 horas');
    expect(tiempoTranscurrido('2026-10-29T11:00:00Z', ahora)).toBe('Hace 1 día');
  });
});

describe('filasParaExcel', () => {
  it('incluye comparación y puntos solo cuando aplican', () => {
    const [conTodo] = filasParaExcel(armarFilas([ana], REGLAS_POR_DEFECTO, new Map([['a', 1]])), {
      conPuntos: true,
      conProveedor: false,
    });
    expect(conTodo).toMatchObject({ Puntos: 6, 'Periodo anterior': 1, Diferencia: 1, 'Otros documentos': 0 });
    expect(conTodo).not.toHaveProperty('Proveedor');

    const [admin] = filasParaExcel(armarFilas([ana], REGLAS_POR_DEFECTO, null), {
      conPuntos: false,
      conProveedor: true,
    });
    expect(admin).toMatchObject({ Proveedor: 'Sin proveedor', 'Total de documentos': 2 });
    expect(admin).not.toHaveProperty('Puntos');
    expect(admin).not.toHaveProperty('Diferencia');
  });
});
