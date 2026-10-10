/**
 * Informe de incapacidades de una empresa: tipos de lo que entrega el servidor
 * (calcularInforme en backend/src/modules/incapacidades/incapacidades-informe.util.ts),
 * periodos, textos y el contenido del archivo de Excel.
 */
import * as xlsx from 'xlsx';
import { formatNombreCompleto } from './formatNombreCompleto';
import {
  GRUPOS_DIAGNOSTICO,
  RAMOS,
  REGIONES_ANATOMICAS,
  TIPOS_RIESGO,
  fechaCorta,
  soloFecha,
  sumarDias,
  textoDe,
  type DesgloseDias,
  type Opcion,
} from './incapacidades';
import type { TrabajadorDePanel } from './incapacidadesPanel';

export interface Agrupado {
  clave: string;
  casos: number;
  dias: number;
}

export interface InformeIncapacidades {
  periodo: { desde: string; hasta: string; dias: number };
  trabajadoresActivos: number;
  totales: {
    casosNuevos: number;
    casosPorRamo: Record<string, number>;
    riesgosPorTipo: Record<string, number>;
    dias: DesgloseDias;
    diasPorRamo: Record<string, number>;
    casosConDias: number;
    trabajadoresConIncapacidad: number;
    recaidas: number;
    incapacidadesPermanentes: number;
    defunciones: number;
  };
  indicadores: {
    tasaAusentismo: number | null;
    indiceFrecuencia: number | null;
    indiceGravedad: number | null;
    duracionMedia: number | null;
  };
  tendencias: {
    porGrupoDiagnostico: Agrupado[];
    porRegionAnatomica: Agrupado[];
    porPuesto: Agrupado[];
    porCentro: (Agrupado & { trabajadoresActivos: number })[];
    porMes: { mes: string; casos: number; dias: number }[];
    /** Casos nuevos por día de la semana de inicio; 0 = domingo. */
    porDiaSemana: number[];
    regionPorPuesto: { region: string; puesto: string; casos: number }[];
  };
  porTrabajador: {
    idTrabajador: string;
    casos: number;
    dias: number;
    diasPorRamo: Record<string, number>;
    ultimaIncapacidad: string | null;
  }[];
  centros: { _id: string; nombreCentro: string }[];
  trabajadores: TrabajadorDePanel[];
  /** Falso cuando el usuario no puede ver de qué se enferman los trabajadores. */
  conDiagnosticos: boolean;
}

// ---- Periodos

export type PeriodoDeInforme =
  | 'esteMes'
  | 'esteAnio'
  | 'ultimos12Meses'
  | 'anioAnterior'
  | 'personalizado';

export const PERIODOS_DE_INFORME: Opcion<PeriodoDeInforme>[] = [
  { valor: 'esteMes', texto: 'Este mes' },
  { valor: 'esteAnio', texto: 'Este año' },
  { valor: 'ultimos12Meses', texto: 'Últimos 12 meses' },
  { valor: 'anioAnterior', texto: 'Año anterior' },
  { valor: 'personalizado', texto: 'Otro periodo' },
];

/** Fechas (AAAA-MM-DD) de un periodo predefinido; `hoy` también como AAAA-MM-DD. */
export function fechasDePeriodo(
  periodo: Exclude<PeriodoDeInforme, 'personalizado'>,
  hoy: string,
): { desde: string; hasta: string } {
  const anio = Number(hoy.slice(0, 4));
  if (periodo === 'esteMes') return { desde: `${hoy.slice(0, 7)}-01`, hasta: hoy };
  if (periodo === 'esteAnio') return { desde: `${anio}-01-01`, hasta: hoy };
  if (periodo === 'anioAnterior') return { desde: `${anio - 1}-01-01`, hasta: `${anio - 1}-12-31` };
  return { desde: sumarDias(hoy, -364), hasta: hoy };
}

