import { AUDIOMETRIA_FRECUENCIAS, buildAudiometriaChartOptions } from '@/helpers/audiometriaChartConfig';
import { umbralOido, type OidoIla } from '@/helpers/informeLongitudinalAudiometrico';
import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';

const COLOR_BASAL = '#111827';
const COLOR_RECIENTE_OD = '#DC2626';
const COLOR_RECIENTE_OI = '#2563EB';
const COLOR_INTERMEDIA = 'rgba(107, 114, 128, 0.45)';

function toYyyyMmDd(v?: string | Date | null): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  try {
    return new Date(v).toISOString().slice(0, 10);
  } catch {
    return String(v);
  }
}

function serieUmbrales(
  estudio: AudiometriaConcentradaLongitudinal,
  oido: OidoIla,
): (number | null)[] {
  return AUDIOMETRIA_FRECUENCIAS.map((freq) => umbralOido(estudio, oido, freq));
}

export function buildAudiogramaLongitudinalChartData(
  oido: OidoIla,
  basal?: AudiometriaConcentradaLongitudinal | null,
  subsecuentes: AudiometriaConcentradaLongitudinal[] = [],
) {
  const datasets: Record<string, unknown>[] = [];
  const ordenados = [...subsecuentes].sort((a, b) =>
    toYyyyMmDd(a.fechaAudiometria).localeCompare(toYyyyMmDd(b.fechaAudiometria)),
  );
  const reciente = ordenados.length ? ordenados[ordenados.length - 1] : null;
  const intermedias = ordenados.slice(0, -1);
  const colorReciente = oido === 'Derecho' ? COLOR_RECIENTE_OD : COLOR_RECIENTE_OI;

  for (const est of intermedias) {
    datasets.push({
      label: toYyyyMmDd(est.fechaAudiometria) || 'Intermedia',
      data: serieUmbrales(est, oido),
      borderColor: COLOR_INTERMEDIA,
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      pointRadius: 3,
      pointHoverRadius: 5,
      tension: 0,
      spanGaps: false,
      pointBackgroundColor: COLOR_INTERMEDIA,
      pointBorderColor: COLOR_INTERMEDIA,
    });
  }

  if (basal) {
    datasets.push({
      label: `Basal ${toYyyyMmDd(basal.fechaAudiometria)}`.trim(),
      data: serieUmbrales(basal, oido),
      borderColor: COLOR_BASAL,
      backgroundColor: 'transparent',
      borderWidth: 3,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0,
      spanGaps: false,
      pointBackgroundColor: COLOR_BASAL,
      pointBorderColor: COLOR_BASAL,
    });
  }

  if (reciente) {
    datasets.push({
      label: `Reciente ${toYyyyMmDd(reciente.fechaAudiometria)}`.trim(),
      data: serieUmbrales(reciente, oido),
      borderColor: colorReciente,
      backgroundColor: 'transparent',
      borderWidth: 2.5,
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0,
      spanGaps: false,
      pointBackgroundColor: colorReciente,
      pointBorderColor: colorReciente,
    });
  }

  return {
    labels: AUDIOMETRIA_FRECUENCIAS.map((f) => `${f} Hz`),
    datasets,
  };
}

export function buildAudiogramaLongitudinalChartConfig(
  oido: OidoIla,
  basal?: AudiometriaConcentradaLongitudinal | null,
  subsecuentes: AudiometriaConcentradaLongitudinal[] = [],
  options: { isDark?: boolean } = {},
) {
  const baseOptions = buildAudiometriaChartOptions(options);
  return {
    type: 'line' as const,
    data: buildAudiogramaLongitudinalChartData(oido, basal, subsecuentes),
    options: {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins.tooltip,
          callbacks: {
            title: (context: { label: string }[]) => `Frecuencia: ${context[0]?.label || ''}`,
            label: (context: { dataset: { label?: string }; raw: number | null }) => {
              const valor = context.raw;
              const serie = context.dataset.label || 'Estudio';
              return `${serie}: ${valor !== null && valor !== undefined ? `${valor} dB` : 'Sin medición'}`;
            },
          },
        },
      },
    },
  };
}
