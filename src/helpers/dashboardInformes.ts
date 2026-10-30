/**
 * Tablero de salud: informes adicionales al informe completo en PDF.
 *  - Resumen para dirección: una o dos páginas con cifras clave, hallazgos redactados
 *    a partir de los datos y las tablas principales.
 *  - Datos en Excel: todas las tablas del tablero, una hoja por sección.
 * Ambos salen de las mismas tablas, que se arman aquí sin depender de la pantalla.
 */
import {
  contarAgentesRiesgo,
  contarAntecedentesReferidos,
  contarEnfermedadesCronicas,
  contarPorAptitudPuesto,
  contarPorCategoriaIMCConPorcentaje,
  contarPorCategoriaTensionArterial,
  contarPorSexo,
  etiquetasAntecedentesReferidos,
  etiquetasEnfermedades,
} from './dashboardDataProcessor';
import { consultasPorMes, resumirDiagnosticos, type DiagnosticoDeTablero } from './dashboardDiagnosticos';
import { cifrasClave, registrosDe, type CifraClave } from './dashboardSecciones';
import { htmlToPdfMakeContent, isHtmlContentEmpty } from './pdfHtmlParser';
import { contenidoDeGraficas, type DibujarGrafica, type GraficaDeInforme } from './dashboardGraficasInforme';
import {
  hallazgosNordico,
  hallazgosSueno,
  tablasNordico,
  tablasSueno,
  type NordicoDeTablero,
  type SuenoDeTablero,
} from './dashboardCuestionarios';
import { hallazgosAntidoping, tablasAntidoping, type AntidopingDeTablero } from './dashboardAntidoping';
import { hallazgosHabitos, tablasHabitos, type HabitosDeTablero } from './dashboardHabitos';
import {
  hallazgosCardiometabolico,
  hallazgosIncapacidades,
  hallazgosOtologica,
  tablasCardiometabolico,
  tablasConsultas,
  tablasIncapacidades,
  tablasOtologica,
  type CardiometabolicoDeTablero,
  type ConsultaDeTablero,
  type OtologicaDeTablero,
  type ResumenIncapacidades,
} from './dashboardSeguimiento';

export type Celda = string | number;

export interface TablaDeInforme {
  seccion: string;
  titulo: string;
  columnas: string[];
  filas: Celda[][];
}

/** Tabla que la pantalla ya tiene calculada: filas `[concepto, cantidad, porcentaje?]`. */
export interface TablaDePantalla {
  seccion: string;
  titulo: string;
  filas: unknown[];
  /** Texto para mostrar en lugar de la clave de cada fila. */
  etiquetas?: Record<string, string>;
}

export interface InsumoConsumido {
  nombre: string;
  unidad: string;
  consumo: number;
  administrado: number;
  entregado: number;
  bajas: number;
}

export interface InformeDeTablero {
  empresa: string;
  centro: string;
  periodo: string;
  /** Filtros de población aplicados; vacío si es toda la plantilla. */
  segmento: string;
  responsable: string;
  /** Logotipo de la empresa como data URL de imagen; sin él, el informe sale sin logo. */
  logo?: string;
  /** Fecha de generación, ya con formato. */
  fecha: string;
  cifras: CifraClave[];
  hallazgos: string[];
  tablas: TablaDeInforme[];
  /** Texto con formato (HTML del editor), propio de cada tipo de informe. */
  conclusiones: string;
  recomendaciones: string;
  recomendacionesTabla: { hallazgo: string; medidaPreventiva: string }[];
  /** Comparación con otro periodo, si el usuario la pidió. */
  comparativo?: TablaDeInforme | null;
  /** Los mismos indicadores por centro de trabajo, cuando la empresa tiene varios. */
  porCentro?: TablaDeInforme | null;
  /** Gráficas principales, con su titular (informes temáticos). */
  graficas?: GraficaDeInforme[];
}

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const conPorcentaje = (
  seccion: string,
  titulo: string,
  concepto: string,
  filas: [string, number, number][],
  etiquetas: Record<string, string> = {},
): TablaDeInforme => ({
  seccion,
  titulo,
  columnas: [concepto, 'Trabajadores', 'Porcentaje'],
  filas: filas.map(([clave, cantidad, porcentaje]) => [etiquetas[clave] ?? clave, cantidad, `${porcentaje} %`]),
});

