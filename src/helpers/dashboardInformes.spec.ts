import { describe, expect, it } from 'vitest';
import {
  armarInforme,
  definicionResumenEjecutivo,
  hallazgosDelTablero,
  hojasDeExcel,
  nombreDeArchivo,
  tablaDePantalla,
  tablasDelTablero,
} from './dashboardInformes';

const veces = <T,>(n: number, valor: T): T[] => Array.from({ length: n }, () => valor);

const centro = (campos: Record<string, unknown[]>) =>
  Object.fromEntries(Object.entries(campos).map(([clave, lista]) => [clave, [lista]]));

const datos = [
  centro({
    grupoEtario: [...veces(6, { sexo: 'Masculino' }), ...veces(4, { sexo: 'Femenino' })],
    imc: [
      ...veces(4, { categoriaIMC: 'Normal' }),
      ...veces(3, { categoriaIMC: 'Sobrepeso' }),
      { categoriaIMC: 'Obesidad clase I' },
    ],
    tensionArterial: [
      ...veces(6, { categoriaTensionArterial: 'Normal' }),
      { categoriaTensionArterial: 'Alta' },
      { categoriaTensionArterial: 'Hipertensión grado 1' },
    ],
    circunferenciaCintura: [
      ...veces(2, { categoriaCircunferenciaCintura: 'Alto Riesgo' }),
      ...veces(6, { categoriaCircunferenciaCintura: 'Bajo Riesgo' }),
    ],
    enfermedadesCronicas: [
      { diabeticosPP: 'Si', hipertensivosPP: 'Si' },
      { hipertensivosPP: 'Si' },
      ...veces(6, {}),
    ],
    antecedentes: [{ lumbalgias: 'Si' }, ...veces(7, {})],
    agentesRiesgo: [
      ...veces(5, { agentesRiesgoActuales: ['Ruido'] }),
      ...veces(2, { agentesRiesgoActuales: ['Ruido', 'Polvos'] }),
      ...veces(3, { agentesRiesgoActuales: [] }),
    ],
    aptitudes: [
      ...veces(6, { aptitudPuesto: 'Apto Sin Restricciones' }),
      { aptitudPuesto: 'Apto Con Restricciones' },
      { aptitudPuesto: 'No Apto' },
    ],
    consultas: [
      ...veces(3, { fechaNotaMedica: '2026-02-10T00:00:00.000Z' }),
      { fechaNotaMedica: '2026-03-05T00:00:00.000Z' },
    ],
    diagnosticos: [
      ...veces(3, { clave: 'J00X', etiqueta: 'J00X - RINOFARINGITIS AGUDA', principal: true, mes: '2026-02' }),
      { clave: 'M545', etiqueta: 'M545 - LUMBAGO', principal: true, mes: '2026-03' },
    ],
  }),
];

const insumos = [
  { nombre: 'Paracetamol 500 mg', unidad: 'tableta', consumo: 42, administrado: 10, entregado: 32, bajas: 0 },
  { nombre: 'Gasas', unidad: 'pieza', consumo: 5, administrado: 5, entregado: 0, bajas: 2 },
  { nombre: 'Sin movimiento', unidad: 'pieza', consumo: 0, administrado: 0, entregado: 0, bajas: 0 },
];

const fuentes = { datos, indiceCentro: null, insumos };
const contexto = {
  empresa: 'Aceros del Norte, S.A.',
  centro: 'Todos',
  periodo: 'Periodo del 1/1/2026 al 31/3/2026',
  segmento: '',
  responsable: 'Dra. Ana López',
  fecha: '10 de octubre de 2026',
  conclusiones: 'La plantilla presenta riesgo cardiometabólico.',
  recomendaciones: '',
  recomendacionesTabla: [{ hallazgo: 'Sobrepeso', medidaPreventiva: 'Programa de nutrición' }],
};