// ---- Textos

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-03` → `mar 2026`. */
export function textoDeMes(mes: string): string {
  const [anio, numero] = mes.split('-');
  return `${MESES[Number(numero) - 1] ?? numero} ${anio}`;
}

/** De lunes a domingo, con el índice que usa el servidor (0 = domingo). */
export const DIAS_DE_LA_SEMANA: { indice: number; texto: string; corto: string }[] = [
  { indice: 1, texto: 'Lunes', corto: 'Lun' },
  { indice: 2, texto: 'Martes', corto: 'Mar' },
  { indice: 3, texto: 'Miércoles', corto: 'Mié' },
  { indice: 4, texto: 'Jueves', corto: 'Jue' },
  { indice: 5, texto: 'Viernes', corto: 'Vie' },
  { indice: 6, texto: 'Sábado', corto: 'Sáb' },
  { indice: 0, texto: 'Domingo', corto: 'Dom' },
];

const SIN_DATO = 'sinDato';

/** Texto de la clave de un catálogo; «Sin especificar» si el caso no lo tenía. */
export function textoDeClave(opciones: Opcion[] | null, clave: string): string {
  if (clave === SIN_DATO) return 'Sin especificar';
  return (opciones && textoDe(opciones, clave)) || clave;
}

export const textoDeGrupo = (clave: string) => textoDeClave(GRUPOS_DIAGNOSTICO, clave);
export const textoDeRegion = (clave: string) => textoDeClave(REGIONES_ANATOMICAS, clave);
export const textoDeTipoRiesgo = (clave: string) => textoDeClave(TIPOS_RIESGO, clave);
export const textoDePuesto = (clave: string) => textoDeClave(null, clave);

export interface Indicador {
  clave: keyof InformeIncapacidades['indicadores'];
  texto: string;
  formula: string;
  unidad: string;
}

export const INDICADORES: Indicador[] = [
  {
    clave: 'tasaAusentismo',
    texto: 'Tasa de ausentismo',
    formula: 'Días de incapacidad ÷ (trabajadores activos × días del periodo) × 100',
    unidad: '%',
  },
  {
    clave: 'indiceFrecuencia',
    texto: 'Índice de frecuencia',
    formula: 'Casos nuevos ÷ trabajadores activos',
    unidad: 'casos por trabajador',
  },
  {
    clave: 'indiceGravedad',
    texto: 'Índice de gravedad',
    formula: 'Días de incapacidad ÷ trabajadores activos',
    unidad: 'días por trabajador',
  },
  {
    clave: 'duracionMedia',
    texto: 'Duración media',
    formula: 'Días de incapacidad ÷ casos con días en el periodo',
    unidad: 'días por caso',
  },
];

export const textoDeIndicador = (valor: number | null): string =>
  valor === null ? '—' : valor.toLocaleString('es-MX', { maximumFractionDigits: 2 });

// ---- Excel

type Celda = string | number;
export interface HojaDeInforme {
  nombre: string;
  filas: Celda[][];
}

/**
 * Contenido del informe para la empresa. No lleva diagnósticos ni grupos de
 * diagnóstico: es el archivo que sale del servicio médico.
 */
export function hojasDeInforme(
  informe: InformeIncapacidades,
  contexto: { empresa: string; centro: string },
): HojaDeInforme[] {
  const { totales, tendencias } = informe;
  const nombreDeCentro = new Map(informe.centros.map((c) => [c._id, c.nombreCentro]));
  const trabajadores = new Map(informe.trabajadores.map((t) => [t._id, t]));

  const resumen: Celda[][] = [
    ['Informe de incapacidades'],
    ['Empresa', contexto.empresa],
    ['Centro de trabajo', contexto.centro],
    ['Periodo', `${fechaCorta(informe.periodo.desde)} al ${fechaCorta(informe.periodo.hasta)}`],
    ['Trabajadores activos', informe.trabajadoresActivos],
    [],
    ['Casos nuevos', totales.casosNuevos],
    ...RAMOS.map((ramo): Celda[] => [`   ${ramo.texto}`, totales.casosPorRamo[ramo.valor] ?? 0]),
    [],
    ['Riesgos de trabajo por tipo'],
    ...TIPOS_RIESGO.map((tipo): Celda[] => [`   ${tipo.texto}`, totales.riesgosPorTipo[tipo.valor] ?? 0]),
    ['Recaídas', totales.recaidas],
    ['Incapacidades permanentes', totales.incapacidadesPermanentes],
    ['Defunciones', totales.defunciones],
    [],
    ['Días de incapacidad', totales.dias.total],
    ...RAMOS.map((ramo): Celda[] => [`   ${ramo.texto}`, totales.diasPorRamo[ramo.valor] ?? 0]),
    ['Días subsidiados por el IMSS', totales.dias.subsidiados],
    ['Días sin subsidio', totales.dias.sinSubsidio],
    ['Días a cargo de la empresa', totales.dias.aCargoEmpresa],
    ['Trabajadores con incapacidad', totales.trabajadoresConIncapacidad],
    [],
    ['Indicador', 'Valor', 'Unidad', 'Cálculo'],
    ...INDICADORES.map((indicador): Celda[] => [
      indicador.texto,
      informe.indicadores[indicador.clave] ?? '',
      indicador.unidad,
      indicador.formula,
    ]),
  ];

  const tabla = (titulo: string, filas: Agrupado[], texto: (clave: string) => string): Celda[][] => [
    [titulo, 'Casos nuevos', 'Días'],
    ...filas.map((fila): Celda[] => [texto(fila.clave), fila.casos, fila.dias]),
    [],
  ];

  const hojaTendencias: Celda[][] = [
    ...tabla('Región anatómica', tendencias.porRegionAnatomica, textoDeRegion),
    ...tabla('Puesto', tendencias.porPuesto, textoDePuesto),
    ...tabla('Centro de trabajo', tendencias.porCentro, (clave) => nombreDeCentro.get(clave) ?? clave),
    ['Día de la semana de inicio', 'Casos nuevos'],
    ...DIAS_DE_LA_SEMANA.map((dia): Celda[] => [dia.texto, tendencias.porDiaSemana[dia.indice] ?? 0]),
    [],
    ['Región anatómica', 'Puesto', 'Casos nuevos'],
    ...tendencias.regionPorPuesto.map((celda): Celda[] => [
      textoDeRegion(celda.region),
      textoDePuesto(celda.puesto),
      celda.casos,
    ]),
  ];

  const porMes: Celda[][] = [
    ['Mes', 'Casos nuevos', 'Días'],
    ...tendencias.porMes.map((mes): Celda[] => [textoDeMes(mes.mes), mes.casos, mes.dias]),
  ];

  const porTrabajador: Celda[][] = [
    ['Trabajador', 'Puesto', 'Centro de trabajo', 'Casos', 'Días', ...RAMOS.map((r) => `Días: ${r.texto}`), 'Última incapacidad'],
    ...informe.porTrabajador.map((fila): Celda[] => {
      const trabajador = trabajadores.get(fila.idTrabajador);
      return [
        trabajador ? formatNombreCompleto(trabajador as any) : '',
        trabajador?.puesto ?? '',
        (trabajador && nombreDeCentro.get(trabajador.idCentroTrabajo)) ?? '',
        fila.casos,
        fila.dias,
        ...RAMOS.map((ramo) => fila.diasPorRamo[ramo.valor] ?? 0),
        fechaCorta(fila.ultimaIncapacidad),
      ];
    }),
  ];

  return [
    { nombre: 'Resumen', filas: resumen },
    { nombre: 'Tendencias', filas: hojaTendencias },
    { nombre: 'Por mes', filas: porMes },
    { nombre: 'Por trabajador', filas: porTrabajador },
  ];
}

export function nombreDeArchivo(informe: InformeIncapacidades, empresa: string): string {
  const limpio = empresa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `Incapacidades_${limpio || 'empresa'}_${soloFecha(informe.periodo.desde)}_a_${soloFecha(informe.periodo.hasta)}.xlsx`;
}

export function exportarInformeExcel(
  informe: InformeIncapacidades,
  contexto: { empresa: string; centro: string },
): void {
  const libro = xlsx.utils.book_new();
  for (const hoja of hojasDeInforme(informe, contexto)) {
    const datos = xlsx.utils.aoa_to_sheet(hoja.filas);
    const columnas = Math.max(...hoja.filas.map((fila) => fila.length));
    datos['!cols'] = Array.from({ length: columnas }, (_, i) => ({
      wch: Math.min(
        60,
        Math.max(10, ...hoja.filas.map((fila) => String(fila[i] ?? '').length + 2)),
      ),
    }));
    xlsx.utils.book_append_sheet(libro, datos, hoja.nombre);
  }
  xlsx.writeFile(libro, nombreDeArchivo(informe, contexto.empresa));
}
