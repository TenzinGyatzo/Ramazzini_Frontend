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
import type { FilaDeCobertura } from './dashboardCobertura';
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
  /** El porcentaje que ya trae la tabla, si se calculó sobre otra base; manda sobre `total`. */
  porcentaje?: number;
  color: string;
}

interface Comun {
  titulo: string;
  /** Para presentar resultados: la conclusión en una frase («41 % tiene sobrepeso u obesidad»). */
  titular?: string;
  nota?: string;
}

export type GraficaDeInforme =
  | (Comun & { tipo: 'dona'; segmentos: Segmento[]; total: number })
  | (Comun & { tipo: 'barras'; filas: FilaDeBarras[] })
  | (Comun & { tipo: 'columnas'; etiquetas: string[]; series: { etiqueta: string; valores: number[]; color: string }[] });

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

/**
 * Colores de las categorías que tienen escala, los mismos que las gráficas del
 * tablero: verde lo favorable, ámbar atención, naranja y rojos el riesgo creciente.
 */
const COLOR_DE_CATEGORIA: Record<string, string> = {
  // Índice de masa corporal
  'Bajo peso': '#F59E0B',
  Normal: '#10B981',
  Sobrepeso: '#F59E0B',
  'Obesidad clase I': '#F97316',
  'Obesidad clase II': '#DC2626',
  'Obesidad clase III': '#7F1D1D',
  // Presión arterial
  Óptima: '#10B981',
  Alta: '#F59E0B',
  'Hipertensión grado 1': '#F97316',
  'Hipertensión grado 2': '#DC2626',
  'Hipertensión grado 3': '#7F1D1D',
  // Circunferencia de cintura
  'Bajo riesgo': '#10B981',
  'Riesgo aumentado': '#F59E0B',
  'Alto riesgo': '#DC2626',
};

/** Color de una categoría con escala; las de audiometría por su grado. Sin escala, el gris del tablero. */
export function colorDeCategoria(etiqueta: string, porDefecto: string = COLOR_DE_TONO.neutro): string {
  if (COLOR_DE_CATEGORIA[etiqueta]) return COLOR_DE_CATEGORIA[etiqueta];
  const texto = etiqueta.toLowerCase();
  if (/^normal/.test(texto)) return '#10B981';
  if (/profunda/.test(texto)) return '#7C2D12';
  if (/moderada.{0,3}severa/.test(texto)) return '#DC2626';
  if (/severa/.test(texto)) return '#991B1B';
  if (/moderada/.test(texto)) return '#F97316';
  if (/leve/.test(texto)) return '#F59E0B';
  return porDefecto;
}

type FilaDeTabla = (string | number)[];

/**
 * Barras a partir de las filas de una tabla del informe ([concepto, cantidad, «35 %»?]),
 * con el mismo porcentaje que la tabla. Sin filas con casos, ninguna.
 */
export function barrasDeTabla(
  titulo: string,
  filas: FilaDeTabla[] | undefined,
  opciones: { titular?: string; nota?: string; color?: string; total?: number } = {},
): GraficaDeInforme | null {
  const conCasos = (filas ?? []).filter((fila) => typeof fila[1] === 'number' && fila[1] > 0);
  if (!conCasos.length) return null;
  const total = opciones.total ?? conCasos.reduce((suma, fila) => suma + (fila[1] as number), 0);
  return {
    tipo: 'barras',
    titulo,
    ...(opciones.titular ? { titular: opciones.titular } : {}),
    ...(opciones.nota ? { nota: opciones.nota } : {}),
    filas: conCasos.slice(0, FILAS_POR_GRAFICA).map((fila) => {
      const porcentaje = typeof fila[2] === 'string' ? Number(fila[2].replace(/[^\d.]/g, '')) : NaN;
      return {
        etiqueta: String(fila[0]),
        cantidad: fila[1] as number,
        total,
        ...(Number.isFinite(porcentaje) && typeof fila[2] === 'string' && fila[2].trim() ? { porcentaje } : {}),
        color: colorDeCategoria(String(fila[0]), opciones.color),
      };
    }),
  };
}

/** Dona de dos o más partes; null si no suma nada. */
export function donaDe(
  titulo: string,
  segmentos: Segmento[],
  opciones: { titular?: string; nota?: string } = {},
): GraficaDeInforme | null {
  const grafica = dona(titulo, segmentos, opciones.nota);
  return grafica && opciones.titular ? { ...grafica, titular: opciones.titular } : grafica;
}

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