describe('informes del tablero de salud', () => {
  it('redacta los hallazgos con las cifras de los datos', () => {
    expect(hallazgosDelTablero(fuentes)).toEqual([
      '50 % de los trabajadores con exploración física tiene sobrepeso u obesidad (4 de 8).',
      '25 % presentó presión arterial alta o en rango de hipertensión (2 de 8).',
      '25 % tiene circunferencia de cintura de alto riesgo (2 de 8).',
      'El antecedente crónico más frecuente es hipertensivos: 2 trabajadores (25 %).',
      'El agente de riesgo con más trabajadores expuestos es ruido: 7 trabajadores (70 % de la plantilla).',
      'De 8 trabajadores con aptitud evaluada, 75 % resultó apto sin restricciones y 1 no apto.',
      'Se registraron 4 consultas médicas. El diagnóstico más frecuente fue J00X - RINOFARINGITIS AGUDA (3 registros) y el grupo de enfermedades más frecuente, sistema respiratorio (75 % de los diagnósticos).',
      'El insumo más consumido fue Paracetamol 500 mg: 42 (tableta).',
    ]);
  });

  it('sin datos no afirma nada', () => {
    expect(hallazgosDelTablero({ datos: [], indiceCentro: null })).toEqual([]);
    expect(tablasDelTablero({ datos: [], indiceCentro: null })).toEqual([]);
  });

  it('arma las tablas por sección y omite las que no tienen registros', () => {
    const tablas = tablasDelTablero({
      ...fuentes,
      tablasDePantalla: [
        { seccion: 'Salud visual', titulo: 'Agudeza visual', filas: [['Visión normal', 5, 63], ['Visión muy reducida', 0, 0]] },
        { seccion: 'Gabinete', titulo: 'Espirometría', filas: [['Normal', 0, 0]] },
      ],
    });
    expect(tablas.map((t) => `${t.seccion} · ${t.titulo}`)).toEqual([
      'Población · Distribución por sexo',
      'Salud física · Índice de masa corporal',
      'Salud física · Circunferencia de cintura',
      'Salud física · Presión arterial',
      'Antecedentes · Enfermedades crónicas',
      'Antecedentes · Antecedentes referidos',
      'Exposición · Agentes de riesgo',
      'Salud visual · Agudeza visual',
      'Aptitud · Aptitud al puesto',
      'Consultas · Diagnósticos de las consultas',
      'Consultas · Diagnósticos por grupo de enfermedades',
      'Consultas · Consultas por mes',
      'Inventario · Consumo de insumos',
    ]);
    const sexo = tablas[0];
    expect(sexo.filas).toEqual([
      ['Hombres', 6, '60 %'],
      ['Mujeres', 4, '40 %'],
    ]);
    const cronicas = tablas.find((t) => t.titulo === 'Enfermedades crónicas');
    expect(cronicas?.filas[1]).toEqual(['Hipertensivos', 2, '25 %']);
    // Solo insumos con consumo o bajas
    expect(tablas[tablas.length - 1].filas).toHaveLength(2);
  });

  it('convierte las tablas de la pantalla y descarta lo que no es una fila', () => {
    expect(
      tablaDePantalla({
        seccion: 'Gabinete',
        titulo: 'EKG',
        filas: [['normal', 3], ['anormal', 1], 'ruido', null],
        etiquetas: { normal: 'Normal', anormal: 'Anormal' },
      }),
    ).toEqual({
      seccion: 'Gabinete',
      titulo: 'EKG',
      columnas: ['Concepto', 'Cantidad'],
      filas: [
        ['Normal', 3],
        ['Anormal', 1],
      ],
    });
    expect(tablaDePantalla({ seccion: 'x', titulo: 'x', filas: [] })).toBeNull();
  });

  it('el Excel lleva un resumen y una hoja por sección', () => {
    const informe = armarInforme({ ...fuentes, conFiltros: false }, contexto);
    const hojas = hojasDeExcel(informe);
    expect(hojas.map((h) => h.nombre)).toEqual([
      'Resumen',
      'Población',
      'Salud física',
      'Antecedentes',
      'Exposición',
      'Aptitud',
      'Consultas',
      'Inventario',
    ]);
    const resumen = hojas[0].filas;
    expect(resumen).toContainEqual(['Empresa', 'Aceros del Norte, S.A.']);
    expect(resumen).toContainEqual(['Trabajadores activos', 10, 'Plantilla actual']);
    expect(resumen).toContainEqual(['Hallazgos']);
    // Sin filtros de población no aparece el renglón del segmento
    expect(resumen.some((fila) => fila[0] === 'Trabajadores incluidos')).toBe(false);

    const saludFisica = hojas[2].filas;
    expect(saludFisica[0]).toEqual(['Índice de masa corporal']);
    expect(saludFisica[1]).toEqual(['Categoría', 'Trabajadores', 'Porcentaje']);
    // Entre una tabla y otra queda un renglón en blanco
    expect(saludFisica).toContainEqual([]);
    expect(saludFisica).toContainEqual(['Presión arterial']);
  });

  it('con filtros de población lo indica en el Excel y en el resumen ejecutivo', () => {
    const informe = armarInforme(
      { ...fuentes, conFiltros: true },
      { ...contexto, segmento: 'Puesto: Soldador' },
    );
    expect(hojasDeExcel(informe)[0].filas).toContainEqual(['Trabajadores incluidos', 'Puesto: Soldador']);
    expect(informe.cifras[0].detalle).toBe('Con los filtros elegidos');
    expect(JSON.stringify(definicionResumenEjecutivo(informe))).toContain('Puesto: Soldador');
  });

  it('el resumen ejecutivo lleva cifras, hallazgos, tablas principales, conclusiones y recomendaciones', () => {
    const informe = armarInforme({ ...fuentes, conFiltros: false }, contexto);
    const texto = JSON.stringify(definicionResumenEjecutivo(informe));
    expect(texto).toContain('Resumen ejecutivo de salud laboral');
    expect(texto).toContain('Aceros del Norte, S.A.');
    expect(texto).toContain('Dra. Ana López');
    expect(texto).toContain('tiene sobrepeso u obesidad');
    expect(texto).toContain('Aptitud al puesto');
    expect(texto).toContain('J00X - RINOFARINGITIS AGUDA');
    expect(texto).toContain('La plantilla presenta riesgo cardiometabólico.');
    expect(texto).toContain('Programa de nutrición');
    // Las tablas de detalle quedan para el informe completo y el Excel
    expect(texto).not.toContain('Circunferencia de cintura');
    expect(texto).toContain('no sustituyen la valoración del responsable médico');
  });

  it('sin registros, el resumen lo dice en lugar de inventar hallazgos', () => {
    const informe = armarInforme({ datos: [], indiceCentro: null, conFiltros: false }, { ...contexto, conclusiones: '', recomendacionesTabla: [] });
    const texto = JSON.stringify(definicionResumenEjecutivo(informe));
    expect(texto).toContain('No hay registros suficientes en el periodo');
    expect(texto).not.toContain('Conclusiones');
    expect(texto).not.toContain('Recomendaciones');
  });

  it('nombra los archivos con la empresa y la fecha', () => {
    const informe = armarInforme({ ...fuentes, conFiltros: false }, contexto);
    expect(nombreDeArchivo('ResumenEjecutivo', informe, '2026-10-10', 'pdf')).toBe(
      'ResumenEjecutivo_Aceros_del_Norte_S_A_2026-10-10.pdf',
    );
  });
});
