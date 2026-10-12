import { describe, expect, it } from 'vitest';
import {
  hallazgosNordico,
  hallazgosSueno,
  resumirNordico,
  resumirSueno,
  tablasNordico,
  tablasSueno,
  type NordicoDeTablero,
  type SuenoDeTablero,
} from './dashboardCuestionarios';
import { armarInforme, hojasDeExcel } from './dashboardInformes';
import { informeTematico } from './dashboardInformesTematicos';
import { estadoDeInforme } from './informesDelTablero';

const nordico = (cambios: Partial<NordicoDeTablero> = {}): NordicoDeTablero => ({
  semaforo: 'verde',
  regionesMolestia12Meses: [],
  regionesMolestia7Dias: [],
  regionesImpedimento: [],
  regionesRelacionLaboral: [],
  regionesPrioritarias: [],
  intensidadMaxima: 0,
  puesto: 'Soldador',
  ...cambios,
});

const NORDICOS = [
  nordico(),
  nordico({ puesto: 'Operador' }),
  nordico({
    semaforo: 'amarillo',
    regionesMolestia12Meses: ['hombroIzquierdo', 'hombroDerecho', 'espaldaBaja'],
  }),
  nordico({
    semaforo: 'rojo',
    regionesMolestia12Meses: ['espaldaBaja'],
    regionesMolestia7Dias: ['espaldaBaja'],
    regionesImpedimento: ['espaldaBaja'],
    regionesRelacionLaboral: ['espaldaBaja'],
  }),
];

const sueno = (cambios: Partial<SuenoDeTablero> = {}): SuenoDeTablero => ({
  prioridad: 'verde',
  areas: { calidadDescanso: 'verde', somnolencia: 'verde' },
  alertas: [],
  horarioLaboral: 'Diurno',
  calidadGeneralSueno: 'Buena',
  minutosSuenoDiarios: 480,
  ...cambios,
});

const SUENOS = [
  sueno(),
  sueno({ prioridad: 'amarillo', areas: { calidadDescanso: 'amarillo', somnolencia: 'verde' } }),
  sueno({
    prioridad: 'rojo',
    areas: { calidadDescanso: 'naranja', somnolencia: 'rojo' },
    alertas: ['suenoActividadPeligrosa', 'suenoCorto'],
    horarioLaboral: 'Nocturno',
    minutosSuenoDiarios: 300,
  }),
  // Solo contestó el módulo de vigilia y no capturó horas
  sueno({ prioridad: 'naranja', areas: { somnolencia: 'naranja' }, minutosSuenoDiarios: null, horarioLaboral: '' }),
];

describe('tablero: Cuestionario Nórdico', () => {
  it('cuenta trabajadores por resultado, siempre en el mismo orden', () => {
    const r = resumirNordico(NORDICOS);
    expect(r.evaluados).toBe(4);
    expect(r.semaforo.map((s) => [s.clave, s.cantidad])).toEqual([
      ['verde', 2],
      ['amarillo', 1],
      ['rojo', 1],
    ]);
    expect([r.conMolestia12Meses, r.conMolestia7Dias, r.conImpedimento, r.conRelacionLaboral]).toEqual([2, 1, 1, 1]);
  });

  it('une izquierda y derecha en una zona y cuenta a cada trabajador una vez', () => {
    const r = resumirNordico(NORDICOS);
    expect(r.zonas12Meses.map((z) => [z.etiqueta, z.cantidad])).toEqual([
      ['Espalda baja', 2],
      ['Hombros', 1],
    ]);
    expect(r.zonas7Dias.map((z) => z.clave)).toEqual(['espaldaBaja']);
  });

  it('por puesto dice cuántos tienen molestias de los evaluados en ese puesto', () => {
    expect(resumirNordico(NORDICOS).puestos).toEqual([
      { clave: 'Soldador', etiqueta: 'Soldador', cantidad: 2, evaluados: 3 },
    ]);
  });

  it('arma solo las tablas que tienen algún dato', () => {
    expect(tablasNordico([])).toEqual([]);
    expect(tablasNordico([nordico()]).map((t) => t.titulo)).toEqual(['Cuestionario Nórdico: resultado']);
    const tablas = tablasNordico(NORDICOS);
    expect(tablas).toHaveLength(5);
    expect(tablas[1].filas[0]).toEqual(['Espalda baja', 2, '50 %']);
  });

  it('redacta hallazgos solo con lo que hay', () => {
    expect(hallazgosNordico([])).toEqual([]);
    expect(hallazgosNordico([nordico()])).toEqual([
      'De 1 trabajador con Cuestionario Nórdico, 0 % reportó molestias musculoesqueléticas en los últimos 12 meses (0).',
    ]);
    const hallazgos = hallazgosNordico(NORDICOS);
    expect(hallazgos[0]).toContain('50 % reportó molestias');
    expect(hallazgos[0]).toContain('la zona más frecuente fue espalda baja (2)');
    expect(hallazgos[1]).toBe(
      '1 trabajador requiere seguimiento por molestia reciente, intensa o que le impidió trabajar (25 % de los evaluados).',
    );
    expect(hallazgos).toHaveLength(4);
  });
});

