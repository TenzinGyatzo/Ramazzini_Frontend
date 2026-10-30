/**
 * Ventana «Informes» del tablero de salud: catálogo de informes y, para cada
 * uno, si se puede generar con los datos que el tablero muestra y qué incluirá.
 */
import type { InformeDeTablero } from './dashboardInformes';
import { TABLAS_DE_TEMA, TITULO_COBERTURA_AUDIOMETRIA, type TemaDeInforme } from './dashboardInformesTematicos';
import { TITULOS_NORDICO } from './dashboardCuestionarios';
import { TITULOS_CARDIOMETABOLICO, TITULOS_OTOLOGICA } from './dashboardSeguimiento';

/** Tablas de los informes temáticos que dependen de un documento opcional, y de cuál. */
const SECCION_DE_TABLA: Record<string, string> = Object.fromEntries([
  ...Object.values(TITULOS_NORDICO).map((titulo) => [titulo, 'musculoesqueletico']),
  ...Object.values(TITULOS_CARDIOMETABOLICO).map((titulo) => [titulo, 'cardiometabolico']),
  ...Object.values(TITULOS_OTOLOGICA).map((titulo) => [titulo, 'otologica']),
  // Si el centro nunca ha hecho audiometrías, no se anuncia que falten
  [TITULO_COBERTURA_AUDIOMETRIA, 'gabinete'],
]);

export type IdDeInforme = 'completo' | 'resumen' | TemaDeInforme | 'excel';
/** Informes que llevan conclusiones y recomendaciones propias (el Excel no). */
export type TipoConConclusiones = Exclude<IdDeInforme, 'excel'>;

export interface DefinicionDeInforme {
  id: IdDeInforme;
  grupo: 'Generales' | 'Por tema' | 'Datos';
  nombre: string;
  /** Una línea: para quién o para qué sirve. */
  paraQue: string;
  descripcion: string;
  formato: 'PDF' | 'Excel';
  llevaConclusiones: boolean;
}

export const INFORMES_DEL_TABLERO: DefinicionDeInforme[] = [
  {
    id: 'completo',
    grupo: 'Generales',
    nombre: 'Informe completo',
    paraQue: 'Para el expediente de la empresa',
    descripcion:
      'El informe formal de salud laboral: portada, todas las secciones con sus gráficas, tablas y texto explicativo. Es el más extenso.',
    formato: 'PDF',
    llevaConclusiones: true,
  },
  {
    id: 'resumen',
    grupo: 'Generales',
    nombre: 'Resumen para dirección',
    paraQue: 'Lo esencial en 1 o 2 páginas',
    descripcion:
      'Las cifras clave y los hallazgos principales, redactados para alguien que no es médico. Sin gráficas.',
    formato: 'PDF',
    llevaConclusiones: true,
  },
  {
    id: 'cardiometabolico',
    grupo: 'Por tema',
    nombre: 'Riesgo cardiometabólico',
    paraQue: 'Peso, presión y antecedentes',
    descripcion:
      'Reúne lo relacionado con sobrepeso, presión arterial, diabetes y enfermedad cardiovascular, con los diagnósticos de consulta de ese grupo.',
    formato: 'PDF',
    llevaConclusiones: true,
  },
  {
    id: 'auditivo',
    grupo: 'Por tema',
    nombre: 'Salud auditiva',
    paraQue: 'Ruido y audiometrías',
    descripcion:
      'Trabajadores expuestos a ruido, resultados de las audiometrías y diagnósticos de oído registrados en consulta.',
    formato: 'PDF',
    llevaConclusiones: true,
  },
  {
    id: 'musculoesqueletico',
    grupo: 'Por tema',
    nombre: 'Sistema musculoesquelético',
    paraQue: 'Ergonomía, lumbalgias y lesiones',
    descripcion:
      'Exposición a factores ergonómicos y vibraciones, antecedentes de lumbalgia y accidentes, y diagnósticos musculoesqueléticos y de traumatismos.',
    formato: 'PDF',
    llevaConclusiones: true,
  },
  {
    id: 'excel',
    grupo: 'Datos',
    nombre: 'Tablas en Excel',
    paraQue: 'Para hacer tu propio análisis',
    descripcion:
      'Todas las tablas del tablero en un archivo de Excel, una hoja por sección. No lleva conclusiones ni datos de trabajadores.',
    formato: 'Excel',
    llevaConclusiones: false,
  },
];

export const GRUPOS_DE_INFORMES = ['Generales', 'Por tema', 'Datos'] as const;

export const definicionDe = (id: IdDeInforme) =>
  INFORMES_DEL_TABLERO.find((informe) => informe.id === id) ?? INFORMES_DEL_TABLERO[0];

export interface EstadoDeInforme {
  disponible: boolean;
  /** Por qué no se puede generar; vacío si está disponible. */
  motivo: string;
  /** Lo que el informe incluirá con los datos actuales y lo que se omitirá. */
  incluye: { texto: string; incluido: boolean }[];
}