/** Convierte una tabla de la pantalla; null si no tiene ningún registro. */
export function tablaDePantalla(tabla: TablaDePantalla): TablaDeInforme | null {
  const filas = (Array.isArray(tabla.filas) ? tabla.filas : [])
    .filter((fila): fila is unknown[] => Array.isArray(fila) && typeof fila[1] === 'number')
    .map((fila): Celda[] => {
      const concepto = String(fila[0] ?? '');
      const celdas: Celda[] = [tabla.etiquetas?.[concepto] ?? concepto, fila[1] as number];
      if (typeof fila[2] === 'number') celdas.push(`${fila[2]} %`);
      return celdas;
    });
  if (!filas.some((fila) => (fila[1] as number) > 0)) return null;
  const conTercera = filas.some((fila) => fila.length > 2);
  return {
    seccion: tabla.seccion,
    titulo: tabla.titulo,
    columnas: conTercera ? ['Concepto', 'Cantidad', 'Porcentaje'] : ['Concepto', 'Cantidad'],
    filas,
  };
}

type Datos = Parameters<typeof registrosDe>[0];

interface Fuentes {
  datos: Datos;
  indiceCentro: number | null;
  /** Tablas de salud visual, gabinete y tamizajes que la pantalla ya calculó. */
  tablasDePantalla?: TablaDePantalla[];
  insumos?: InsumoConsumido[];
  /** Resumen del módulo de incapacidades para el mismo periodo y centro, si aplica. */
  incapacidades?: ResumenIncapacidades | null;
}

/** Trabajadores por categoría de circunferencia de cintura. */
function contarCintura(registros: { categoriaCircunferenciaCintura?: string | null }[]) {
  const cuantos = (categoria: string) =>
    registros.filter((r) => r?.categoriaCircunferenciaCintura?.trim() === categoria).length;
  return { alto: cuantos('Alto Riesgo'), aumentado: cuantos('Riesgo Aumentado'), bajo: cuantos('Bajo Riesgo') };
}

/** Lo que se calcula una sola vez y usan tanto las tablas como los hallazgos. */
function calcular({ datos, indiceCentro }: Fuentes) {
  const de = (clave: string) => registrosDe(datos, indiceCentro, clave) as any[];
  const sexo = contarPorSexo(de('grupoEtario'));
  const imc = contarPorCategoriaIMCConPorcentaje(de('imc'));
  const tension = contarPorCategoriaTensionArterial(de('tensionArterial'));
  const cintura = contarCintura(de('circunferenciaCintura'));
  const cronicas = contarEnfermedadesCronicas(de('enfermedadesCronicas'));
  const antecedentes = contarAntecedentesReferidos(de('antecedentes'));
  const agentes = contarAgentesRiesgo(de('agentesRiesgo'));
  const aptitud = contarPorAptitudPuesto(de('aptitudes'));
  const diagnosticos = resumirDiagnosticos(de('diagnosticos') as DiagnosticoDeTablero[]);
  const consultas = de('consultas');
  return { sexo, imc, tension, cintura, cronicas, antecedentes, agentes, aptitud, diagnosticos, consultas };
}

const suma = (filas: [string, number, ...unknown[]][]) => filas.reduce((total, fila) => total + fila[1], 0);
const mayor = <T extends [string, number, ...unknown[]]>(filas: T[]): T | undefined =>
  filas.reduce<T | undefined>((mejor, fila) => (fila[1] > (mejor?.[1] ?? 0) ? fila : mejor), undefined);