/** «Vigilancia según la exposición»: cada barra, sobre los expuestos a ese factor (como en el tablero). */
export const graficaDeVigilancia = (filas: FilaDeCobertura[]): GraficaDeInforme | null =>
  filas.length
    ? {
        tipo: 'barras',
        titulo: 'Expuestos con el estudio que les corresponde',
        filas: filas.map((fila) => ({
          // Espacio que no se parte: «(de 40)» nunca queda en dos líneas
          etiqueta: `${fila.etiqueta} (de\u00a0${fila.total})`,
          cantidad: fila.cantidad,
          total: fila.total,
          color: COLOR_DE_TONO.neutro,
        })),
        nota: 'Cada porcentaje se calcula sobre los trabajadores expuestos a ese factor.',
      }
    : null;

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
          formatter: (valor: number, contexto: any) => {
            const fila = filas[contexto.dataIndex];
            return `${valor} (${fila.porcentaje ?? pct(valor, fila.total)} %)`;
          },
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

// ---- Contenido para pdfmake

type Contenido = Record<string, any>;

/**
 * Dibuja una configuración de Chart.js medida en puntos del PDF y devuelve la imagen.
 * Sin ella (pruebas, o si el navegador no puede dibujar), las secciones van solo con tablas.
 */
export type DibujarGrafica = (config: Record<string, any>, anchoPt: number, altoPt: number) => string | undefined;

const pctTexto = (parte: number, total: number) => `${total > 0 ? Math.round((parte / total) * 100) : 0} %`;

/** Leyenda: una fila por color, en una tabla sin bordes (el cuadro es una celda con relleno). */
const leyendaDeColores = (filas: { color: string; texto: Contenido['text'] }[], fontSize: number): Contenido => ({
  table: {
    widths: [7, '*'],
    body: filas.map((fila) => [
      { text: '', fillColor: fila.color, margin: [0, 1, 0, 1] },
      { text: fila.texto, fontSize, margin: [4, 0, 0, 0] },
    ]),
  },
  layout: {
    hLineWidth: () => 0,
    vLineWidth: () => 0,
    paddingLeft: () => 0,
    paddingRight: () => 0,
    paddingTop: () => 2,
    paddingBottom: () => 2,
  },
});

/**
 * Cada gráfica con su título, como en la pantalla; la dona, con su leyenda a un lado.
 * Con titular, la conclusión va primero en grande y el tema debajo, en gris.
 */
export function contenidoDeGraficas(graficas: GraficaDeInforme[], dibujar?: DibujarGrafica): Contenido[] {
  if (!dibujar) return [];
  return graficas.flatMap((grafica): Contenido[] => {
    const [ancho, alto] = medidasDe(grafica);
    let imagen: string | undefined;
    try {
      imagen = dibujar(configDeGrafica(grafica), ancho, alto);
    } catch (error) {
      console.error(`No se pudo dibujar la gráfica «${grafica.titulo}»:`, error);
    }
    if (!imagen) return [];
    const titulo = grafica.titular
      ? {
          stack: [
            { text: grafica.titular, fontSize: 12, bold: true, color: '#111827' },
            { text: grafica.titulo, fontSize: 8.5, color: '#6b7280', margin: [0, 1, 0, 0] },
          ],
          margin: [0, 16, 0, 6],
        }
      : { text: grafica.titulo, style: 'subtituloTabla', margin: [0, 15, 0, 6] };
    const nota = grafica.nota
      ? [{ text: grafica.nota, fontSize: 8, italics: true, color: '#6b7280', margin: [0, 4, 0, 0] }]
      : [];

    if (grafica.tipo === 'dona') {
      const leyenda = leyendaDeColores(
        grafica.segmentos.map((segmento) => ({
          color: segmento.color,
          texto: [
            `${segmento.etiqueta}: `,
            { text: `${segmento.cantidad} (${pctTexto(segmento.cantidad, grafica.total)})`, bold: true },
          ],
        })),
        9.5,
      );
      const filasDeLeyenda = grafica.segmentos.length;
      return [
        {
          unbreakable: true,
          stack: [
            titulo,
            {
              columns: [
                { width: ancho, image: imagen, fit: [ancho, alto] },
                {
                  width: '*',
                  stack: [
                    leyenda,
                    { text: `Total: ${grafica.total}`, fontSize: 9, color: '#6b7280', margin: [0, 2, 0, 0] },
                    ...nota,
                  ],
                  // Centrada a la altura de la dona
                  margin: [18, Math.max(0, alto / 2 - (filasDeLeyenda * 16 + 14) / 2), 0, 0],
                },
              ],
            },
          ],
        },
      ];
    }

    const series =
      grafica.tipo === 'columnas'
        ? [
            {
              columns: [
                { width: '*', text: '' },
                ...grafica.series.map((serie) => ({
                  width: 'auto',
                  ...leyendaDeColores([{ color: serie.color, texto: serie.etiqueta }], 8.5),
                })),
                { width: '*', text: '' },
              ],
              columnGap: 14,
              margin: [0, 4, 0, 0],
            },
          ]
        : [];
    return [
      { unbreakable: true, stack: [titulo, { image: imagen, width: ancho, alignment: 'center' }, ...series, ...nota] },
    ];
  });
}
