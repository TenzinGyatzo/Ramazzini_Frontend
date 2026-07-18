import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';
import {
  buildEvolucionGlucemicaSeries,
  boundsEjeGlucosa,
  boundsEjeHbA1c,
} from '@/helpers/graficaEvolucionGlucemica';
import {
  buildEvolucionPresionArterialSeries,
  boundsEjePresionArterialMmHg,
} from '@/helpers/graficaEvolucionPresionArterial';
import {
  buildEvolucionPesoImcSeries,
  boundsEjePesoKg,
  boundsEjeImc,
} from '@/helpers/graficaEvolucionPesoImc';
import {
  buildEvolucionPerfilLipidicoSeries,
  boundsEjePerfilLipidicoMgDl,
} from '@/helpers/graficaEvolucionPerfilLipidico';

const REF_SLATE_STRONG = 'rgba(100, 116, 139, 0.75)';
const REF_SLATE_SOFT = 'rgba(148, 163, 184, 0.7)';
const TICK = '#374151';
const GRID = 'rgba(0, 0, 0, 0.12)';
const BORDER = '#64748b';

export type GraficasIlcResult = {
  graficaEvolucionGlucemica: string;
  graficaEvolucionPresionArterial: string;
  graficaEvolucionPesoImc: string;
  graficaEvolucionPerfilLipidico: string;
};

function baseLineOptions(extraScales: Record<string, unknown> = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: TICK,
          usePointStyle: true,
          padding: 8,
          pointStyleWidth: 12,
          font: { size: 11, weight: '500' },
        },
      },
      tooltip: { enabled: false },
      datalabels: { display: false },
    },
    scales: {
      x: {
        title: { display: false },
        grid: { display: true, color: GRID, lineWidth: 1 },
        border: { display: true, color: BORDER, width: 1 },
        ticks: {
          color: TICK,
          font: { size: 10 },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
        },
      },
      ...extraScales,
    },
    elements: {
      line: { borderWidth: 2 },
      point: { borderWidth: 2 },
    },
  };
}

function exportOrEmpty(sufficient: boolean, chartConfig: unknown): string {
  if (!sufficient) return '';
  try {
    return exportarGraficaAltaResolucion(chartConfig, 900, 320);
  } catch (error) {
    console.error('Error al exportar gráfica ILC:', error);
    return '';
  }
}

/**
 * Regenera las 4 gráficas ILC desde eventosConcentrados (offscreen).
 * No depende del visualizador montado ni del tema dark.
 */
