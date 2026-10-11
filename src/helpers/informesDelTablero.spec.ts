import { describe, expect, it } from 'vitest';
import type { InformeDeTablero, TablaDeInforme } from './dashboardInformes';
import {
  INFORMES_DEL_TABLERO,
  estadoDeInforme,
  hallazgosComoBorrador,
  type DatosParaEstado,
} from './informesDelTablero';

const tabla = (seccion: string, titulo: string): TablaDeInforme => ({
  seccion,
  titulo,
  columnas: ['Concepto', 'Cantidad'],
  filas: [['x', 1]],
});

const informe = (cambios: Partial<InformeDeTablero> = {}): InformeDeTablero => ({
  empresa: 'Aceros del Norte',
  centro: 'Todos',
  periodo: 'Este año',
  segmento: '',
  responsable: '',
  fecha: '',
  cifras: [],
  hallazgos: [],
  tablas: [],
  conclusiones: '',
  recomendaciones: '',
  recomendacionesTabla: [],
  ...cambios,
});

const datos = (cambios: Partial<DatosParaEstado> = {}): DatosParaEstado => ({
  totalTrabajadores: 38,
  secciones: { saludVisual: true, saludMental: false, gabinete: true, diagnosticos: true, inventario: false },
  general: informe({
    hallazgos: ['a', 'b', 'c'],
    tablas: [
      tabla('Salud física', 'Índice de masa corporal'),
      tabla('Exposición', 'Agentes de riesgo'),
      tabla('Aptitud', 'Aptitud al puesto'),
    ],
  }),
  tematicos: {
    cardiometabolico: informe({ tablas: [tabla('Salud física', 'Índice de masa corporal')] }),
    auditivo: informe(),
    musculoesqueletico: informe({
      tablas: [tabla('Exposición', 'Exposición a factores ergonómicos y vibraciones')],
    }),
  },
  ...cambios,
});

const incluidos = (estado: ReturnType<typeof estadoDeInforme>) =>
  estado.incluye.filter((i) => i.incluido).map((i) => i.texto);
const omitidos = (estado: ReturnType<typeof estadoDeInforme>) =>
  estado.incluye.filter((i) => !i.incluido).map((i) => i.texto);

describe('ventana de informes del tablero', () => {
  it('ofrece seis informes: dos generales, tres por tema y los datos en Excel', () => {
    expect(INFORMES_DEL_TABLERO.map((i) => [i.grupo, i.id])).toEqual([
      ['Generales', 'completo'],
      ['Generales', 'resumen'],
      ['Por tema', 'cardiometabolico'],
      ['Por tema', 'auditivo'],
      ['Por tema', 'musculoesqueletico'],
      ['Datos', 'excel'],
    ]);
    // El Excel es el único que no lleva conclusiones
    expect(INFORMES_DEL_TABLERO.filter((i) => !i.llevaConclusiones).map((i) => i.id)).toEqual(['excel']);
  });

  it('el informe completo anuncia las secciones que el tablero tiene con datos', () => {
    const estado = estadoDeInforme('completo', datos());
    expect(estado.disponible).toBe(true);
    expect(omitidos(estado)).toEqual(['Tamizajes psicológicos', 'Consumo de insumos']);
    expect(incluidos(estado)).toContain('Diagnósticos de las consultas');
  });

  it('sin trabajadores, el informe completo no se puede generar y dice por qué', () => {
    const estado = estadoDeInforme('completo', datos({ totalTrabajadores: 0 }));
    expect(estado.disponible).toBe(false);
    expect(estado.motivo).toBe('No hay trabajadores con los filtros elegidos');
    expect(incluidos(estado)).toEqual([]);
  });

  it('el resumen para dirección depende de que haya hallazgos', () => {
    const conDatos = estadoDeInforme('resumen', datos());
    expect(conDatos.disponible).toBe(true);
    expect(incluidos(conDatos)).toEqual(['Cifras clave y 3 hallazgos', 'Aptitud al puesto', 'Agentes de riesgo']);
    expect(omitidos(conDatos)).toEqual(['Diagnósticos de las consultas', 'Comparación con otro periodo']);

    const sinDatos = estadoDeInforme('resumen', datos({ general: informe() }));
    expect(sinDatos.disponible).toBe(false);
    expect(sinDatos.motivo).toContain('No hay registros suficientes');
  });

  it('la comparación entra cuando ya se pidió en el tablero', () => {
    const comparativo = tabla('Comparativo', 'Comparación con otro periodo');
    const estado = estadoDeInforme(
      'resumen',
      datos({ general: informe({ hallazgos: ['a'], comparativo }) }),
    );
    expect(incluidos(estado)).toEqual(['Cifras clave y 1 hallazgo', 'Comparación con otro periodo']);
  });

  it('un informe temático sin registros queda deshabilitado, con su motivo', () => {
    const auditivo = estadoDeInforme('auditivo', datos());
    expect(auditivo.disponible).toBe(false);
    expect(auditivo.motivo).toBe('Sin exposición a ruido, audiometrías ni diagnósticos de oído en el periodo');
    expect(omitidos(auditivo)).toEqual(['Exposición a ruido', 'Audiometría', 'Diagnósticos de oído en las consultas']);
  });

  it('un informe temático con registros dice cuáles de sus tablas saldrán', () => {
    const cardio = estadoDeInforme('cardiometabolico', datos());
    expect(cardio.disponible).toBe(true);
    expect(incluidos(cardio)).toEqual(['Índice de masa corporal']);
    expect(omitidos(cardio)).toHaveLength(4);
  });

  it('el Excel lista sus hojas', () => {
    const estado = estadoDeInforme('excel', datos());
    expect(estado.disponible).toBe(true);
    expect(incluidos(estado)).toEqual([
      'Resumen con cifras clave y hallazgos',
      'Salud física',
      'Exposición',
      'Aptitud',
    ]);
    expect(estadoDeInforme('excel', datos({ general: informe() })).disponible).toBe(false);
  });

  it('convierte los hallazgos en una lista para usarla de borrador', () => {
    expect(hallazgosComoBorrador(['50 % con sobrepeso', 'Presión <140'])).toBe(
      '<ul><li>50 % con sobrepeso</li><li>Presión &lt;140</li></ul>',
    );
    expect(hallazgosComoBorrador([])).toBe('');
  });
});
