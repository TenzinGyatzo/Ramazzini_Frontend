import { describe, expect, it } from 'vitest';
import {
  atencionesPorSistema,
  hallazgosEnfermeria,
  resumirEnfermeria,
  tablasEnfermeria,
  type AtencionEnfermeriaDeTablero,
} from './dashboardEnfermeria';
import { graficasEnfermeria } from './dashboardGraficasInforme';
import { tablasDelTablero } from './dashboardInformes';
import { seccionesAdicionalesDelInforme } from './dashboardInformeCompleto';
import type { DiagnosticoDeTablero } from './dashboardDiagnosticos';

const atencion = (campos: Partial<AtencionEnfermeriaDeTablero> = {}): AtencionEnfermeriaDeTablero => ({
  mes: '2026-10',
  relacionTemporal: 'primeraVez',
  tipoProblema: 'lesion',
  sistema: 'piel',
  origen: 'accidenteTrabajo',
  destino: 'regresaPuesto',
  procedimientos: ['curacion'],
  medicamentos: [],
  trabajador: 'c-1',
  ...campos,
});

const atenciones = [
  atencion({
    medicamentos: [{ nombre: 'GASAS', cantidad: 2, uso: 'ADMINISTRADO', catalogo: true }],
  }),
  atencion({
    trabajador: 'c-2',
    mes: '2026-12',
    relacionTemporal: 'subsecuente',
    tipoProblema: 'sintoma',
    sistema: 'neurologico',
    origen: 'enfermedadGeneral',
    destino: 'casa',
    procedimientos: ['signosVitales', 'otro'],
    medicamentos: [
      { nombre: 'PARACETAMOL', cantidad: 1, uso: 'ADMINISTRADO', catalogo: false },
      { nombre: 'PARACETAMOL', cantidad: 4, uso: 'ENTREGADO', catalogo: false },
    ],
  }),
  atencion({ sistema: 'general', procedimientos: [] }),
];

const diagnostico = (clave: string, principal = true): DiagnosticoDeTablero => ({
  clave,
  etiqueta: clave,
  principal,
  mes: '2026-10',
});

describe('resumirEnfermeria', () => {
  it('cuenta atenciones, personas y cada clasificación con su etiqueta', () => {
    const r = resumirEnfermeria(atenciones);
    expect(r).toMatchObject({ atenciones: 3, trabajadores: 2, primeraVez: 2, subsecuentes: 1, conProcedimiento: 2, conMedicamento: 2 });
    expect(r.porTipo.map((c) => [c.etiqueta, c.cantidad])).toEqual([
      ['Lesión o traumatismo', 2],
      ['Síntoma o malestar', 1],
    ]);
    expect(r.porDestino[0]).toMatchObject({ clave: 'regresaPuesto', etiqueta: 'Regresa a su puesto', cantidad: 2 });
    expect(r.procedimientos.map((c) => c.etiqueta)).toEqual(['Curación', 'Otro', 'Toma de signos vitales']);
  });

  it('suma los medicamentos por nombre, separando administrado y entregado', () => {
    expect(resumirEnfermeria(atenciones).medicamentos).toEqual([
      { nombre: 'PARACETAMOL', administrado: 1, entregado: 4, total: 5 },
      { nombre: 'GASAS', administrado: 2, entregado: 0, total: 2 },
    ]);
  });

  it('rellena los meses sin atenciones', () => {
    expect(resumirEnfermeria(atenciones).porMes.map((m) => [m.clave, m.cantidad])).toEqual([
      ['2026-10', 2],
      ['2026-11', 0],
      ['2026-12', 1],
    ]);
  });

  it('sin atenciones no hay tablas, hallazgos ni gráficas', () => {
    expect(tablasEnfermeria([])).toEqual([]);
    expect(hallazgosEnfermeria([])).toEqual([]);
    expect(graficasEnfermeria(resumirEnfermeria([]))).toEqual([]);
  });
});

describe('atencionesPorSistema', () => {
  it('junta el capítulo del diagnóstico principal con el sistema equivalente de enfermería', () => {
    const filas = atencionesPorSistema(
      [diagnostico('L03X'), diagnostico('J00X'), diagnostico('L20X', false), diagnostico('G43X')],
      atenciones,
    );
    expect(filas.map((f) => [f.clave, f.consultas, f.enfermeria, f.total])).toEqual([
      ['XII', 1, 1, 2],
      ['VI', 1, 1, 2],
      ['general', 0, 1, 1],
      ['X', 1, 0, 1],
    ]);
    expect(filas.find((f) => f.clave === 'general')?.etiqueta).toBe('General o sin sistema');
  });
});

describe('enfermería en los informes', () => {
  it('el Excel lleva su hoja, con la tabla combinada solo si hay consultas', () => {
    const sinConsultas = tablasEnfermeria(atenciones);
    expect(sinConsultas.every((t) => t.seccion === 'Enfermería')).toBe(true);
    expect(sinConsultas.map((t) => t.titulo)).not.toContain('Atenciones por sistema (consultas y enfermería)');
    expect(tablasEnfermeria(atenciones, [diagnostico('L03X')]).map((t) => t.titulo)).toContain(
      'Atenciones por sistema (consultas y enfermería)',
    );

    const datos = [{ atencionesEnfermeria: [atenciones], diagnosticos: [[diagnostico('L03X')]] }] as any;
    const titulos = tablasDelTablero({ datos, indiceCentro: null }).map((t) => t.titulo);
    expect(titulos).toContain('Medicamentos administrados y entregados');
  });

  it('el informe completo agrega su sección numerada con gráficas', () => {
    const { contenido, siguienteNumero } = seccionesAdicionalesDelInforme(
      { enfermeria: atenciones, diagnosticosDetalle: [diagnostico('L03X')] },
      7,
    );
    expect(siguienteNumero).toBe(8);
    expect(contenido[0].text).toBe('7. ATENCIÓN DE ENFERMERÍA');
    const titulosGraficas = graficasEnfermeria(
      resumirEnfermeria(atenciones),
      atencionesPorSistema([diagnostico('L03X')], atenciones),
    ).map((g) => g.titulo);
    expect(titulosGraficas).toEqual([
      'Atenciones por aparato o sistema',
      'Atenciones por tipo de problema',
      'Atenciones por sistema: consultas y enfermería',
      'Atenciones de enfermería por mes',
    ]);
  });

  it('sin atenciones, el informe completo no agrega la sección', () => {
    expect(seccionesAdicionalesDelInforme({ enfermeria: [] }, 3).siguienteNumero).toBe(3);
  });

  it('el hallazgo dice cuántas atenciones y lo más frecuente', () => {
    expect(hallazgosEnfermeria(atenciones)).toEqual([
      'Enfermería registró 3 atenciones a 2 trabajadores.',
      // Los tres sistemas empatan: no se nombra ninguno
      'El tipo de problema más frecuente fue lesión o traumatismo (67 %).',
      '67 % de las atenciones terminó con el regreso del trabajador a su puesto.',
    ]);
  });
});