/** Secciones del informe completo, con la sección del tablero que les da datos. */
const SECCIONES_DEL_COMPLETO: { texto: string; seccion: string | null }[] = [
  { texto: 'Composición demográfica', seccion: null },
  { texto: 'Indicadores de salud física', seccion: null },
  { texto: 'Antecedentes y agentes de riesgo', seccion: null },
  { texto: 'Hábitos y estilo de vida', seccion: 'habitos' },
  { texto: 'Seguimiento cardiometabólico', seccion: 'cardiometabolico' },
  { texto: 'Salud visual', seccion: 'saludVisual' },
  { texto: 'Tamizajes psicológicos', seccion: 'saludMental' },
  { texto: 'Estudios de gabinete', seccion: 'gabinete' },
  { texto: 'Antecedentes auditivos', seccion: 'otologica' },
  { texto: 'Molestias musculoesqueléticas', seccion: 'musculoesqueletico' },
  { texto: 'Sueño y vigilia', seccion: 'sueno' },
  { texto: 'Pruebas antidoping', seccion: 'antidoping' },
  { texto: 'Aptitud al puesto', seccion: null },
  { texto: 'Diagnósticos de las consultas', seccion: 'diagnosticos' },
  { texto: 'Consumo de insumos', seccion: 'inventario' },
];

const MOTIVO_SIN_DATOS: Record<TemaDeInforme, string> = {
  cardiometabolico: 'Sin exploraciones físicas, antecedentes ni diagnósticos de este tema en el periodo',
  auditivo: 'Sin exposición a ruido, audiometrías ni diagnósticos de oído en el periodo',
  musculoesqueletico: 'Sin exposición ergonómica, antecedentes ni diagnósticos de este tema en el periodo',
};

export interface DatosParaEstado {
  totalTrabajadores: number;
  /** Secciones del tablero que tienen registros (las mismas que la pantalla muestra u oculta). */
  secciones: Record<string, boolean>;
  general: InformeDeTablero;
  tematicos: Record<TemaDeInforme, InformeDeTablero>;
  /**
   * Secciones opcionales que el centro ha usado alguna vez. Lo que no tiene
   * registros ni historial no se anuncia como omitido: ese proveedor no lo usa.
   */
  historial?: Record<string, boolean>;
}

export function estadoDeInforme(id: IdDeInforme, datos: DatosParaEstado): EstadoDeInforme {
  const tiene = (titulo: string, informe = datos.general) => informe.tablas.some((tabla) => tabla.titulo === titulo);
  const sinHistorial = (seccion: string) => datos.historial?.[seccion] === false;

  if (id === 'completo') {
    const disponible = datos.totalTrabajadores > 0;
    return {
      disponible,
      motivo: disponible ? '' : 'No hay trabajadores con los filtros elegidos',
      incluye: SECCIONES_DEL_COMPLETO.filter(
        ({ seccion }) => seccion === null || !!datos.secciones[seccion] || !sinHistorial(seccion),
      ).map(({ texto, seccion }) => ({
        texto,
        incluido: disponible && (seccion === null || !!datos.secciones[seccion]),
      })),
    };
  }

  if (id === 'resumen') {
    const hallazgos = datos.general.hallazgos.length;
    return {
      disponible: hallazgos > 0,
      motivo: hallazgos > 0 ? '' : 'No hay registros suficientes en el periodo para describir hallazgos',
      incluye: [
        {
          texto: hallazgos === 1 ? 'Cifras clave y 1 hallazgo' : `Cifras clave y ${hallazgos} hallazgos`,
          incluido: hallazgos > 0,
        },
        { texto: 'Aptitud al puesto', incluido: tiene('Aptitud al puesto') },
        { texto: 'Diagnósticos de las consultas', incluido: tiene('Diagnósticos de las consultas') },
        { texto: 'Agentes de riesgo', incluido: tiene('Agentes de riesgo') },
        { texto: 'Comparación con otro periodo', incluido: !!datos.general.comparativo },
      ],
    };
  }

  if (id === 'excel') {
    const hojas = [...new Set(datos.general.tablas.map((tabla) => tabla.seccion))];
    return {
      disponible: hojas.length > 0,
      motivo: hojas.length > 0 ? '' : 'No hay registros con los filtros elegidos',
      incluye: [
        { texto: 'Resumen con cifras clave y hallazgos', incluido: hojas.length > 0 },
        ...hojas.map((hoja) => ({ texto: hoja, incluido: true })),
        { texto: 'Comparación con otro periodo', incluido: !!datos.general.comparativo },
        { texto: 'Indicadores por centro de trabajo', incluido: !!datos.general.porCentro },
      ],
    };
  }

  const tematico = datos.tematicos[id];
  const disponible = tematico.tablas.length > 0;
  const graficas = tematico.graficas ?? [];
  return {
    disponible,
    motivo: disponible ? '' : MOTIVO_SIN_DATOS[id],
    incluye: [
      ...(graficas.length
        ? [
            {
              texto: `${graficas.length === 1 ? 'Gráfica principal' : `${graficas.length} gráficas principales`}, con su conclusión`,
              incluido: true,
            },
          ]
        : []),
      ...TABLAS_DE_TEMA[id]
      .map((titulo) => ({ texto: titulo, incluido: tiene(titulo, tematico) }))
      .filter(
        (parte) =>
          parte.incluido ||
          !(SECCION_DE_TABLA[parte.texto] && sinHistorial(SECCION_DE_TABLA[parte.texto])),
      ),
    ],
  };
}

const escapar = (texto: string) =>
  texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Los hallazgos automáticos como lista, para usarlos de borrador de las conclusiones. */
export const hallazgosComoBorrador = (hallazgos: string[]): string =>
  hallazgos.length ? `<ul>${hallazgos.map((hallazgo) => `<li>${escapar(hallazgo)}</li>`).join('')}</ul>` : '';
