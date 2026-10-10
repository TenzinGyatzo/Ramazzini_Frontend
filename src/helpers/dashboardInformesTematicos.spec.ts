import { describe, expect, it } from 'vitest';
import { definicionResumenEjecutivo } from './dashboardInformes';
import { diagnosticosDeCapitulos, informeTematico, tituloDeTema } from './dashboardInformesTematicos';

const veces = <T,>(n: number, valor: T): T[] => Array.from({ length: n }, () => valor);
const centro = (campos: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(campos).map(([clave, lista]) => [clave, [lista]]));
const dx = (clave: string, etiqueta: string) => ({ clave, etiqueta, principal: true, mes: '2026-02' });

const datos = [
  centro({
    grupoEtario: veces(10, { sexo: 'Masculino' }),
    imc: [...veces(4, { categoriaIMC: 'Normal' }), ...veces(4, { categoriaIMC: 'Sobrepeso' })],
    tensionArterial: [
      ...veces(6, { categoriaTensionArterial: 'Normal' }),
      ...veces(2, { categoriaTensionArterial: 'Hipertensión grado 1' }),
    ],
    circunferenciaCintura: [
      ...veces(2, { categoriaCircunferenciaCintura: 'Alto Riesgo' }),
      ...veces(6, { categoriaCircunferenciaCintura: 'Bajo Riesgo' }),
    ],
    enfermedadesCronicas: [
      { diabeticosPP: 'Si', hipertensivosPP: 'Si' },
      { hipertensivosPP: 'Si', alergicos: 'Si' },
      ...veces(6, {}),
    ],
    antecedentes: [{ lumbalgias: 'Si' }, { lumbalgias: 'Si', quirurgicos: 'Si' }, ...veces(6, {})],
    agentesRiesgo: [
      ...veces(6, { agentesRiesgoActuales: ['Ruido', 'Ergonómicos'] }),
      { agentesRiesgoActuales: ['Ruido'] },
      ...veces(3, { agentesRiesgoActuales: [] }),
    ],
    aptitudes: veces(8, { aptitudPuesto: 'Apto Sin Restricciones' }),
    consultas: veces(9, { fechaNotaMedica: '2026-02-10T00:00:00.000Z' }),
    diagnosticos: [
      ...veces(3, dx('I10X', 'I10X - HIPERTENSION ESENCIAL')),
      dx('E119', 'E119 - DIABETES MELLITUS'),
      ...veces(2, dx('M545', 'M545 - LUMBAGO')),
      dx('S934', 'S934 - ESGUINCE DE TOBILLO'),
      dx('H919', 'H919 - HIPOACUSIA'),
      dx('J00X', 'J00X - RINOFARINGITIS'),
    ],
  }),
];

const fuentes = {
  datos,
  indiceCentro: null,
  tablasDePantalla: [
    {
      seccion: 'Gabinete',
      titulo: 'Audiometría',
      filas: [
        ['Normal', 5, 63],
        ['Hipoacusia leve', 2, 25],
        ['Hipoacusia moderada', 1, 12],
      ],
    },
  ],
};
const contexto = {
  empresa: 'Aceros del Norte',
  centro: 'Todos',
  periodo: 'Periodo del 1/1/2026 al 31/3/2026',
  segmento: '',
  responsable: 'Dra. Ana López',
  fecha: '10 de octubre de 2026',
  conclusiones: '',
  recomendaciones: '',
  recomendacionesTabla: [],
};

