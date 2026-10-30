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
    expect(texto).not.toContain('Resumen de salud laboral para dirección');
  });

  it('cada tema lleva hasta tres gráficas principales, con la conclusión como titular', () => {
    const cardio = informeTematico('cardiometabolico', fuentes, contexto).graficas ?? [];
    expect(cardio.map((g) => g.titular)).toEqual([
      '50 % tiene sobrepeso u obesidad',
      '25 % tiene presión arterial alta o en rango de hipertensión',
      // Sin seguimiento cardiometabólico, los antecedentes
      'El antecedente más referido es hipertensión (2 trabajadores)',
    ]);
    // Las barras de IMC con su semáforo: verde lo normal, ámbar el sobrepeso
    expect((cardio[0] as any).filas.map((f: any) => [f.etiqueta, f.color])).toEqual([
      ['Normal', '#10B981'],
      ['Sobrepeso', '#F59E0B'],
    ]);

    const auditivo = informeTematico('auditivo', fuentes, contexto).graficas ?? [];
    expect(auditivo.map((g) => g.titular)).toEqual([
      '38 % de las audiometrías tuvo un resultado distinto de normal',
      '70 % de la plantilla está expuesta a ruido',
      'El diagnóstico de oído más frecuente fue H919 - HIPOACUSIA',
    ]);

    const musculo = informeTematico('musculoesqueletico', fuentes, contexto).graficas ?? [];
    expect(musculo.map((g) => g.titular)).toEqual([
      '60 % de la plantilla está expuesta a factores ergonómicos',
      '2 trabajadores refieren antecedente de lumbalgia',
      'El diagnóstico musculoesquelético o de traumatismo más frecuente fue M545 - LUMBAGO',
    ]);
  });

  it('con gráficas, el PDF va de los resultados a las conclusiones y deja las tablas como anexo', () => {
    const informe = informeTematico('cardiometabolico', fuentes, { ...contexto, conclusiones: '<p>Conclusión del médico</p>' });
    const dibujadas: string[] = [];
    const definicion = definicionResumenEjecutivo(informe, {
      titulo: tituloDeTema('cardiometabolico'),
      todasLasTablas: true,
      dibujar: (config, ancho, alto) => {
        dibujadas.push(`${config.type} ${ancho}x${alto}`);
        return 'data:image/png;base64,AAAA';
      },
    });
    expect(dibujadas).toHaveLength(3);
    const texto = JSON.stringify(definicion.content);
    const posicion = (fragmento: string) => texto.indexOf(fragmento);
    expect(posicion('50 % tiene sobrepeso u obesidad')).toBeLessThan(posicion('Hallazgos principales'));
    expect(posicion('Hallazgos principales')).toBeLessThan(posicion('Conclusión del médico'));
    expect(posicion('Conclusión del médico')).toBeLessThan(posicion('Anexo: tablas de detalle'));
    expect(posicion('Anexo: tablas de detalle')).toBeLessThan(posicion('Circunferencia de cintura","style"'));

    // Sin quien dibuje (o sin gráficas) se queda como antes: tablas antes de las conclusiones
    const sinDibujar = JSON.stringify(
      definicionResumenEjecutivo(informe, { titulo: tituloDeTema('cardiometabolico'), todasLasTablas: true }).content,
    );
    expect(sinDibujar).not.toContain('Anexo: tablas de detalle');
    expect(sinDibujar.indexOf('Circunferencia de cintura')).toBeLessThan(sinDibujar.indexOf('Conclusión del médico'));
  });

  it('auditivo: de los expuestos a ruido, cuántos tienen audiometría en el periodo, como en el tablero', () => {
    const conCobertura = [
      {
        ...datos[0],
        coberturaExposicion: [
          [
            { agente: 'Ruido', estudio: 'audiometria', expuestos: 7, conEstudio: 5 },
            { agente: 'Polvos', estudio: 'espirometria', expuestos: 3, conEstudio: 1 },
          ],
        ],
      },
    ];
    const informe = informeTematico('auditivo', { ...fuentes, datos: conCobertura }, contexto);
    // Es la primera gráfica: lo primero que pregunta quien dirige
    const [vigilancia] = informe.graficas ?? [];
    expect(vigilancia.titular).toBe('71 % de los expuestos a ruido tiene su audiometría del periodo');
    expect((vigilancia as any).segmentos.map((s: any) => [s.etiqueta, s.cantidad])).toEqual([
      ['Con audiometría en el periodo', 5],
      ['Sin audiometría en el periodo', 2],
    ]);
    // Hay 8 trabajadores con audiometría, pero solo 5 de los expuestos: se explica la diferencia
    expect(informe.hallazgos).toContain(
      'De 7 trabajadores expuestos a ruido, 5 tienen audiometría en el periodo (71 %). De los 8 trabajadores con audiometría en el periodo, 3 no tienen registrada exposición a ruido.',
    );
    expect(vigilancia.nota).toContain('3 no tienen registrada exposición a ruido');
    expect(informe.tablas.find((t) => t.titulo === 'Expuestos a ruido con audiometría en el periodo')?.filas).toEqual([
      ['Con audiometría en el periodo', 5, '71 %'],
      ['Sin audiometría en el periodo', 2, '29 %'],
    ]);

    // Si el centro nunca ha hecho audiometrías, no se afirma que falten
    // historial es un objeto por centro, no una lista como los demás campos
    const sinHistorial = [{ ...conCobertura[0], historial: { gabinete: false } as any }];
    const sinAudiometrias = {
      ...fuentes,
      datos: [{ ...sinHistorial[0], coberturaExposicion: [[{ agente: 'Ruido', estudio: 'audiometria', expuestos: 7, conEstudio: 0 }]] }],
    };
    const otro = informeTematico('auditivo', sinAudiometrias, contexto);
    expect(otro.tablas.map((t) => t.titulo)).not.toContain('Expuestos a ruido con audiometría en el periodo');
    expect(otro.hallazgos.join(' ')).not.toContain('tienen audiometría');
  });

  it('musculoesquelético: de los expuestos a factores ergonómicos, cuántos tienen Cuestionario Nórdico', () => {
    const conCobertura = [
      { ...datos[0], coberturaExposicion: [[{ agente: 'Ergonómicos', estudio: 'nordico', expuestos: 6, conEstudio: 3 }]] },
    ];
    const informe = informeTematico('musculoesqueletico', { ...fuentes, datos: conCobertura }, contexto);
    expect(informe.graficas?.[0].titular).toBe(
      '50 % de los expuestos a factores ergonómicos tiene su Cuestionario Nórdico del periodo',
    );
    expect(informe.hallazgos).toContain(
      'De 6 trabajadores expuestos a factores ergonómicos, 3 tienen Cuestionario Nórdico en el periodo (50 %).',
    );
    expect(informe.tablas.map((t) => t.titulo)).toContain(
      'Expuestos a factores ergonómicos con Cuestionario Nórdico en el periodo',
    );
  });
});
