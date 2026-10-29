/**
 * Gráficas de las secciones nuevas del informe completo del tablero de salud
 * (hábitos, seguimiento cardiometabólico, antecedentes auditivos, Nórdico, sueño,
 * antidoping y diagnósticos). Son las mismas que muestra la pantalla, con sus
 * títulos y colores: dona para una proporción con su cifra clave, barras para
 * escalas y rankings, columnas para la evolución por mes.
 *
 * Lógica pura: describe cada gráfica y arma su configuración de Chart.js, con las
 * medidas en puntos del PDF. Quien genera el PDF la dibuja (helpers/exportChartImage).
 */
import type { ResumenAntidoping } from './dashboardAntidoping';
import type { Conteo, ResumenNordico, ResumenSueno } from './dashboardCuestionarios';
import type { ResumenDeDiagnosticos } from './dashboardDiagnosticos';
import type { ResumenHabitos } from './dashboardHabitos';
import type { ResumenCardiometabolico, ResumenOtologico } from './dashboardSeguimiento';

/** Los mismos colores que el tablero (ListaDeConteos y DonaConLeyenda). */
export const COLOR_DE_TONO = {
  neutro: '#4B5563',
  favorable: '#10B981',
  atencion: '#F59E0B',
  alerta: '#F97316',
  riesgo: '#DC2626',
  resto: '#D1D5DB',
} as const;

const TEXTO = '#374151';

export interface Segmento {
  etiqueta: string;
  cantidad: number;
  color: string;
}

export interface FilaDeBarras {
  etiqueta: string;
  cantidad: number;
  /** Contra qué se calcula el porcentaje de esta fila. */
  total: number;
  color: string;
}

export type GraficaDeInforme =
  | { tipo: 'dona'; titulo: string; segmentos: Segmento[]; total: number; nota?: string }
  | { tipo: 'barras'; titulo: string; filas: FilaDeBarras[]; nota?: string }
  | {
      tipo: 'columnas';
      titulo: string;
      etiquetas: string[];
      series: { etiqueta: string; valores: number[]; color: string }[];
      nota?: string;
    };

/** Filas por gráfica de barras; el resto queda en la tabla que la acompaña. */
export const FILAS_POR_GRAFICA = 10;

const pct = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);
const cantidadDe = (conteos: Conteo[], clave: string) => conteos.find((c) => c.clave === clave)?.cantidad ?? 0;

const barras = (
  titulo: string,
  conteos: (Conteo & { evaluados?: number })[],
  total: number | null,
  color: string,
  nota?: string,
): GraficaDeInforme | null => {
  const filas = conteos
    .filter((c) => c.cantidad > 0)
    .slice(0, FILAS_POR_GRAFICA)
    .map((c) => ({ etiqueta: c.etiqueta, cantidad: c.cantidad, total: total ?? c.evaluados ?? 0, color }));
  return filas.length ? { tipo: 'barras', titulo, filas, ...(nota ? { nota } : {}) } : null;
};

const dona = (titulo: string, segmentos: Segmento[], nota?: string): GraficaDeInforme | null => {
  const total = segmentos.reduce((suma, s) => suma + s.cantidad, 0);
  return total > 0 ? { tipo: 'dona', titulo, segmentos, total, ...(nota ? { nota } : {}) } : null;
};

const sinVacias = (graficas: (GraficaDeInforme | null)[]) =>
  graficas.filter((grafica): grafica is GraficaDeInforme => !!grafica);

export const graficasHabitos = (r: ResumenHabitos) =>
  sinVacias([
    barras(
      'Hábitos de riesgo referidos',
      r.habitos,
      null,
      COLOR_DE_TONO.atencion,
      'Cada hábito, sobre quienes contestaron esa pregunta.',
    ),
  ]);

export const graficasCardiometabolico = (r: ResumenCardiometabolico) =>
  sinVacias([
    barras(
      'Condiciones en seguimiento',
      r.condiciones,
      r.enSeguimiento,
      COLOR_DE_TONO.neutro,
      'Un trabajador puede tener más de una condición.',
    ),
    barras(
      'Laboratorio fuera de meta',
      r.laboratorio,
      null,
      COLOR_DE_TONO.atencion,
      'Sobre quienes tienen un resultado valorable de cada estudio en su última visita.',
    ),
  ]);