export function tablasDelTablero(fuentes: Fuentes): TablaDeInforme[] {
  const c = calcular(fuentes);
  const tablas: (TablaDeInforme | null)[] = [];

  const totalSexo = c.sexo.Masculino + c.sexo.Femenino;
  if (totalSexo) {
    tablas.push({
      seccion: 'Población',
      titulo: 'Distribución por sexo',
      columnas: ['Sexo', 'Trabajadores', 'Porcentaje'],
      filas: [
        ['Hombres', c.sexo.Masculino, `${pct(c.sexo.Masculino, totalSexo)} %`],
        ['Mujeres', c.sexo.Femenino, `${pct(c.sexo.Femenino, totalSexo)} %`],
      ],
    });
  }
  if (suma(c.imc)) tablas.push(conPorcentaje('Salud física', 'Índice de masa corporal', 'Categoría', c.imc));
  const totalCintura = c.cintura.alto + c.cintura.aumentado + c.cintura.bajo;
  if (totalCintura) {
    tablas.push({
      seccion: 'Salud física',
      titulo: 'Circunferencia de cintura',
      columnas: ['Categoría', 'Trabajadores', 'Porcentaje'],
      filas: [
        ['Alto riesgo', c.cintura.alto, `${pct(c.cintura.alto, totalCintura)} %`],
        ['Riesgo aumentado', c.cintura.aumentado, `${pct(c.cintura.aumentado, totalCintura)} %`],
        ['Bajo riesgo', c.cintura.bajo, `${pct(c.cintura.bajo, totalCintura)} %`],
      ],
    });
  }
  if (suma(c.tension)) tablas.push(conPorcentaje('Salud física', 'Presión arterial', 'Categoría', c.tension));
  if (suma(c.cronicas)) {
    tablas.push(conPorcentaje('Antecedentes', 'Enfermedades crónicas', 'Antecedente', c.cronicas, etiquetasEnfermedades));
  }
  if (suma(c.antecedentes)) {
    tablas.push(
      conPorcentaje('Antecedentes', 'Antecedentes referidos', 'Antecedente', c.antecedentes, etiquetasAntecedentesReferidos),
    );
  }
  tablas.push(...tablasHabitos(registrosDe(fuentes.datos, fuentes.indiceCentro, 'habitos') as HabitosDeTablero[]));
  if (suma(c.agentes)) tablas.push(conPorcentaje('Exposición', 'Agentes de riesgo', 'Agente', c.agentes));

  for (const tabla of fuentes.tablasDePantalla ?? []) tablas.push(tablaDePantalla(tabla));

  const de = (clave: string) => registrosDe(fuentes.datos, fuentes.indiceCentro, clave);
  tablas.push(...tablasNordico(de('cuestionarioNordico') as NordicoDeTablero[]));
  tablas.push(...tablasSueno(de('suenoVigilia') as SuenoDeTablero[]));
  tablas.push(...tablasAntidoping(de('antidoping') as AntidopingDeTablero[]));
  tablas.push(...tablasCardiometabolico(de('cardiometabolico') as CardiometabolicoDeTablero[]));
  tablas.push(...tablasOtologica(de('otologica') as OtologicaDeTablero[]));

  if (suma(c.aptitud)) tablas.push(conPorcentaje('Aptitud', 'Aptitud al puesto', 'Resultado', c.aptitud));

  if (c.diagnosticos.total) {
    const fila = (conteo: { etiqueta: string; cantidad: number }): Celda[] => [
      conteo.etiqueta,
      conteo.cantidad,
      `${pct(conteo.cantidad, c.diagnosticos.total)} %`,
    ];
    tablas.push({
      seccion: 'Consultas',
      titulo: 'Diagnósticos de las consultas',
      columnas: ['Diagnóstico (CIE-10)', 'Registros', 'Porcentaje'],
      filas: c.diagnosticos.porCodigo.map(fila),
    });
    tablas.push({
      seccion: 'Consultas',
      titulo: 'Diagnósticos por grupo de enfermedades',
      columnas: ['Grupo', 'Registros', 'Porcentaje'],
      filas: c.diagnosticos.porCapitulo.map(fila),
    });
  }
  tablas.push(...tablasConsultas(c.consultas as ConsultaDeTablero[]));
  tablas.push(...tablasIncapacidades(fuentes.incapacidades));
  const meses = consultasPorMes(c.consultas.map((consulta) => consulta?.fechaNotaMedica));
  if (meses.length) {
    tablas.push({
      seccion: 'Consultas',
      titulo: 'Consultas por mes',
      columnas: ['Mes', 'Consultas'],
      filas: meses.map((mes) => [mes.etiqueta, mes.cantidad]),
    });
  }

  const insumos = (fuentes.insumos ?? []).filter((i) => i.consumo > 0 || i.bajas > 0);
  if (insumos.length) {
    tablas.push({
      seccion: 'Inventario',
      titulo: 'Consumo de insumos',
      columnas: ['Insumo', 'Unidad', 'Consumo', 'Administrado', 'Entregado', 'Bajas'],
      filas: insumos.map((i) => [i.nombre, i.unidad, i.consumo, i.administrado, i.entregado, i.bajas]),
    });
  }
  return tablas.filter((tabla): tabla is TablaDeInforme => !!tabla);
}

