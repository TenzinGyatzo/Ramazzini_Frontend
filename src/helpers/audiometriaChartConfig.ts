export type DatosAudiometriaLike = {
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

export const AUDIOMETRIA_FRECUENCIAS = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];

function toDb(valor: unknown): number | null {
  return valor !== null && valor !== undefined ? Number(valor) : null;
}

export function buildAudiometriaChartData(datosAudiometria: DatosAudiometriaLike) {
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

  return {
    labels: AUDIOMETRIA_FRECUENCIAS.map((f) => `${f} Hz`),
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
  };
}

export function buildAudiometriaChartOptions(options: { isDark?: boolean } = {}) {
  const isDark = options.isDark ?? false;
  const textColor = isDark ? '#e2e8f0' : '#374151';
  const borderColor = isDark ? '#94a3b8' : '#374151';
  const gridColor = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(0, 0, 0, 0.2)';

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: textColor,
          usePointStyle: true,
          padding: 10,
          pointStyleWidth: 17,
          font: {
            size: 12,
            weight: '500' as const,
          },
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(0, 0, 0, 0.7)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: isDark ? '#64748b' : '#374151',
        borderWidth: 1,
        callbacks: {
          title: (context: { label: string }[]) => {
            return `Frecuencia: ${context[0].label}`;
          },
          label: (context: { dataset: { label: string }; raw: number | null }) => {
            const valor = context.raw;
            return `${context.dataset.label}: ${valor !== null ? valor + ' dB' : 'Sin medición'}`;
          },
        },
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
          font: {
            size: 12,
            weight: '600' as const,
          },
          color: textColor,
        },
        grid: {
          display: true,
          color: gridColor,
          drawTicks: false,
          lineWidth: 1,
        },
        border: {
          display: true,
          color: borderColor,
          width: 1.2,
        },
        ticks: {
          color: textColor,
          font: {
            size: 11,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: 'Umbral Auditivo (dB)',
          font: {
            size: 12,
            weight: '600' as const,
          },
          color: textColor,
        },
        min: -10,
        max: 110,
        stepSize: 10,
        offset: true,
        grid: {
          display: true,
          color: gridColor,
          lineWidth: 1,
        },
        border: {
          display: true,
          color: borderColor,
          width: 1.2,
        },
        ticks: {
          color: textColor,
          font: {
            size: 11,
          },
          stepSize: 10,
          maxTicksLimit: 13,
          count: 13,
          includeBounds: true,
          autoSkip: false,
          suggestedMin: -10,
          suggestedMax: 110,
          callback: function (value: number | string) {
            return value + ' dB';
          },
        },
        reverse: true,
      },
    },
    elements: {
      line: {
        borderWidth: 2,
      },
      point: {
        borderWidth: 2,
      },
    },
  };
}

export function buildAudiometriaChartConfig(
  datosAudiometria: DatosAudiometriaLike,
  options: { isDark?: boolean } = {},
) {
  return {
    type: 'line' as const,
    data: buildAudiometriaChartData(datosAudiometria),
    options: buildAudiometriaChartOptions(options),
  };
}