export function generarGraficasIlc(eventosConcentrados: unknown[] | undefined | null): GraficasIlcResult {
  const eventos = (eventosConcentrados || []) as any[];

  // Glucemia
  const gSeries = buildEvolucionGlucemicaSeries(eventos);
  let graficaEvolucionGlucemica = '';
  if (gSeries.sufficientData) {
    const len = gSeries.labels.length;
    const fill = (v: number) => Array(len).fill(v);
    const gBounds = boundsEjeGlucosa(gSeries.glucosa);
    const hBounds = boundsEjeHbA1c(gSeries.hba1c);
    graficaEvolucionGlucemica = exportOrEmpty(true, {
      type: 'line',
      data: {
        labels: gSeries.labels,
        datasets: [
          {
            label: 'Glucosa',
            data: [...gSeries.glucosa],
            yAxisID: 'y',
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(37, 99, 235, 0.9)',
            backgroundColor: 'rgba(191, 219, 254, 0.15)',
            pointBackgroundColor: '#2563eb',
            pointBorderColor: '#1e40af',
            pointRadius: 4,
          },
          {
            label: 'HbA1c',
            data: [...gSeries.hba1c],
            yAxisID: 'y1',
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(234, 88, 12, 0.9)',
            backgroundColor: 'rgba(254, 215, 170, 0.15)',
            pointBackgroundColor: '#ea580c',
            pointBorderColor: '#c2410c',
            pointRadius: 4,
          },
          {
            label: 'Ref. 100',
            data: fill(100),
            yAxisID: 'y',
            borderColor: REF_SLATE_STRONG,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Ref. 126',
            data: fill(126),
            yAxisID: 'y',
            borderColor: REF_SLATE_SOFT,
            borderDash: [3, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: baseLineOptions({
        y: {
          type: 'linear',
          position: 'left',
          min: gBounds.min,
          max: gBounds.max,
          title: { display: true, text: 'Glucosa (mg/dL)', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: true, color: GRID, lineWidth: 1 },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
        y1: {
          type: 'linear',
          position: 'right',
          min: hBounds.min,
          max: hBounds.max,
          title: { display: true, text: 'HbA1c (%)', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: false, drawOnChartArea: false },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
      }),
    });
  }

  // Presión arterial
  const pSeries = buildEvolucionPresionArterialSeries(eventos);
  let graficaEvolucionPresionArterial = '';
  if (pSeries.sufficientData) {
    const len = pSeries.labels.length;
    const fill = (v: number) => Array(len).fill(v);
    const yBounds = boundsEjePresionArterialMmHg(pSeries.sistolica, pSeries.diastolica);
    graficaEvolucionPresionArterial = exportOrEmpty(true, {
      type: 'line',
      data: {
        labels: pSeries.labels,
        datasets: [
          {
            label: 'Sistólica',
            data: [...pSeries.sistolica],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(220, 38, 38, 0.92)',
            pointBackgroundColor: '#dc2626',
            pointRadius: 4,
          },
          {
            label: 'Diastólica',
            data: [...pSeries.diastolica],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(79, 70, 229, 0.92)',
            pointBackgroundColor: '#4f46e5',
            pointRadius: 4,
          },
          {
            label: 'Ref. 140 mmHg',
            data: fill(140),
            borderColor: REF_SLATE_STRONG,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Ref. 90 mmHg',
            data: fill(90),
            borderColor: REF_SLATE_SOFT,
            borderDash: [3, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: baseLineOptions({
        y: {
          type: 'linear',
          position: 'left',
          min: yBounds.min,
          max: yBounds.max,
          title: { display: true, text: 'Presión (mmHg)', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: true, color: GRID, lineWidth: 1 },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
      }),
    });
  }

  // Peso / IMC
  const wSeries = buildEvolucionPesoImcSeries(eventos);
  let graficaEvolucionPesoImc = '';
  if (wSeries.sufficientData) {
    const len = wSeries.labels.length;
    const fill = (v: number) => Array(len).fill(v);
    const pBounds = boundsEjePesoKg(wSeries.peso);
    const iBounds = boundsEjeImc(wSeries.imc);
    graficaEvolucionPesoImc = exportOrEmpty(true, {
      type: 'line',
      data: {
        labels: wSeries.labels,
        datasets: [
          {
            label: 'Peso',
            data: [...wSeries.peso],
            yAxisID: 'y',
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(13, 148, 136, 0.88)',
            pointBackgroundColor: '#0d9488',
            pointRadius: 4,
          },
          {
            label: 'IMC',
            data: [...wSeries.imc],
            yAxisID: 'y1',
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(124, 58, 237, 0.82)',
            pointBackgroundColor: '#7c3aed',
            pointRadius: 4,
          },
          {
            label: 'Ref. IMC 30 (Ob. I)',
            data: fill(30),
            yAxisID: 'y1',
            borderColor: REF_SLATE_STRONG,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Ref. IMC 35 (Ob. II)',
            data: fill(35),
            yAxisID: 'y1',
            borderColor: REF_SLATE_SOFT,
            borderDash: [3, 4],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
          {
            label: 'Ref. IMC 40 (Ob. III)',
            data: fill(40),
            yAxisID: 'y1',
            borderColor: REF_SLATE_STRONG,
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: baseLineOptions({
        y: {
          type: 'linear',
          position: 'left',
          min: pBounds.min,
          max: pBounds.max,
          title: { display: true, text: 'Peso (kg)', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: true, color: GRID, lineWidth: 1 },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
        y1: {
          type: 'linear',
          position: 'right',
          min: iBounds.min,
          max: iBounds.max,
          title: { display: true, text: 'IMC', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: false, drawOnChartArea: false },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
      }),
    });
  }

  // Perfil lipídico
  const lSeries = buildEvolucionPerfilLipidicoSeries(eventos);
  let graficaEvolucionPerfilLipidico = '';
  if (lSeries.sufficientData) {
    const yBounds = boundsEjePerfilLipidicoMgDl(
      lSeries.colesterolTotal,
      lSeries.ldl,
      lSeries.hdl,
      lSeries.trigliceridos,
    );
    graficaEvolucionPerfilLipidico = exportOrEmpty(true, {
      type: 'line',
      data: {
        labels: lSeries.labels,
        datasets: [
          {
            label: 'Colesterol total',
            data: [...lSeries.colesterolTotal],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(15, 118, 110, 0.9)',
            pointBackgroundColor: '#0f766e',
            pointRadius: 4,
          },
          {
            label: 'LDL',
            data: [...lSeries.ldl],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(185, 28, 28, 0.9)',
            pointBackgroundColor: '#b91c1c',
            pointRadius: 4,
          },
          {
            label: 'HDL',
            data: [...lSeries.hdl],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(37, 99, 235, 0.9)',
            pointBackgroundColor: '#2563eb',
            pointRadius: 4,
          },
          {
            label: 'Triglicéridos',
            data: [...lSeries.trigliceridos],
            spanGaps: false,
            tension: 0.25,
            borderColor: 'rgba(217, 119, 6, 0.9)',
            pointBackgroundColor: '#d97706',
            pointRadius: 4,
          },
        ],
      },
      options: baseLineOptions({
        y: {
          type: 'linear',
          position: 'left',
          min: yBounds.min,
          max: yBounds.max,
          title: { display: true, text: 'mg/dL', font: { size: 11, weight: '600' }, color: TICK },
          grid: { display: true, color: GRID, lineWidth: 1 },
          border: { display: true, color: BORDER, width: 1 },
          ticks: { color: TICK, font: { size: 10 } },
        },
      }),
    });
  }

  return {
    graficaEvolucionGlucemica,
    graficaEvolucionPresionArterial,
    graficaEvolucionPesoImc,
    graficaEvolucionPerfilLipidico,
  };
}