/**
 * Hallazgos redactados a partir de los datos. Solo dice lo que los datos
 * muestran; no interpreta causas ni recomienda.
 */
/** Cuántos antecedentes crónicos y cuántos grupos de diagnósticos se mencionan. */
const ANTECEDENTES_EN_HALLAZGOS = 5;
/** Los de mayor peso para la aptitud y el riesgo cardiovascular de una plantilla. */
const ANTECEDENTES_FIJOS = ['hipertensivosPP', 'diabeticosPP', 'cardiopaticosPP'];
/** El padecimiento, no el adjetivo de la tabla («hipertensivos»). */
const NOMBRE_DE_ANTECEDENTE: Record<string, string> = {
  diabeticosPP: 'diabetes',
  hipertensivosPP: 'hipertensión',
  cardiopaticosPP: 'cardiopatía',
  epilepticosPP: 'epilepsia',
  respiratorios: 'enfermedad respiratoria',
  alergicos: 'alergias',
};
const GRUPOS_EN_HALLAZGOS = 3;

export function hallazgosDelTablero(fuentes: Fuentes): string[] {
  const c = calcular(fuentes);
  const hallazgos: string[] = [];

  const evaluadosIMC = suma(c.imc);
  if (evaluadosIMC) {
    const exceso = c.imc.filter(([categoria]) => /sobrepeso|obesidad/i.test(categoria));
    hallazgos.push(
      `${pct(suma(exceso), evaluadosIMC)} % de los trabajadores con exploración física tiene sobrepeso u obesidad (${suma(exceso)} de ${evaluadosIMC}).`,
    );
  }
  const evaluadosTension = suma(c.tension);
  if (evaluadosTension) {
    const elevada = c.tension.filter(([categoria]) => /^alta$|hipertensi/i.test(categoria));
    hallazgos.push(
      `${pct(suma(elevada), evaluadosTension)} % presentó presión arterial alta o en rango de hipertensión (${suma(elevada)} de ${evaluadosTension}).`,
    );
  }
  const totalCintura = c.cintura.alto + c.cintura.aumentado + c.cintura.bajo;
  if (totalCintura && c.cintura.alto) {
    hallazgos.push(
      `${pct(c.cintura.alto, totalCintura)} % tiene circunferencia de cintura de alto riesgo (${c.cintura.alto} de ${totalCintura}).`,
    );
  }
  // Hipertensión, diabetes y cardiopatía siempre, aunque nadie las refiera; después,
  // los demás antecedentes crónicos presentes, del más al menos frecuente
  const siempre = ANTECEDENTES_FIJOS.map((clave) => c.cronicas.find((fila) => fila[0] === clave)).filter(
    (fila): fila is [string, number, number] => !!fila,
  );
  const demas = c.cronicas
    .filter((fila) => !ANTECEDENTES_FIJOS.includes(fila[0]) && fila[1] > 0)
    .sort((a, b) => b[1] - a[1]);
  // Sin historias clínicas en el periodo no hay nada que afirmar, ni siquiera un cero
  const hayHistorias = registrosDe(fuentes.datos, fuentes.indiceCentro, 'enfermedadesCronicas').length > 0;
  const cronicas = hayHistorias ? [...siempre, ...demas] : [];
  if (cronicas.length) {
    hallazgos.push(
      `Antecedentes crónicos referidos en la historia clínica: ${cronicas
        .slice(0, ANTECEDENTES_EN_HALLAZGOS)
        .map((fila) => `${NOMBRE_DE_ANTECEDENTE[fila[0]] ?? (etiquetasEnfermedades[fila[0]] ?? fila[0]).toLowerCase()} ${fila[1]} (${fila[2]} %)`)
        .join(', ')}.`,
    );
  }
  const lumbalgia = c.antecedentes.find(([clave]) => clave === 'lumbalgias');
  if (lumbalgia && lumbalgia[1] > 0) {
    hallazgos.push(
      `${plural(lumbalgia[1], 'trabajador refiere', 'trabajadores refieren')} antecedente de lumbalgia (${lumbalgia[2]} %).`,
    );
  }
  const agente = mayor(c.agentes);
  if (agente) {
    hallazgos.push(
      `El agente de riesgo con más trabajadores expuestos es ${agente[0].toLowerCase()}: ${plural(agente[1], 'trabajador', 'trabajadores')} (${agente[2]} % de la plantilla).`,
    );
  }
  // La aptitud no lleva hallazgo: su tabla ya lo dice
  const de = (clave: string) => registrosDe(fuentes.datos, fuentes.indiceCentro, clave);
  hallazgos.push(...hallazgosNordico(de('cuestionarioNordico') as NordicoDeTablero[]));
  hallazgos.push(...hallazgosSueno(de('suenoVigilia') as SuenoDeTablero[]));
  hallazgos.push(...hallazgosHabitos(de('habitos') as HabitosDeTablero[]));
  hallazgos.push(...hallazgosAntidoping(de('antidoping') as AntidopingDeTablero[]));
  hallazgos.push(...hallazgosCardiometabolico(de('cardiometabolico') as CardiometabolicoDeTablero[]));
  hallazgos.push(...hallazgosOtologica(de('otologica') as OtologicaDeTablero[]));
  hallazgos.push(...hallazgosIncapacidades(fuentes.incapacidades));
  if (c.consultas.length) {
    const principal = c.diagnosticos.porCodigo[0];
    const grupos = c.diagnosticos.porCapitulo.slice(0, GRUPOS_EN_HALLAZGOS);
    hallazgos.push(
      `Se registraron ${plural(c.consultas.length, 'consulta médica', 'consultas médicas')}` +
        (principal
          ? `. ${grupos.length === 1 ? 'El grupo de enfermedades más frecuente fue' : 'Los grupos de enfermedades más frecuentes fueron'} ${grupos
              .map((grupo) => `${grupo.etiqueta.toLowerCase()} (${pct(grupo.cantidad, c.diagnosticos.total)} %)`)
              .join(', ')}; el diagnóstico más frecuente, ${principal.etiqueta} (${plural(principal.cantidad, 'registro', 'registros')}).`
          : '.'),
    );
  }
  const insumo = [...(fuentes.insumos ?? [])].sort((a, b) => b.consumo - a.consumo)[0];
  if (insumo && insumo.consumo > 0) {
    hallazgos.push(`El insumo más consumido fue ${insumo.nombre}: ${insumo.consumo} (${insumo.unidad}).`);
  }
  return hallazgos;
}