export const graficasOtologica = (r: ResumenOtologico) =>
  sinVacias([
    dona(
      'Uso de protección auditiva',
      [
        { etiqueta: 'Nunca', cantidad: cantidadDe(r.proteccion, 'NUNCA'), color: COLOR_DE_TONO.riesgo },
        { etiqueta: 'A veces', cantidad: cantidadDe(r.proteccion, 'A VECES'), color: COLOR_DE_TONO.atencion },
        { etiqueta: 'Siempre', cantidad: cantidadDe(r.proteccion, 'SIEMPRE'), color: COLOR_DE_TONO.favorable },
      ],
      'Entre quienes dijeron trabajar en ambientes ruidosos.',
    ),
    barras(
      'Síntomas y exposición referidos',
      r.respuestas,
      null,
      COLOR_DE_TONO.atencion,
      'Cada respuesta, sobre quienes la contestaron.',
    ),
  ]);

export const graficasNordico = (r: ResumenNordico) =>
  sinVacias([
    dona('Resultado del cuestionario', [
      { etiqueta: 'Requieren seguimiento', cantidad: cantidadDe(r.semaforo, 'rojo'), color: COLOR_DE_TONO.riesgo },
      { etiqueta: 'Con molestias', cantidad: cantidadDe(r.semaforo, 'amarillo'), color: COLOR_DE_TONO.atencion },
      { etiqueta: 'Sin molestias', cantidad: cantidadDe(r.semaforo, 'verde'), color: COLOR_DE_TONO.resto },
    ]),
    barras(
      'Zonas con molestia en los últimos 12 meses',
      r.zonas12Meses,
      r.evaluados,
      COLOR_DE_TONO.neutro,
      'Un trabajador puede reportar varias zonas, así que los porcentajes no suman 100 %.',
    ),
  ]);

export const graficasSueno = (r: ResumenSueno) =>
  sinVacias([
    dona('Nivel general', [
      { etiqueta: 'Frecuente', cantidad: cantidadDe(r.prioridad, 'rojo'), color: COLOR_DE_TONO.riesgo },
      { etiqueta: 'Semanal', cantidad: cantidadDe(r.prioridad, 'naranja'), color: COLOR_DE_TONO.alerta },
      { etiqueta: 'Ocasional', cantidad: cantidadDe(r.prioridad, 'amarillo'), color: COLOR_DE_TONO.atencion },
      { etiqueta: 'Sin síntomas', cantidad: cantidadDe(r.prioridad, 'verde'), color: COLOR_DE_TONO.resto },
    ]),
    barras(
      'Síntomas semanales o frecuentes por área',
      r.areas,
      null,
      COLOR_DE_TONO.alerta,
      'De los evaluados en cada área.',
    ),
  ]);

export const graficasAntidoping = (r: ResumenAntidoping) =>
  sinVacias([
    dona('Pruebas con algún positivo', [
      { etiqueta: 'Con algún positivo', cantidad: r.pruebasPositivas, color: COLOR_DE_TONO.riesgo },
      { etiqueta: 'Negativas', cantidad: r.pruebas - r.pruebasPositivas, color: COLOR_DE_TONO.resto },
    ]),
    barras('Positivos por sustancia', r.porSustancia, r.pruebas, COLOR_DE_TONO.riesgo, 'Sobre el total de pruebas.'),
    r.porMes.length > 1
      ? {
          tipo: 'columnas',
          titulo: 'Pruebas por mes',
          etiquetas: r.porMes.map((mes) => mes.etiqueta),
          series: [
            { etiqueta: 'Con algún positivo', valores: r.porMes.map((mes) => mes.positivas), color: COLOR_DE_TONO.riesgo },
            {
              etiqueta: 'Negativas',
              valores: r.porMes.map((mes) => mes.pruebas - mes.positivas),
              color: COLOR_DE_TONO.resto,
            },
          ],
        }
      : null,
  ]);

export const graficasDiagnosticos = (r: ResumenDeDiagnosticos) =>
  r.total > 0
    ? sinVacias([
        barras(
          // La tabla que sigue se llama «Diagnósticos por grupo de enfermedades»
          'Grupos de enfermedades más frecuentes',
          r.porCapitulo,
          r.total,
          COLOR_DE_TONO.neutro,
          r.porCapitulo.length > FILAS_POR_GRAFICA
            ? `Los ${FILAS_POR_GRAFICA} grupos más frecuentes; todos están en la tabla.`
            : undefined,
        ),
      ])
    : [];

// ---- Medidas y configuración de Chart.js (en puntos del PDF)

export const ANCHO_DE_BARRAS = 460;
export const LADO_DE_DONA = 120;
const ALTO_POR_FILA = 20;
/** Lo que agrega una etiqueta partida en dos líneas. */
const ALTO_POR_LINEA_EXTRA = 9;
const ALTO_DE_COLUMNAS = 170;