describe('tablero: sueño y vigilia', () => {
  it('cuenta por nivel general y quiénes requieren seguimiento', () => {
    const r = resumirSueno(SUENOS);
    expect(r.prioridad.map((n) => [n.clave, n.cantidad])).toEqual([
      ['verde', 1],
      ['amarillo', 1],
      ['naranja', 1],
      ['rojo', 1],
    ]);
    expect(r.conSeguimiento).toBe(2);
  });

  it('cada área se mide sobre quienes la tienen evaluada', () => {
    const areas = resumirSueno(SUENOS).areas;
    expect(areas.map((a) => [a.clave, a.cantidad, a.evaluados])).toEqual([
      ['calidadDescanso', 1, 3],
      ['somnolencia', 2, 4],
    ]);
  });

  it('las horas de sueño solo cuentan a quienes las capturaron', () => {
    const r = resumirSueno(SUENOS);
    expect([r.conHoras, r.suenoCorto, r.promedioHoras]).toEqual([3, 1, 7]);
    expect(resumirSueno([sueno({ minutosSuenoDiarios: null })]).promedioHoras).toBeNull();
  });

  it('lista las alertas presentes, de la más frecuente a la menos y, en empates, por gravedad', () => {
    expect(resumirSueno(SUENOS).alertas.map((a) => a.clave)).toEqual(['suenoActividadPeligrosa', 'suenoCorto']);
    expect(resumirSueno([sueno()]).alertas).toEqual([]);
  });

  it('arma tablas y hallazgos solo con datos', () => {
    expect(tablasSueno([])).toEqual([]);
    expect(hallazgosSueno([])).toEqual([]);
    expect(tablasSueno([sueno()]).map((t) => t.titulo)).toEqual(['Sueño y vigilia: nivel general']);
    expect(tablasSueno(SUENOS)).toHaveLength(3);
    const hallazgos = hallazgosSueno(SUENOS);
    expect(hallazgos[0]).toContain('50 % presenta síntomas semanales o frecuentes');
    expect(hallazgos[1]).toBe('1 trabajador reportó somnolencia en una actividad peligrosa.');
    expect(hallazgos[2]).toBe('33 % duerme menos de 7 horas por cada 24 (1 de 3).');
  });
});

describe('informes: solo aparece lo que el proveedor usa', () => {
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
  const conCuestionarios = [{ grupoEtario: [[{}, {}, {}, {}]], cuestionarioNordico: [NORDICOS], suenoVigilia: [SUENOS] }];
  const sinCuestionarios = [{ grupoEtario: [[{}, {}]] }];
  const fuentes = (datos: any[]) => ({ datos, indiceCentro: null, conFiltros: false });

  it('con Nórdico y sueño, entran al resumen, al Excel y al informe musculoesquelético', () => {
    const general = armarInforme(fuentes(conCuestionarios), contexto);
    expect(general.tablas.map((t) => t.seccion)).toEqual(expect.arrayContaining(['Musculoesquelético', 'Sueño y vigilia']));
    expect(general.hallazgos.join(' ')).toContain('Cuestionario Nórdico');
    expect(hojasDeExcel(general).map((h) => h.nombre)).toEqual(
      expect.arrayContaining(['Musculoesquelético', 'Sueño y vigilia']),
    );
    const tema = informeTematico('musculoesqueletico', fuentes(conCuestionarios), contexto);
    expect(tema.tablas.map((t) => t.titulo)).toContain('Molestias musculoesqueléticas en los últimos 12 meses');
    expect(tema.hallazgos[0]).toContain('Cuestionario Nórdico');
  });

  it('sin esos documentos no aparece nada de ellos', () => {
    const general = armarInforme(fuentes(sinCuestionarios), contexto);
    expect(general.tablas).toEqual([]);
    expect(general.hallazgos).toEqual([]);
  });

  it('la ventana de informes no anuncia como omitido lo que el proveedor nunca ha usado', () => {
    const general = armarInforme(fuentes(sinCuestionarios), contexto);
    const vacio = armarInforme(fuentes([]), contexto);
    const datos = {
      totalTrabajadores: 2,
      secciones: {},
      general,
      tematicos: { cardiometabolico: vacio, auditivo: vacio, musculoesqueletico: vacio },
    };
    const textos = (historial?: Record<string, boolean>) =>
      estadoDeInforme('completo', { ...datos, historial }).incluye.map((i) => i.texto);

    // Nunca lo ha usado: ni se menciona
    expect(textos({ musculoesqueletico: false, sueno: false })).not.toContain('Sueño y vigilia');
    expect(textos({ musculoesqueletico: false, sueno: false })).not.toContain('Molestias musculoesqueléticas');
    // Lo usa, pero no hay registros con estos filtros: se anuncia como omitido
    expect(textos({ musculoesqueletico: true, sueno: false })).toContain('Molestias musculoesqueléticas');
    // Sin el dato del servidor, se conserva el aviso
    expect(textos()).toContain('Sueño y vigilia');

    const tematico = (historial: Record<string, boolean>) =>
      estadoDeInforme('musculoesqueletico', { ...datos, historial }).incluye.map((i) => i.texto);
    expect(tematico({ musculoesqueletico: false })).toHaveLength(3);
    expect(tematico({ musculoesqueletico: true })).toHaveLength(8);
  });
});
