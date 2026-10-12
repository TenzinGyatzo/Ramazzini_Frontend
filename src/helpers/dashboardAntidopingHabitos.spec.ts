import { describe, expect, it } from 'vitest';
import {
  hallazgosAntidoping,
  resumirAntidoping,
  tablasAntidoping,
  type AntidopingDeTablero,
} from './dashboardAntidoping';
import { hallazgosHabitos, resumirHabitos, tablasHabitos } from './dashboardHabitos';
import { armarInforme } from './dashboardInformes';
import { informeTematico } from './dashboardInformesTematicos';

const prueba = (mes: string, trabajador: string, positivos: string[] = []): AntidopingDeTablero => ({
  mes,
  trabajador,
  evaluadas: ['marihuana', 'cocaina', 'anfetaminas'],
  positivos,
});

const PRUEBAS = [
  prueba('2026-03', 'c1-1'),
  prueba('2026-03', 'c1-2', ['marihuana', 'anfetaminas']),
  prueba('2026-06', 'c1-1', ['marihuana']),
  prueba('2026-06', 'c1-3'),
];

describe('tablero: antidoping', () => {
  it('cuenta pruebas y personas por separado', () => {
    const r = resumirAntidoping(PRUEBAS);
    expect([r.pruebas, r.trabajadores, r.pruebasPositivas, r.trabajadoresConPositivo]).toEqual([4, 3, 2, 2]);
  });

  it('lista solo las sustancias con algún positivo, de la más a la menos frecuente', () => {
    expect(resumirAntidoping(PRUEBAS).porSustancia.map((s) => [s.etiqueta, s.cantidad, s.evaluadas])).toEqual([
      ['Marihuana', 2, 4],
      ['Anfetaminas', 1, 4],
    ]);
  });

  it('agrupa por mes en orden', () => {
    expect(resumirAntidoping(PRUEBAS).porMes).toEqual([
      { clave: '2026-03', etiqueta: 'mar 26', pruebas: 2, positivas: 1 },
      { clave: '2026-06', etiqueta: 'jun 26', pruebas: 2, positivas: 1 },
    ]);
  });

  it('sin positivos lo dice y no arma la tabla de sustancias', () => {
    const negativas = [prueba('2026-03', 'c1-1'), prueba('2026-03', 'c1-2')];
    expect(hallazgosAntidoping(negativas)).toEqual([
      'Se realizaron 2 pruebas antidoping a 2 trabajadores; todas resultaron negativas.',
    ]);
    expect(tablasAntidoping(negativas).map((t) => t.titulo)).toEqual(['Pruebas antidoping']);
  });

  it('con positivos redacta la tasa y la sustancia más frecuente', () => {
    expect(hallazgosAntidoping(PRUEBAS)[0]).toBe(
      'Se realizaron 4 pruebas antidoping a 3 trabajadores; 2 resultaron positivas a alguna sustancia (50 %). La sustancia más frecuente fue marihuana (2 pruebas).',
    );
    expect(tablasAntidoping(PRUEBAS)).toHaveLength(3);
    expect(tablasAntidoping([])).toEqual([]);
    expect(hallazgosAntidoping([])).toEqual([]);
  });
});

describe('tablero: hábitos', () => {
  const HISTORIAS = [
    { tabaquismo: 'Si', alcoholismo: 'No', actividadFisicaDeficiente: 'Si' },
    { tabaquismo: 'No', alcoholismo: 'No', actividadFisicaDeficiente: 'Si' },
    { tabaquismo: 'No', alcoholismo: null, actividadFisicaDeficiente: 'No' },
    // Historia sin esas preguntas contestadas
    { tabaquismo: null, alcoholismo: null },
  ];

  it('cada hábito se mide sobre quienes lo contestaron', () => {
    const r = resumirHabitos(HISTORIAS);
    expect(r.evaluados).toBe(3);
    expect(r.habitos.map((h) => [h.clave, h.cantidad, h.evaluados])).toEqual([
      ['tabaquismo', 1, 3],
      ['alcoholismo', 0, 2],
      ['actividadFisicaDeficiente', 2, 3],
    ]);
  });

  it('un hábito que nadie contestó no aparece; sin respuestas no hay sección', () => {
    expect(resumirHabitos(HISTORIAS).habitos.map((h) => h.clave)).not.toContain('toxicomanias');
    expect(resumirHabitos([{ tabaquismo: null }]).habitos).toEqual([]);
    expect(tablasHabitos([{ tabaquismo: null }])).toEqual([]);
    // Se menciona aunque nadie lo refiera: también es un dato
    expect(hallazgosHabitos([{ tabaquismo: 'No' }])).toEqual([
      'Hábitos referidos en la historia clínica: tabaquismo 0 % (0 de 1).',
    ]);
    expect(hallazgosHabitos([{ actividadFisicaDeficiente: 'Si' }])).toEqual([]);
  });

  it('el hallazgo menciona siempre tabaquismo y consumo de alcohol', () => {
    expect(hallazgosHabitos(HISTORIAS)).toEqual([
      'Hábitos referidos en la historia clínica: tabaquismo 33 % (1 de 3) y consumo de alcohol 0 % (0 de 2).',
    ]);
    expect(tablasHabitos(HISTORIAS)[0].filas[0]).toEqual(['Tabaquismo', 1, '33 %']);
  });
});

describe('informes con antidoping y hábitos', () => {
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
  const datos = [{ grupoEtario: [[{}, {}, {}]], antidoping: [PRUEBAS], habitos: [[{ tabaquismo: 'Si' }, { tabaquismo: 'No' }]] }];
  const fuentes = { datos, indiceCentro: null, conFiltros: false };

  it('entran al informe general y los hábitos al de riesgo cardiometabólico', () => {
    const general = armarInforme(fuentes, contexto);
    expect(general.tablas.map((t) => t.titulo)).toEqual(
      expect.arrayContaining(['Hábitos y estilo de vida', 'Pruebas antidoping', 'Antidoping: positivos por sustancia']),
    );
    expect(general.hallazgos.join(' ')).toContain('pruebas antidoping');
    const cardio = informeTematico('cardiometabolico', fuentes, contexto);
    expect(cardio.tablas.map((t) => t.titulo)).toEqual(['Hábitos y estilo de vida']);
    expect(cardio.hallazgos[0]).toContain('tabaquismo');
  });
});
