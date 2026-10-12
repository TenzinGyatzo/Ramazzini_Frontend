import { describe, expect, it } from 'vitest';
import {
  hallazgosCardiometabolico,
  hallazgosIncapacidades,
  hallazgosOtologica,
  resumirCardiometabolico,
  resumirConsultas,
  resumirIncapacidades,
  resumirOtologica,
  tablasCardiometabolico,
  tablasConsultas,
  tablasIncapacidades,
  tablasOtologica,
  type CardiometabolicoDeTablero,
} from './dashboardSeguimiento';
import { armarInforme } from './dashboardInformes';
import { informeTematico } from './dashboardInformesTematicos';

const evento = (cambios: Partial<CardiometabolicoDeTablero> = {}): CardiometabolicoDeTablero => ({
  diagnosticos: [],
  control: {},
  gradoObesidad: '',
  laboratorio: {},
  ...cambios,
});

const EVENTOS = [
  evento({
    diagnosticos: ['HIPERTENSION_ARTERIAL', 'DIABETES_MELLITUS_TIPO_2'],
    control: { HIPERTENSION_ARTERIAL: 'CONTROLADA', DIABETES_MELLITUS_TIPO_2: 'NO_CONTROLADA' },
    laboratorio: { glucosa: 'Elevada', hdl: 'Adecuado' },
  }),
  evento({
    diagnosticos: ['HIPERTENSION_ARTERIAL'],
    control: { HIPERTENSION_ARTERIAL: 'NO_CONTROLADA' },
    laboratorio: { glucosa: 'Normal', hdl: 'Bajo' },
  }),
  evento({
    diagnosticos: ['HIPERTENSION_ARTERIAL'],
    control: { HIPERTENSION_ARTERIAL: 'NO_VALORABLE' },
    laboratorio: { glucosa: 'No valorable' },
  }),
];

describe('tablero: seguimiento cardiometabólico', () => {
  it('cuenta trabajadores por condición', () => {
    const r = resumirCardiometabolico(EVENTOS);
    expect(r.enSeguimiento).toBe(3);
    expect(r.condiciones.map((c) => [c.clave, c.cantidad])).toEqual([
      ['HIPERTENSION_ARTERIAL', 3],
      ['DIABETES_MELLITUS_TIPO_2', 1],
    ]);
  });

  it('el control se mide sobre quienes lo tienen valorado', () => {
    expect(resumirCardiometabolico(EVENTOS).control).toEqual([
      { clave: 'HIPERTENSION_ARTERIAL', etiqueta: 'Hipertensión arterial', controlados: 1, noControlados: 1, valorados: 2 },
      { clave: 'DIABETES_MELLITUS_TIPO_2', etiqueta: 'Diabetes mellitus tipo 2', controlados: 0, noControlados: 1, valorados: 1 },
    ]);
  });

  it('el laboratorio ignora los resultados no valorables y los estudios sin capturar', () => {
    expect(resumirCardiometabolico(EVENTOS).laboratorio.map((e) => [e.clave, e.cantidad, e.evaluados])).toEqual([
      ['glucosa', 1, 2],
      ['hdl', 1, 2],
    ]);
  });

  it('arma tablas y hallazgos solo con lo que hay', () => {
    expect(tablasCardiometabolico([])).toEqual([]);
    expect(hallazgosCardiometabolico([])).toEqual([]);
    expect(tablasCardiometabolico([evento()])).toEqual([]);
    expect(tablasCardiometabolico(EVENTOS)).toHaveLength(3);
    const hallazgos = hallazgosCardiometabolico(EVENTOS);
    expect(hallazgos[0]).toBe(
      '3 trabajadores tienen seguimiento cardiometabólico en el periodo: hipertensión arterial 3, diabetes mellitus tipo 2 1.',
    );
    expect(hallazgos[1]).toBe(
      'En su última visita no estaban en control: 1 de 2 con hipertensión arterial, 1 de 1 con diabetes mellitus tipo 2.',
    );
  });
});

describe('tablero: historia otológica', () => {
  const HISTORIAS = [
    { zumbidoTinnitus: 'SI', trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: 'SIEMPRE' },
    { zumbidoTinnitus: 'NO', trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: 'A VECES' },
    { zumbidoTinnitus: 'NO', trabajoAmbientesRuidosos: 'NO', usoProteccionAuditiva: 'NA' },
    { zumbidoTinnitus: null, trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: null },
  ];

  it('cada respuesta se mide sobre quienes la contestaron', () => {
    const r = resumirOtologica(HISTORIAS);
    expect(r.respuestas.map((s) => [s.clave, s.cantidad, s.evaluados])).toEqual([
      ['zumbidoTinnitus', 1, 3],
      ['trabajoAmbientesRuidosos', 3, 4],
    ]);
  });

  it('la protección auditiva solo cuenta a los expuestos que la contestaron', () => {
    const r = resumirOtologica(HISTORIAS);
    expect(r.expuestosConRespuesta).toBe(2);
    expect(r.proteccion.map((p) => [p.etiqueta, p.cantidad])).toEqual([
      ['Siempre', 1],
      ['A veces', 1],
      ['Nunca', 0],
    ]);
    expect(hallazgosOtologica(HISTORIAS)).toEqual([
      'De 2 trabajadores que refieren trabajar en ambientes ruidosos, 1 no usa protección auditiva siempre (50 %).',
    ]);
    expect(tablasOtologica(HISTORIAS)).toHaveLength(2);
    expect(tablasOtologica([])).toEqual([]);
    expect(hallazgosOtologica([{ zumbidoTinnitus: 'SI' }])).toEqual([]);
  });
});

