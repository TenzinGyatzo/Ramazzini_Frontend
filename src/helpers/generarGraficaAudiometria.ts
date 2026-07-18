import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';

type DatosAudiometriaLike = {
  oidoDerecho125?: number | null;
  oidoDerecho250?: number | null;
  oidoDerecho500?: number | null;
  oidoDerecho1000?: number | null;
  oidoDerecho2000?: number | null;
  oidoDerecho3000?: number | null;
  oidoDerecho4000?: number | null;
  oidoDerecho6000?: number | null;
  oidoDerecho8000?: number | null;
  oidoIzquierdo125?: number | null;
  oidoIzquierdo250?: number | null;
  oidoIzquierdo500?: number | null;
  oidoIzquierdo1000?: number | null;
  oidoIzquierdo2000?: number | null;
  oidoIzquierdo3000?: number | null;
  oidoIzquierdo4000?: number | null;
  oidoIzquierdo6000?: number | null;
  oidoIzquierdo8000?: number | null;
};

function toDb(valor: unknown): number | null {
  return valor !== null && valor !== undefined ? Number(valor) : null;
}

/** Genera el audiograma PNG (data URL) desde umbrales persistidos. No depende del canvas del wizard. */
export function generarGraficaAudiometria(datosAudiometria: DatosAudiometriaLike): string {
  const frecuencias = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

  const oidoDerecho = [
    datosAudiometria.oidoDerecho125,
    datosAudiometria.oidoDerecho250,
    datosAudiometria.oidoDerecho500,
    datosAudiometria.oidoDerecho1000,
    datosAudiometria.oidoDerecho2000,
    datosAudiometria.oidoDerecho3000,
    datosAudiometria.oidoDerecho4000,
    datosAudiometria.oidoDerecho6000,
    datosAudiometria.oidoDerecho8000,
  ].map(toDb);

  const oidoIzquierdo = [
    datosAudiometria.oidoIzquierdo125,
    datosAudiometria.oidoIzquierdo250,
    datosAudiometria.oidoIzquierdo500,
    datosAudiometria.oidoIzquierdo1000,
    datosAudiometria.oidoIzquierdo2000,
    datosAudiometria.oidoIzquierdo3000,
    datosAudiometria.oidoIzquierdo4000,
    datosAudiometria.oidoIzquierdo6000,
    datosAudiometria.oidoIzquierdo8000,
  ].map(toDb);

  const chartConfig = {
    type: 'line',
    data: {
      labels: frecuencias.map((f) => `${f} Hz`),
      datasets: [
        {
          label: 'Oído Derecho',
          data: oidoDerecho,
          borderColor: 'rgba(239, 68, 68, 0.8)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0,
          pointBackgroundColor: 'transparent',
          pointBorderColor: 'rgba(239, 68, 68, 0.8)',
          pointBorderWidth: 1.5,
          pointRadius: 6,
          pointHoverRadius: 8,
          spanGaps: false,
        },
        {
          label: 'Oído Izquierdo',
          data: oidoIzquierdo,
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0,
          pointBackgroundColor: '#3B82F6',
          pointBorderColor: '#3B82F6',
          pointBorderWidth: 1.5,
          pointStyle: 'crossRot',
          pointRadius: 8,
          pointHoverRadius: 10,
          spanGaps: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index',
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 10,
            pointStyleWidth: 17,
            font: {
              size: 12,
              weight: '500',
            },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          borderColor: '#374151',
          borderWidth: 1,
        },
        datalabels: {
          display: false,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Frecuencia (Hz)',
            font: { size: 12, weight: '600' },
            color: '#374151',
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.2)',
            drawTicks: false,
            lineWidth: 1,
          },
          border: {
            display: true,
            color: '#374151',
            width: 1.2,
          },
          ticks: {
            color: '#374151',
            font: { size: 11, weight: '500' },
            padding: 6,
          },
        },
        y: {
          title: {
            display: true,
            text: 'Umbral Auditivo (dB)',
            font: { size: 12, weight: '600' },
            color: '#374151',
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.2)',
            drawTicks: false,
            lineWidth: 1,
          },
          border: {
            display: true,
            color: '#374151',
            width: 1.2,
          },
          ticks: {
            color: '#374151',
            font: { size: 11, weight: '500' },
            padding: 6,
            stepSize: 10,
          },
          min: -10,
          max: 120,
        },
      },
      elements: {
        point: {
          radius: 6,
          hoverRadius: 8,
        },
        line: {
          borderWidth: 2,
        },
      },
    },
  };

  return exportarGraficaAltaResolucion(chartConfig, 1140, 380);
}
