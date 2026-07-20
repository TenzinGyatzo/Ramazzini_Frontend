import { buildAudiometriaChartConfig, type DatosAudiometriaLike } from '@/helpers/audiometriaChartConfig';
import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';

export type { DatosAudiometriaLike };

/** Genera el audiograma PNG (data URL) desde umbrales persistidos. No depende del canvas del wizard. */
export function generarGraficaAudiometria(datosAudiometria: DatosAudiometriaLike): string {
  const chartConfig = buildAudiometriaChartConfig(datosAudiometria, { isDark: false });
  return exportarGraficaAltaResolucion(chartConfig, 1140, 380);
}