describe('informes temáticos del tablero de salud', () => {
  it('reúne los diagnósticos de consulta de los capítulos de la CIE-10 pedidos', () => {
    const diagnosticos = datos[0].diagnosticos[0] as any[];
    expect(diagnosticosDeCapitulos(diagnosticos, ['XIII', 'XIX'], 'Musculoesquelético')?.filas).toEqual([
      ['M545 - LUMBAGO', 2],
      ['S934 - ESGUINCE DE TOBILLO', 1],
    ]);
    expect(diagnosticosDeCapitulos(diagnosticos, ['XV'], 'Embarazo')).toBeNull();
  });

  it('cardiometabólico: IMC, cintura, presión, antecedentes y sus diagnósticos', () => {
    const informe = informeTematico('cardiometabolico', fuentes, contexto);
    expect(informe.tablas.map((t) => t.titulo)).toEqual([
      'Índice de masa corporal',
      'Circunferencia de cintura',
      'Presión arterial',
      'Antecedentes de diabetes, hipertensión y cardiopatía',
      'Diagnósticos metabólicos y cardiovasculares en las consultas',
    ]);
    // De las crónicas solo entran las del tema; las alergias no
    expect(informe.tablas[3].filas.map((fila) => fila[0])).toEqual(['Diabéticos', 'Hipertensivos', 'Cardiopáticos']);
    expect(informe.hallazgos).toEqual([
      '50 % de los trabajadores con exploración física tiene sobrepeso u obesidad (4 de 8).',
      '25 % tiene circunferencia de cintura de alto riesgo (2 de 8).',
      '25 % presentó presión arterial alta o en rango de hipertensión (2 de 8).',
      'Antecedentes referidos en la historia clínica: diabéticos 1, hipertensivos 2.',
      'En las consultas del periodo se registraron 4 diagnósticos del grupo metabólico o cardiovascular; el más frecuente fue I10X - HIPERTENSION ESENCIAL (3 registros).',
    ]);
  });

  it('auditivo: exposición a ruido, audiometrías y diagnósticos de oído', () => {
    const informe = informeTematico('auditivo', fuentes, contexto);
    expect(informe.tablas.map((t) => t.titulo)).toEqual([
      'Exposición a ruido',
      'Audiometría',
      'Diagnósticos de oído en las consultas',
    ]);
    expect(informe.hallazgos).toEqual([
      '7 trabajadores están expuestos a ruido (70 % de la plantilla).',
      'De 8 audiometrías, 3 tuvieron un resultado distinto de normal (38 %).',
      'En las consultas del periodo se registraron 1 diagnóstico de oído; el más frecuente fue H919 - HIPOACUSIA (1 registro).',
    ]);
  });

  it('musculoesquelético: exposición ergonómica, lumbalgias y sus diagnósticos', () => {
    const informe = informeTematico('musculoesqueletico', fuentes, contexto);
    expect(informe.tablas.map((t) => t.titulo)).toEqual([
      'Exposición a factores ergonómicos y vibraciones',
      'Antecedentes de lumbalgia y accidentes',
      'Diagnósticos musculoesqueléticos y traumatismos en las consultas',
    ]);
    expect(informe.hallazgos[0]).toBe('6 trabajadores están expuestos a factores ergonómicos (60 % de la plantilla).');
    expect(informe.hallazgos[1]).toBe('2 trabajadores refieren antecedente de lumbalgia en su historia clínica.');
    expect(informe.hallazgos[2]).toContain('M545 - LUMBAGO (2 registros)');
  });

  it('sin registros del tema, el informe queda sin tablas ni hallazgos', () => {
    const informe = informeTematico('auditivo', { datos: [], indiceCentro: null }, contexto);
    expect(informe.tablas).toEqual([]);
    expect(informe.hallazgos).toEqual([]);
    const texto = JSON.stringify(
      definicionResumenEjecutivo(informe, { titulo: tituloDeTema('auditivo'), todasLasTablas: true }),
    );
    expect(texto).toContain('Informe de salud auditiva');
    expect(texto).toContain('No hay registros suficientes en el periodo');
  });

  it('el PDF temático lleva su título y todas sus tablas', () => {
    const informe = informeTematico('cardiometabolico', fuentes, { ...contexto, segmento: 'Puesto: Soldador' });
    const texto = JSON.stringify(
      definicionResumenEjecutivo(informe, { titulo: tituloDeTema('cardiometabolico'), todasLasTablas: true }),
    );
    expect(texto).toContain('Informe de riesgo cardiometabólico');
    expect(texto).toContain('Circunferencia de cintura');
    expect(texto).toContain('E119 - DIABETES MELLITUS');
    expect(texto).toContain('Puesto: Soldador');
    expect(texto).not.toContain('Resumen ejecutivo de salud laboral');
  });
});