/** Ancho y alto con que la gráfica se dibuja y se coloca en el PDF. */
export function medidasDe(grafica: GraficaDeInforme): [number, number] {
  if (grafica.tipo === 'dona') return [LADO_DE_DONA, LADO_DE_DONA];
  if (grafica.tipo === 'columnas') return [ANCHO_DE_BARRAS, ALTO_DE_COLUMNAS];
  const lineasExtra = grafica.filas.filter((fila) => Array.isArray(partirEtiqueta(fila.etiqueta))).length;
  return [ANCHO_DE_BARRAS, grafica.filas.length * ALTO_POR_FILA + lineasExtra * ALTO_POR_LINEA_EXTRA + 8];
}

/** Etiquetas largas (capítulos de la CIE-10) en dos líneas como máximo. */
export function partirEtiqueta(texto: string, maximo = 42): string | string[] {
  if (texto.length <= maximo) return texto;
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(' ')) {
    if (actual && `${actual} ${palabra}`.length > maximo) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = actual ? `${actual} ${palabra}` : palabra;
    }
  }
  lineas.push(actual);
  if (lineas.length <= 2) return lineas;
  const segunda = lineas.slice(1).join(' ');
  return [lineas[0], `${segunda.slice(0, maximo - 1).trimEnd()}…`];
}

export function configDeGrafica(grafica: GraficaDeInforme): Record<string, any> {
  const sinTooltip = { legend: { display: false }, tooltip: { enabled: false } };

  if (grafica.tipo === 'dona') {
    return {
      type: 'doughnut',
      data: {
        labels: grafica.segmentos.map((s) => s.etiqueta),
        datasets: [
          {
            data: grafica.segmentos.map((s) => s.cantidad),
            backgroundColor: grafica.segmentos.map((s) => s.color),
            borderColor: '#ffffff',
            borderWidth: 1,
          },
        ],
      },
      options: {
        cutout: '58%',
        plugins: {
          ...sinTooltip,
          datalabels: {
            color: '#ffffff',
            font: { size: 8, weight: 'bold' },
            // Solo en las porciones con espacio para el número
            display: (contexto: any) => pct(contexto.dataset.data[contexto.dataIndex], grafica.total) >= 8,
            formatter: (valor: number) => `${pct(valor, grafica.total)} %`,
          },
        },
      },
    };
  }

  if (grafica.tipo === 'columnas') {
    return {
      type: 'bar',
      data: {
        labels: grafica.etiquetas,
        datasets: grafica.series.map((serie) => ({
          label: serie.etiqueta,
          data: serie.valores,
          backgroundColor: serie.color,
          maxBarThickness: 28,
        })),
      },
      options: {
        layout: { padding: { top: 12 } },
        plugins: {
          ...sinTooltip,
          datalabels: {
            color: TEXTO,
            anchor: 'end',
            align: 'end',
            font: { size: 7.5, weight: 'bold' },
            // El total del mes, encima de la columna
            display: (contexto: any) => contexto.datasetIndex === contexto.chart.data.datasets.length - 1,
            formatter: (_valor: number, contexto: any) =>
              contexto.chart.data.datasets.reduce((suma: number, d: any) => suma + (d.data[contexto.dataIndex] ?? 0), 0),
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: TEXTO, font: { size: 8 } } },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: '#E5E7EB' },
            border: { display: false },
            ticks: { color: TEXTO, font: { size: 7.5 }, precision: 0 },
          },
        },
      },
    };
  }

  const filas = grafica.filas;
  return {
    type: 'bar',
    data: {
      labels: filas.map((fila) => partirEtiqueta(fila.etiqueta)),
      datasets: [
        {
          data: filas.map((fila) => fila.cantidad),
          backgroundColor: filas.map((fila) => fila.color),
          borderRadius: 2,
          maxBarThickness: 12,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      // Espacio a la derecha para «12 (35 %)»
      layout: { padding: { right: 56 } },
      plugins: {
        ...sinTooltip,
        datalabels: {
          color: TEXTO,
          anchor: 'end',
          align: 'end',
          font: { size: 8, weight: 'bold' },
          formatter: (valor: number, contexto: any) => `${valor} (${pct(valor, filas[contexto.dataIndex].total)} %)`,
        },
      },
      scales: {
        x: { display: false, beginAtZero: true },
        // Todas las etiquetas: sin autoSkip, Chart.js omite las que cree que no caben
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: TEXTO, font: { size: 8.5 }, autoSkip: false },
        },
      },
    },
  };
}