export function armarInforme(
  fuentes: Fuentes & { conFiltros: boolean },
  contexto: Pick<
    InformeDeTablero,
    | 'empresa'
    | 'centro'
    | 'periodo'
    | 'segmento'
    | 'responsable'
    | 'logo'
    | 'fecha'
    | 'conclusiones'
    | 'recomendaciones'
    | 'recomendacionesTabla'
    | 'comparativo'
    | 'porCentro'
  >,
): InformeDeTablero {
  return {
    ...contexto,
    cifras: cifrasClave(fuentes.datos, fuentes.indiceCentro, fuentes.conFiltros),
    hallazgos: hallazgosDelTablero(fuentes),
    tablas: tablasDelTablero(fuentes),
  };
}

// ---- Excel

export interface HojaDeInforme {
  nombre: string;
  filas: Celda[][];
}

export function hojasDeExcel(informe: InformeDeTablero): HojaDeInforme[] {
  const resumen: Celda[][] = [
    ['Estadísticas de salud'],
    ['Empresa', informe.empresa],
    ['Centro de trabajo', informe.centro],
    ['Periodo', informe.periodo],
    ...(informe.segmento ? [['Trabajadores incluidos', informe.segmento] as Celda[]] : []),
    ['Generado', informe.fecha],
    [],
    ...informe.cifras.map((cifra): Celda[] => [cifra.titulo, Number(cifra.valor), cifra.detalle]),
    [],
    ['Hallazgos'],
    ...informe.hallazgos.map((hallazgo): Celda[] => [hallazgo]),
  ];

  const hojas: HojaDeInforme[] = [{ nombre: 'Resumen', filas: resumen }];
  if (informe.comparativo) {
    hojas.push({
      nombre: 'Comparativo',
      filas: [[informe.comparativo.titulo], informe.comparativo.columnas, ...informe.comparativo.filas],
    });
  }
  if (informe.porCentro) {
    hojas.push({
      nombre: 'Por centro',
      filas: [[informe.porCentro.titulo], informe.porCentro.columnas, ...informe.porCentro.filas],
    });
  }
  for (const tabla of informe.tablas) {
    let hoja = hojas.find((h) => h.nombre === tabla.seccion);
    if (!hoja) {
      hoja = { nombre: tabla.seccion, filas: [] };
      hojas.push(hoja);
    }
    if (hoja.filas.length) hoja.filas.push([]);
    hoja.filas.push([tabla.titulo], tabla.columnas, ...tabla.filas);
  }
  return hojas;
}