describe('tablero: consultas', () => {
  const consulta = (trabajador: string, tipoNota: string | null = 'Inicial') => ({ fechaNotaMedica: '2026-03-01', tipoNota, trabajador });

  it('distingue consultas de personas atendidas', () => {
    const r = resumirConsultas([
      consulta('c-1'),
      consulta('c-1', 'Seguimiento'),
      consulta('c-1', 'Seguimiento'),
      consulta('c-2'),
      consulta('c-3', null),
    ]);
    expect([r.consultas, r.trabajadores, r.promedio, r.frecuentes]).toEqual([5, 3, 1.7, 1]);
    expect(r.tipos.map((t) => [t.clave, t.cantidad])).toEqual([
      ['Inicial', 2],
      ['Seguimiento', 2],
    ]);
  });

  it('con un servidor que aún no dice de quién es cada consulta, no afirma personas', () => {
    const r = resumirConsultas([{ fechaNotaMedica: '2026-03-01' }, { fechaNotaMedica: '2026-03-02' }]);
    expect([r.consultas, r.trabajadores, r.frecuentes]).toEqual([2, null, null]);
    expect(tablasConsultas([{ fechaNotaMedica: '2026-03-01' }])).toEqual([]);
  });
});

describe('tablero: incapacidades', () => {
  const informe = (casosNuevos: number, dias: number): any => ({
    totales: {
      casosNuevos,
      dias: { total: dias },
      casosPorRamo: { enfermedadGeneral: 2, riesgoTrabajo: 1 },
      diasPorRamo: { enfermedadGeneral: 15, riesgoTrabajo: 10 },
      trabajadoresConIncapacidad: 2,
    },
    indicadores: { tasaAusentismo: 0.22 },
  });

  it('sin casos ni días no hay sección', () => {
    expect(resumirIncapacidades(null)).toBeNull();
    expect(resumirIncapacidades(informe(0, 0))).toBeNull();
    expect(tablasIncapacidades(null)).toEqual([]);
    expect(hallazgosIncapacidades(null)).toEqual([]);
  });

  it('resume casos, días y ramos', () => {
    const r = resumirIncapacidades(informe(3, 25))!;
    expect([r.casos, r.dias, r.trabajadores, r.ausentismo]).toEqual([3, 25, 2, 0.22]);
    expect(r.porRamo.map((ramo) => [ramo.clave, ramo.cantidad, ramo.dias])).toEqual([
      ['enfermedadGeneral', 2, 15],
      ['riesgoTrabajo', 1, 10],
    ]);
    expect(hallazgosIncapacidades(r)).toEqual([
      'Se registraron 3 casos nuevos de incapacidad y 25 días de incapacidad en 2 trabajadores; la tasa de ausentismo fue de 0.22 %.',
    ]);
    expect(tablasIncapacidades(r)[0].filas.at(-1)).toEqual(['Total', 3, 25]);
  });
});

describe('informes con seguimiento, audición e incapacidades', () => {
  const contexto = {
    empresa: 'Aceros',
    centro: 'Todos',
    periodo: 'Este año',
    segmento: '',
    responsable: '',
    fecha: '',
    conclusiones: '',
    recomendaciones: '',
    recomendacionesTabla: [],
  };
  const datos = [
    {
      grupoEtario: [[{}, {}, {}]],
      cardiometabolico: [EVENTOS],
      otologica: [[{ zumbidoTinnitus: 'SI', trabajoAmbientesRuidosos: 'SI', usoProteccionAuditiva: 'NUNCA' }]],
    },
  ];

  it('cada tema recibe lo suyo', () => {
    const fuentes = { datos, indiceCentro: null, conFiltros: false };
    const cardio = informeTematico('cardiometabolico', fuentes, contexto);
    expect(cardio.tablas.map((t) => t.seccion)).toEqual(['Cardiometabólico', 'Cardiometabólico', 'Cardiometabólico']);
    expect(cardio.hallazgos.join(' ')).toContain('seguimiento cardiometabólico');
    const auditivo = informeTematico('auditivo', fuentes, contexto);
    expect(auditivo.tablas.map((t) => t.seccion)).toEqual(['Audición', 'Audición']);
    expect(auditivo.hallazgos[0]).toContain('protección auditiva');
  });

  it('las incapacidades entran al informe general cuando el tablero las tiene', () => {
    const incapacidades = resumirIncapacidades({
      totales: { casosNuevos: 1, dias: { total: 4 }, casosPorRamo: { enfermedadGeneral: 1 }, diasPorRamo: { enfermedadGeneral: 4 }, trabajadoresConIncapacidad: 1 },
      indicadores: { tasaAusentismo: null },
    } as any);
    const general = armarInforme({ datos, indiceCentro: null, conFiltros: false, incapacidades }, contexto);
    expect(general.tablas.map((t) => t.titulo)).toContain('Incapacidades del periodo');
    expect(general.hallazgos.join(' ')).toContain('1 caso nuevo de incapacidad y 4 días de incapacidad en 1 trabajador.');
  });
});
