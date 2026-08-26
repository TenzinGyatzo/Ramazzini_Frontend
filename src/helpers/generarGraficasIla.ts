import { exportarGraficaAltaResolucion } from '@/helpers/exportChartImage';
import { buildAudiogramaLongitudinalChartConfig } from '@/helpers/graficaAudiogramaLongitudinal';
import type { AudiometriaConcentradaLongitudinal } from '@/interfaces/documentos.inteface';

export type GraficasIlaResult = {
  graficaAudiogramaOidoDerecho: string;
  graficaAudiogramaOidoIzquierdo: string;
};

export function generarGraficasIla(
  basal?: AudiometriaConcentradaLongitudinal | null,
  subsecuentes: AudiometriaConcentradaLongitudinal[] = [],
): GraficasIlaResult {
  const empty = { graficaAudiogramaOidoDerecho: '', graficaAudiogramaOidoIzquierdo: '' };
  if (!basal && !subsecuentes.length) return empty;
  try {
    return {
      graficaAudiogramaOidoDerecho: exportarGraficaAltaResolucion(
        buildAudiogramaLongitudinalChartConfig('Derecho', basal, subsecuentes),
        1100,
        420,
      ),
      graficaAudiogramaOidoIzquierdo: exportarGraficaAltaResolucion(
        buildAudiogramaLongitudinalChartConfig('Izquierdo', basal, subsecuentes),
        1100,
        420,
      ),
    };
  } catch (err) {
    console.warn('No se pudieron generar las gráficas del informe audiométrico', err);
    return empty;
  }
}