/**
 * Celda para SheetJS: los porcentajes («35 %») van como número con formato de
 * porcentaje, para que en Excel se puedan ordenar, sumar o graficar. Lo demás, igual.
 */
export function celdaDeExcel(celda: Celda): Celda | { t: 'n'; v: number; z: string } {
  const porcentaje = typeof celda === 'string' ? celda.match(/^(-?\d+(?:\.\d+)?) ?%$/) : null;
  if (!porcentaje) return celda;
  return { t: 'n', v: Number(porcentaje[1]) / 100, z: porcentaje[1].includes('.') ? '0.0%' : '0%' };
}

const sinEspacios = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** «Periodo del 1/1/2026 al 31/10/2026» → «1-1-2026_a_31-10-2026»; vacío si no hay periodo. */
const periodoParaArchivo = (periodo: string) => {
  const fechas = periodo.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}).*?(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return fechas ? `${fechas.slice(1, 4).join('-')}_a_${fechas.slice(4, 7).join('-')}` : '';
};

/**
 * Empresa, centro (si no es toda la empresa) y periodo, para que los informes de
 * distintos centros o periodos no se descarguen con el mismo nombre. Sin periodo
 * (todos los registros), la fecha de hoy.
 */
export const nombreDeArchivo = (
  prefijo: string,
  informe: Pick<InformeDeTablero, 'empresa' | 'centro' | 'periodo'>,
  hoy: string,
  extension: string,
) =>
  [
    prefijo,
    sinEspacios(informe.empresa) || 'Empresa',
    informe.centro && informe.centro !== 'Todos' ? sinEspacios(informe.centro) : '',
    periodoParaArchivo(informe.periodo) || hoy,
  ]
    .filter(Boolean)
    .join('_') + `.${extension}`;

// ---- Resumen para dirección e informes temáticos (pdfmake)

/** Tablas que entran al resumen; el resto queda para el informe completo y el Excel. */
const TABLAS_DEL_RESUMEN = ['Aptitud al puesto', 'Diagnósticos de las consultas', 'Agentes de riesgo'];
const FILAS_POR_TABLA_EN_RESUMEN = 8;
const FILAS_POR_TABLA_EN_TEMATICO = 25;
export const TITULO_DEL_RESUMEN = 'Resumen de salud laboral para dirección';

export function definicionResumenEjecutivo(
  informe: InformeDeTablero,
  opciones: {
    /** Título del documento; por defecto, el del resumen para dirección. */
    titulo?: string;
    /** Incluye todas las tablas del informe, completas, en lugar de las principales. */
    todasLasTablas?: boolean;
    /** Quién dibuja las gráficas principales; sin él, el informe sale sin gráficas. */
    dibujar?: DibujarGrafica;
  } = {},
): Record<string, any> {
  const ficha = [
    ['Centro de trabajo', informe.centro],
    ['Periodo', informe.periodo],
    ...(informe.segmento ? [['Trabajadores incluidos', informe.segmento]] : []),
    ...(informe.responsable ? [['Responsable médico', informe.responsable]] : []),
    ['Fecha', informe.fecha],
  ];

  const limiteDeFilas = opciones.todasLasTablas ? FILAS_POR_TABLA_EN_TEMATICO : FILAS_POR_TABLA_EN_RESUMEN;
  const tablas = [
    ...(informe.comparativo ? [informe.comparativo] : []),
    ...informe.tablas.filter((tabla) => opciones.todasLasTablas || TABLAS_DEL_RESUMEN.includes(tabla.titulo)),
  ]
    .flatMap((tabla) => [
      { text: tabla.titulo, style: 'subtitulo' },
      {
        table: {
          headerRows: 1,
          widths: ['*', ...tabla.columnas.slice(1).map(() => 'auto')],
          body: [
            tabla.columnas.map((columna) => ({ text: columna, style: 'encabezado' })),
            ...tabla.filas
              .slice(0, limiteDeFilas)
              .map((fila) => fila.map((celda, i) => ({ text: String(celda), alignment: i ? 'right' : 'left' }))),
          ],
        },
        layout: 'lightHorizontalLines',
        fontSize: 9,
      },
      // Nunca se recorta en silencio: se dice cuántas filas quedaron fuera y dónde verlas
      ...(tabla.filas.length > limiteDeFilas
        ? [
            {
              text: `Se muestran ${limiteDeFilas} de ${tabla.filas.length} filas. La tabla completa está en «Tablas en Excel».`,
              fontSize: 7.5,
              italics: true,
              color: '#6b7280',
              margin: [0, 2, 0, 0],
            },
          ]
        : []),
    ]);

  const recomendaciones = informe.recomendacionesTabla.length
    ? [
        { text: 'Recomendaciones', style: 'subtitulo' },
        {
          table: {
            headerRows: 1,
            widths: ['*', '*'],
            body: [
              [
                { text: 'Hallazgo', style: 'encabezado' },
                { text: 'Medida preventiva', style: 'encabezado' },
              ],
              ...informe.recomendacionesTabla.map((r) => [r.hallazgo ?? '', r.medidaPreventiva ?? '']),
            ],
          },
          layout: 'lightHorizontalLines',
          fontSize: 9,
        },
      ]
    : informe.recomendaciones
      ? [
          { text: 'Recomendaciones', style: 'subtitulo' },
          { text: informe.recomendaciones, style: 'parrafo' },
        ]
      : [];

  const graficas = contenidoDeGraficas(informe.graficas ?? [], opciones.dibujar);
  const conGraficas = graficas.length > 0;

  // Cada hoja dice de quién es y qué página es: los temáticos suelen pasar de una
  const deQuien = informe.centro && informe.centro !== 'Todos' ? `${informe.empresa} · ${informe.centro}` : informe.empresa;

  return {
    pageSize: 'LETTER',
    pageMargins: [48, 48, 48, 54],
    footer: (pagina: number, paginas: number) => ({
      columns: [
        { text: `${opciones.titulo ?? TITULO_DEL_RESUMEN} · ${deQuien}` },
        { text: `Página ${pagina} de ${paginas}`, alignment: 'right', width: 'auto' },
      ],
      fontSize: 7.5,
      color: '#6b7280',
      margin: [48, 20, 48, 0],
    }),
    content: [
      // Con logo, a la derecha del título, como en el informe completo
      {
        columns: [
          {
            width: '*',
            stack: [
              { text: opciones.titulo ?? TITULO_DEL_RESUMEN, style: 'titulo' },
              { text: informe.empresa, style: 'empresa' },
            ],
          },
          ...(informe.logo?.startsWith('data:image/')
            ? [{ width: 'auto', image: informe.logo, fit: [90, 45], alignment: 'right' }]
            : []),
        ],
        columnGap: 12,
      },
      {
        table: { widths: ['auto', '*'], body: ficha.map(([dato, valor]) => [{ text: dato, bold: true }, valor]) },
        layout: 'noBorders',
        fontSize: 9,
        margin: [0, 6, 0, 10],
      },
      {
        columns: informe.cifras.map((cifra) => ({
          stack: [
            { text: cifra.valor, style: 'cifra' },
            { text: cifra.titulo, fontSize: 8, bold: true },
            { text: cifra.detalle, fontSize: 7, color: '#6b7280' },
          ],
          alignment: 'center',
        })),
        columnGap: 8,
        margin: [0, 0, 0, 8],
      },
      ...graficas,
      // Con gráficas, los hallazgos no se parten: si no caben junto a ellas, pasan completos a la página siguiente
      {
        unbreakable: conGraficas,
        stack: [
          { text: 'Hallazgos principales', style: 'subtitulo' },
          informe.hallazgos.length
            ? { ul: informe.hallazgos, style: 'parrafo' }
            : { text: 'No hay registros suficientes en el periodo para describir hallazgos.', style: 'parrafo' },
        ],
      },
      ...(conGraficas ? [] : tablas),
      ...(isHtmlContentEmpty(informe.conclusiones)
        ? []
        : [{ text: 'Conclusiones', style: 'subtitulo' }, ...htmlToPdfMakeContent(informe.conclusiones)]),
      ...recomendaciones,
      // Con gráficas, el detalle va al final: la primera parte se lee como presentación de resultados
      ...(conGraficas && tablas.length
        ? [
            { text: 'Anexo: tablas de detalle', style: 'titulo', fontSize: 13, pageBreak: 'before', margin: [0, 0, 0, 2] },
            {
              text: 'Las cifras de las gráficas y los hallazgos, completas y con todas sus categorías.',
              fontSize: 8.5,
              color: '#6b7280',
            },
            ...tablas,
          ]
        : []),
      {
        text: 'Los hallazgos se redactan automáticamente a partir de los registros del periodo; describen los datos y no sustituyen la valoración del responsable médico.',
        fontSize: 7,
        italics: true,
        color: '#6b7280',
        margin: [0, 14, 0, 0],
      },
    ],
    styles: {
      titulo: { fontSize: 16, bold: true, color: '#047857' },
      empresa: { fontSize: 12, bold: true, margin: [0, 2, 0, 0] },
      subtitulo: { fontSize: 11, bold: true, color: '#047857', margin: [0, 10, 0, 4] },
      encabezado: { bold: true, fillColor: '#ecfdf5' },
      cifra: { fontSize: 18, bold: true, color: '#111827' },
      parrafo: { fontSize: 9.5, lineHeight: 1.25 },
      // Estilo que usa el texto con formato de las conclusiones
      textoNormal: { fontSize: 9.5, lineHeight: 1.25 },
      // Título de una gráfica sin titular (como en el informe completo)
      subtituloTabla: { fontSize: 11, bold: true, color: '#047857' },
    },
    defaultStyle: { fontSize: 9.5 },
  };
}
